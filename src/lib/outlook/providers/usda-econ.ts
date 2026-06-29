import "server-only";

import {
  parseWasdeXml,
  type WasdeCropFigures,
  type WasdeMetric,
} from "../econ-wasde";
import type { Crop } from "@/lib/types/database";
import type { EconBundle, EconFrame, EconProvider } from "../econ-types";

const ESMIS_LATEST =
  "https://usda.library.cornell.edu/api/v1/release/findByIdentifier/wasde?latest=true";
const NASS_BASE = "https://quickstats.nass.usda.gov/api";

// Human-readable report landing pages for grounding links (the fetch URLs above
// are API/file endpoints that 401/403 in a browser — these resolve for a farmer).
const HUMAN_URL = {
  wasde: "https://usda.library.cornell.edu/concern/publications/3t945q76s",
  grain_stocks: "https://usda.library.cornell.edu/concern/publications/xg94hp534",
  acreage: "https://usda.library.cornell.edu/concern/publications/j098zb09z",
  prospective_plantings: "https://usda.library.cornell.edu/concern/publications/x633f100h",
} as const;
const TIMEOUT_MS = 25_000;
const CROPS: Crop[] = ["corn", "soybean"];
const NASS_COMMODITY: Record<Crop, string> = { corn: "CORN", soybean: "SOYBEANS" };

// surprise-not-level reminder attached to the figures the market reads as a surprise
const SURPRISE_NOTE =
  "Market impact depends on how this compared to trade expectations, which we don't track — read it as a change, not a level.";

/**
 * Supply-bucket provider (Phase A). Pulls the WASDE balance sheet from USDA's
 * machine-readable ESMIS feed, and Grain Stocks + Acreage from NASS Quick Stats.
 * Each figure is reference-framed AT INGESTION (Δ prior, Δ year, stocks-to-use,
 * expectation-unavailable). Fault-tolerant: every source runs independently;
 * a failure is logged and skipped, whatever succeeds is returned.
 */
export class UsdaEconProvider implements EconProvider {
  readonly name = "usda-econ";
  private readonly nassKey: string | undefined;

  constructor(nassKey = process.env.USDA_NASS_KEY) {
    this.nassKey = nassKey;
  }

  async getBundles(): Promise<EconBundle[]> {
    const tasks: Promise<EconBundle[]>[] = [
      this.wasde(),
      ...CROPS.map((c) => this.grainStocks(c)),
      ...CROPS.map((c) => this.acreage(c)),
    ];
    const settled = await Promise.allSettled(tasks);
    const out: EconBundle[] = [];
    settled.forEach((r, i) => {
      if (r.status === "rejected")
        console.warn(`[econ] source ${i} failed`, r.reason);
      else out.push(...r.value);
    });
    return out;
  }

  // ── WASDE (ESMIS) ──────────────────────────────────────────────────────────
  private async wasde(): Promise<EconBundle[]> {
    const meta = (await getJson(ESMIS_LATEST)) as {
      results?: { files?: string[]; release_datetime?: string }[];
    } | null;
    const release = meta?.results?.[0];
    const xmlUrl = release?.files?.find((f) => f.endsWith(".xml"));
    if (!xmlUrl) {
      console.warn("[econ] WASDE: no XML in latest release");
      return [];
    }
    const xml = await getText(xmlUrl);
    if (!xml) return [];

    const parsed = parseWasdeXml(xml);
    const releasedAt = release?.release_datetime ?? null;

    const bundles: EconBundle[] = [];
    for (const crop of CROPS) {
      const figs = parsed[crop];
      const frames = wasdeFrames(figs);
      if (frames.length === 0) continue;
      bundles.push({
        reportType: "wasde",
        crop,
        marketingYear: figs.endingStocks?.marketingYear ?? "",
        releasedAt,
        sourceUrl: HUMAN_URL.wasde,
        frames,
      });
    }
    return bundles;
  }

  // ── NASS Grain Stocks (quarterly) ──────────────────────────────────────────
  private async grainStocks(crop: Crop): Promise<EconBundle[]> {
    if (!this.nassKey) return [];
    const params =
      `commodity_desc=${NASS_COMMODITY[crop]}&statisticcat_desc=STOCKS` +
      `&agg_level_desc=NATIONAL&year__GE=${currentYear() - 1}&format=JSON`;
    const data = (await getJson(`${NASS_BASE}/api_GET/?key=${this.nassKey}&${params}`)) as {
      data?: NassRow[];
    } | null;
    const rows = (data?.data ?? []).filter(
      (r) =>
        r.short_desc === `${NASS_COMMODITY[crop] === "CORN" ? "CORN, GRAIN" : "SOYBEANS"} - STOCKS, MEASURED IN BU`,
    );
    if (rows.length === 0) return [];

    // latest reading by load_time
    const sorted = [...rows].sort((a, b) =>
      String(b.load_time).localeCompare(String(a.load_time)),
    );
    const latest = sorted[0];
    const latestVal = num(latest.Value);
    if (latestVal == null) return [];
    // same quarter, prior year
    const priorYr = rows.find(
      (r) =>
        r.reference_period_desc === latest.reference_period_desc &&
        Number(r.year) === Number(latest.year) - 1,
    );
    const pyVal = num(priorYr?.Value);
    const quarter = (latest.reference_period_desc ?? "").replace(/^FIRST OF /i, "");

    const frame: EconFrame = {
      metric: "Grain Stocks (all positions)",
      value: round(latestVal / 1e6, 0), // → mil bu
      unit: "mil bu",
      deltaPrior: null,
      priorLabel: null,
      priorValue: null,
      deltaYear: pyVal != null ? round((latestVal - pyVal) / 1e6, 0) : null,
      priorYearLabel: pyVal != null ? `${quarter} ${Number(latest.year) - 1}` : null,
      priorYearValue: pyVal != null ? round(pyVal / 1e6, 0) : null,
      stocksToUse: null,
      note: `As of ${quarter} ${latest.year}. Quarterly Grain Stocks surprises are notorious market-movers. ${SURPRISE_NOTE}`,
      expectationAvailable: false,
    };

    return [
      {
        reportType: "grain_stocks",
        crop,
        marketingYear: String(latest.year),
        releasedAt: loadTimeIso(latest.load_time),
        sourceUrl: HUMAN_URL.grain_stocks,
        frames: [frame],
      },
    ];
  }

  // ── NASS Acreage / Prospective Plantings ───────────────────────────────────
  private async acreage(crop: Crop): Promise<EconBundle[]> {
    if (!this.nassKey) return [];
    const params =
      `commodity_desc=${NASS_COMMODITY[crop]}&statisticcat_desc=AREA PLANTED` +
      `&agg_level_desc=NATIONAL&year__GE=${currentYear() - 1}&format=JSON`;
    const data = (await getJson(
      `${NASS_BASE}/api_GET/?key=${this.nassKey}&${encodeURI(params)}`,
    )) as { data?: NassRow[] } | null;
    const rows = (data?.data ?? []).filter(
      (r) => r.short_desc === `${NASS_COMMODITY[crop]} - ACRES PLANTED`,
    );
    if (rows.length === 0) return [];

    const cy = currentYear();
    const rowOf = (yr: number, ref: RegExp | null) =>
      rows.find(
        (r) =>
          Number(r.year) === yr &&
          (ref ? ref.test(r.reference_period_desc ?? "") : true),
      );
    const pick = (yr: number, ref: RegExp | null) => num(rowOf(yr, ref)?.Value);

    const june = pick(cy, /JUN ACREAGE/i);
    const march = pick(cy, /MAR ACREAGE/i);
    const headline = pick(cy, /^YEAR$/i) ?? june ?? march;
    const current = june ?? headline ?? march;
    if (current == null) return [];
    const currentRow =
      rowOf(cy, /JUN ACREAGE/i) ?? rowOf(cy, /^YEAR$/i) ?? rowOf(cy, /MAR ACREAGE/i);
    const priorYearFinal = pick(cy - 1, /^YEAR$/i) ?? pick(cy - 1, /JUN ACREAGE/i);

    const isAcreage = june != null;
    const frame: EconFrame = {
      metric: "Acres Planted",
      value: round(current / 1e6, 3),
      unit: "mil ac",
      // June vs March intentions — "the change is the story"
      deltaPrior:
        june != null && march != null ? round((june - march) / 1e6, 3) : null,
      priorLabel: june != null && march != null ? "March intentions" : null,
      priorValue: june != null && march != null ? round(march / 1e6, 3) : null,
      deltaYear:
        priorYearFinal != null ? round((current - priorYearFinal) / 1e6, 3) : null,
      priorYearLabel: priorYearFinal != null ? String(cy - 1) : null,
      priorYearValue: priorYearFinal != null ? round(priorYearFinal / 1e6, 3) : null,
      stocksToUse: null,
      note: isAcreage
        ? "From the late-June Acreage report (actual planted acres)."
        : "March Prospective Plantings (intentions). The late-June Acreage report updates this — watch the change.",
      expectationAvailable: false,
    };

    return [
      {
        reportType: isAcreage ? "acreage" : "prospective_plantings",
        crop,
        marketingYear: String(cy),
        releasedAt: loadTimeIso(currentRow?.load_time),
        sourceUrl: isAcreage ? HUMAN_URL.acreage : HUMAN_URL.prospective_plantings,
        frames: [frame],
      },
    ];
  }
}

export const econProvider: EconProvider = new UsdaEconProvider();

// ── WASDE framing ────────────────────────────────────────────────────────────
function wasdeFrames(f: WasdeCropFigures): EconFrame[] {
  const frames: EconFrame[] = [];
  const mk = (
    metric: string,
    m: WasdeMetric | null,
    opts: { note?: string; stocksToUse?: number | null } = {},
  ): EconFrame | null => {
    if (!m || m.current == null) return null;
    const prec = m.unit === "$/bu" ? 2 : 0;
    return {
      metric,
      value: m.current.value,
      unit: m.unit,
      deltaPrior: m.prior ? round(m.current.value - m.prior.value, prec) : null,
      priorLabel: m.prior ? m.prior.month : null,
      priorValue: m.prior ? m.prior.value : null,
      deltaYear: m.priorYear ? round(m.current.value - m.priorYear.value, prec) : null,
      priorYearLabel: m.priorYear ? m.priorYear.marketingYear : null,
      priorYearValue: m.priorYear ? m.priorYear.value : null,
      stocksToUse: opts.stocksToUse ?? null,
      note: opts.note ?? null,
      expectationAvailable: false,
    };
  };

  const es = f.endingStocks;
  const ut = f.useTotal;
  const stu =
    es?.current && ut?.current && ut.current.value
      ? round((es.current.value / ut.current.value) * 100, 1)
      : null;

  const add = (fr: EconFrame | null) => fr && frames.push(fr);
  add(
    mk("Ending Stocks (carryout)", es, {
      stocksToUse: stu,
      note: `Stocks-to-use ${stu != null ? stu + "%" : "n/a"}. ${SURPRISE_NOTE}`,
    }),
  );
  add(
    mk("Production", f.production, {
      note: "Early-season USDA production rests on a weather-adjusted TREND yield assumption, not a measured yield.",
    }),
  );
  add(mk("Total Supply", f.supplyTotal));
  add(mk("Total Use", f.useTotal));
  add(mk("Season-Avg Farm Price", f.avgFarmPrice));
  return frames;
}

// ── helpers ──────────────────────────────────────────────────────────────────
type NassRow = {
  short_desc?: string;
  Value?: string;
  year?: string | number;
  reference_period_desc?: string;
  load_time?: string;
};

function currentYear(): number {
  return new Date().getUTCFullYear();
}
function num(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}
function round(n: number, p: number): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}
function loadTimeIso(s: string | undefined): string | null {
  if (!s) return null;
  const t = Date.parse(s.replace(" ", "T"));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

async function getJson(url: string): Promise<unknown | null> {
  const txt = await getText(url);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}
async function getText(url: string): Promise<string | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FurrowBot/1.0)" },
      cache: "no-store",
      signal: c.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
