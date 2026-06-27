import "server-only";

import { parseWasdeXml, type WasdeMetric } from "../econ-wasde";
import type { Crop } from "@/lib/types/database";
import type {
  DemandBundle,
  DemandFrame,
  DemandProvider,
} from "../demand-types";

const ESMIS_LATEST =
  "https://usda.library.cornell.edu/api/v1/release/findByIdentifier/wasde?latest=true";
const FAS_BASE = "https://api.fas.usda.gov/api/esr";
const EIA_BASE = "https://api.eia.gov/v2/petroleum/pnp/wprode/data";
const NASS_BASE = "https://quickstats.nass.usda.gov/api";
const TIMEOUT_MS = 25_000;
const CROPS: Crop[] = ["corn", "soybean"];

// unit conversions (grounded in standard USDA factors)
const BU_PER_MT: Record<Crop, number> = { corn: 39.368, soybean: 36.7437 };
const ETHANOL_GAL_PER_BU = 2.8; // net of distillers' co-products (approx)
const GAL_PER_BBL = 42;
const SOY_BU_PER_TON = 2000 / 60; // 60 lb/bu → 33.33 bu per short ton

const NOISE_NOTE =
  "A single weekly/monthly figure is noisy — weigh the pace-vs-target and the multi-week trend over any one print.";

/**
 * Demand-bucket provider (Phase B). Weekly Export Sales (+ China) from USDA FAS,
 * ethanol production from EIA, soybean crush from NASS — each reference-framed at
 * ingestion (pace-vs-target the headline frame). FAULT-TOLERANT: every source runs
 * independently; a dead/blocked source is logged and skipped, the rest still
 * return. (FAS ESR has periodic outages; EIA needs EIA_API_KEY.)
 */
export class UsdaDemandProvider implements DemandProvider {
  readonly name = "usda-demand";
  private readonly fasKey = process.env.USDA_FAS_KEY;
  private readonly eiaKey = process.env.EIA_API_KEY;
  private readonly nassKey = process.env.USDA_NASS_KEY;

  async getBundles(): Promise<DemandBundle[]> {
    const targets = await this.wasdeTargets();
    const tasks: Promise<DemandBundle[]>[] = [
      ...CROPS.map((c) => this.exportSales(c, targets)),
      this.ethanol(targets),
      this.crush(targets),
    ];
    const settled = await Promise.allSettled(tasks);
    const out: DemandBundle[] = [];
    settled.forEach((r) => {
      if (r.status === "rejected") console.warn("[demand] source failed", r.reason);
      else out.push(...r.value);
    });
    return out;
  }

  // ── WASDE targets (for pace-vs-target) ─────────────────────────────────────
  private async wasdeTargets(): Promise<WasdeTargets> {
    const empty: WasdeTargets = { corn: {}, soybean: {} };
    const meta = (await getJson(ESMIS_LATEST)) as {
      results?: { files?: string[] }[];
    } | null;
    const xmlUrl = meta?.results?.[0]?.files?.find((f) => f.endsWith(".xml"));
    if (!xmlUrl) return empty;
    const xml = await getText(xmlUrl);
    if (!xml) return empty;
    const p = parseWasdeXml(xml);
    // The current EXPORT/use marketing year (in progress) is the WASDE "Est."
    // year until the new crop year begins in September; use that as the target.
    const targetOf = (m: WasdeMetric | null) =>
      m ? (m.priorYear?.value ?? m.current?.value ?? null) : null;
    return {
      corn: { exports: targetOf(p.corn.exports), ethanol: targetOf(p.corn.ethanolUse) },
      soybean: { exports: targetOf(p.soybean.exports), crush: targetOf(p.soybean.crushUse) },
    };
  }

  // ── FAS Export Sales (weekly, + China) ─────────────────────────────────────
  private async exportSales(
    crop: Crop,
    targets: WasdeTargets,
  ): Promise<DemandBundle[]> {
    if (!this.fasKey) return [];
    // resolve commodity + China codes dynamically (avoids hardcoding)
    const commodities = (await this.fas("/commodities")) as
      | { commodityCode: number; commodityName: string }[]
      | null;
    const countries = (await this.fas("/countries")) as
      | { countryCode: number; countryName: string }[]
      | null;
    if (!commodities || !countries) return []; // FAS unreachable (e.g. 503) — skip

    const cc = commodities.find((c) =>
      crop === "corn"
        ? /^corn$/i.test(c.commodityName)
        : /^soybeans$/i.test(c.commodityName),
    )?.commodityCode;
    const china = countries.find((c) => /^china/i.test(c.countryName))?.countryCode;
    if (cc == null) return [];

    const my = exportMarketingYear();
    const all = (await this.fas(
      `/exports/commodityCode/${cc}/allCountries/marketYear/${my}`,
    )) as EsrRow[] | null;
    if (!all || all.length === 0) return [];
    const chinaSeries =
      china != null
        ? ((await this.fas(
            `/exports/commodityCode/${cc}/countryCode/${china}/marketYear/${my}`,
          )) as EsrRow[] | null)
        : null;

    const latest = all[all.length - 1];
    const prev = all.length > 1 ? all[all.length - 2] : null;
    const cumMT = num(latest.currentMYTotalCommitment);
    const weeklyMT = num(latest.weeklyExports ?? latest.currentMYNetSales);
    const chinaCum = chinaSeries?.length
      ? num(chinaSeries[chinaSeries.length - 1].currentMYTotalCommitment)
      : null;
    const pctChina =
      cumMT && chinaCum != null ? round((chinaCum / cumMT) * 100, 1) : null;

    // pace vs WASDE target
    const targetBu = targets[crop].exports; // mil bu
    const pace = paceVsTarget(cumMT, targetBu, crop);
    const week = (latest.weekEndingDate ?? "").slice(0, 10);

    const frames: DemandFrame[] = [
      {
        metric: "Cumulative export commitments",
        value: cumMT != null ? round(cumMT / 1e6, 2) : null,
        unit: "mil MT",
        deltaPrior: null,
        priorLabel: null,
        deltaYear: null,
        priorYearLabel: null,
        priorYearValue: null,
        pctChina,
        paceStatus: pace?.status ?? null,
        paceText: pace?.text ?? null,
        note: `MY ${my} to ${week}. ${NOISE_NOTE}`,
      },
      {
        metric: "Weekly net sales",
        value: weeklyMT != null ? round(weeklyMT / 1e3, 1) : null,
        unit: "k MT",
        deltaPrior:
          weeklyMT != null && prev
            ? round((weeklyMT - (num(prev.weeklyExports ?? prev.currentMYNetSales) ?? 0)) / 1e3, 1)
            : null,
        priorLabel: prev ? "prior week" : null,
        deltaYear: null,
        priorYearLabel: null,
        priorYearValue: null,
        pctChina,
        paceStatus: null,
        paceText: null,
        note: "One week of sales is noisy; the pace frame above is the signal.",
      },
    ];

    return [
      {
        dataType: "export_sales",
        crop,
        marketingYear: String(my),
        period: week ? `week ending ${week}` : null,
        releasedAt: week ? `${week}T00:00:00Z` : null,
        sourceUrl: "https://fas.usda.gov/data/commodities/corn", // public ESR landing
        frames,
      },
    ];
  }

  // ── EIA ethanol (corn demand) ──────────────────────────────────────────────
  private async ethanol(targets: WasdeTargets): Promise<DemandBundle[]> {
    if (!this.eiaKey) {
      console.warn("[demand] EIA_API_KEY not set — skipping ethanol");
      return [];
    }
    const url =
      `${EIA_BASE}/?api_key=${this.eiaKey}&frequency=weekly&data[0]=value` +
      `&facets[product][]=EPOOXE&facets[process][]=YOP&facets[duoarea][]=NUS` +
      `&sort[0][column]=period&sort[0][direction]=desc&length=60`;
    const data = (await getJson(url)) as {
      response?: { data?: { period: string; value: number | string }[] };
    } | null;
    const rows = data?.response?.data ?? [];
    if (rows.length === 0) return [];

    const latest = rows[0];
    const v = num(latest.value);
    if (v == null) return [];
    const prevWeek = num(rows[1]?.value);
    const yearAgo = num(rows.find((r) => weeksApart(r.period, latest.period) >= 51)?.value);

    // run-rate vs WASDE corn-for-ethanol target (mil bu)
    const annualBu =
      (v * 1000 * GAL_PER_BBL * 365) / ETHANOL_GAL_PER_BU / 1e6; // MBBL/D → mil bu/yr
    const pace = paceFromRunRate(annualBu, targets.corn.ethanol);

    const frame: DemandFrame = {
      metric: "Ethanol production",
      value: v,
      unit: "k bbl/day",
      deltaPrior: prevWeek != null ? round(v - prevWeek, 0) : null,
      priorLabel: prevWeek != null ? "prior week" : null,
      deltaYear: yearAgo != null ? round(v - yearAgo, 0) : null,
      priorYearLabel: yearAgo != null ? "~1yr ago" : null,
      priorYearValue: yearAgo,
      pctChina: null,
      paceStatus: pace?.status ?? null,
      paceText: pace?.text ?? null,
      note: `Implies ~${round(annualBu, 0)} mil bu/yr corn use at ~${ETHANOL_GAL_PER_BU} gal/bu (co-product-adjusted). ${NOISE_NOTE}`,
    };
    return [
      {
        dataType: "ethanol",
        crop: "corn",
        marketingYear: String(exportMarketingYear()),
        period: `week of ${latest.period}`,
        releasedAt: `${latest.period}T00:00:00Z`,
        sourceUrl:
          "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=W_EPOOXE_YOP_NUS_MBBLD",
        frames: [frame],
      },
    ];
  }

  // ── NASS soybean crush ─────────────────────────────────────────────────────
  private async crush(targets: WasdeTargets): Promise<DemandBundle[]> {
    if (!this.nassKey) return [];
    const params =
      `commodity_desc=SOYBEANS&statisticcat_desc=CRUSHED` +
      `&agg_level_desc=NATIONAL&year__GE=${new Date().getUTCFullYear() - 1}&format=JSON`;
    const data = (await getJson(
      `${NASS_BASE}/api_GET/?key=${this.nassKey}&${encodeURI(params)}`,
    )) as { data?: NassRow[] } | null;
    // monthly tons rows: reference_period_desc is a month abbrev (JAN…DEC); the
    // "YEAR" row is the annual total — keep the monthly ones.
    const monthly = (data?.data ?? []).filter(
      (r) =>
        r.short_desc === "SOYBEANS - CRUSHED, MEASURED IN TONS" &&
        MONTHS.includes((r.reference_period_desc ?? "").trim().toUpperCase()),
    );
    if (monthly.length === 0) return [];
    // most recent reference period wins (months can share a load_time)
    const monIdx = (r: NassRow) =>
      Number(r.year) * 12 +
      MONTHS.indexOf((r.reference_period_desc ?? "").trim().toUpperCase());
    const sorted = [...monthly].sort((a, b) => monIdx(b) - monIdx(a));
    const latest = sorted[0];
    const v = num(latest.Value);
    if (v == null) return [];
    const mon = (latest.reference_period_desc ?? "").trim().toUpperCase();
    const yr = Number(latest.year);
    const priorMonth = monthRow(monthly, prevMonth(mon), mon === "JAN" ? yr - 1 : yr);
    const yearAgo = monthRow(monthly, mon, yr - 1);

    // run-rate vs WASDE crush target (mil bu): tons → bu, annualize
    const annualBu = (v * 12 * SOY_BU_PER_TON) / 1e6;
    const pace = paceFromRunRate(annualBu, targets.soybean.crush);

    const frame: DemandFrame = {
      metric: "Soybean crush",
      value: round(v / 1e6, 2),
      unit: "mil tons",
      deltaPrior:
        priorMonth != null ? round((v - priorMonth) / 1e6, 2) : null,
      priorLabel: priorMonth != null ? prevMonth(mon) : null,
      deltaYear: yearAgo != null ? round((v - yearAgo) / 1e6, 2) : null,
      priorYearLabel: yearAgo != null ? `${mon} ${yr - 1}` : null,
      priorYearValue: yearAgo != null ? round(yearAgo / 1e6, 2) : null,
      pctChina: null,
      paceStatus: pace?.status ?? null,
      paceText: pace?.text ?? null,
      note: `${mon} ${yr}. Implies ~${round(annualBu, 0)} mil bu/yr at this run-rate. ${NOISE_NOTE}`,
    };
    return [
      {
        dataType: "crush",
        crop: "soybean",
        marketingYear: String(yr),
        period: `${mon} ${yr}`,
        releasedAt: loadTimeIso(latest.load_time),
        sourceUrl: `${NASS_BASE}/api_GET/?${encodeURI(params)}`,
        frames: [frame],
      },
    ];
  }

  private async fas(path: string): Promise<unknown | null> {
    return getJson(`${FAS_BASE}${path}`, { "X-Api-Key": this.fasKey ?? "" });
  }
}

export const demandProvider: DemandProvider = new UsdaDemandProvider();

// ── pace helpers ─────────────────────────────────────────────────────────────
type WasdeTargets = {
  corn: { exports?: number | null; ethanol?: number | null };
  soybean: { exports?: number | null; crush?: number | null };
};

function exportMarketingYear(): number {
  const d = new Date();
  return d.getUTCMonth() >= 8 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
}

/** Cumulative export commitments (MT) vs the WASDE target (mil bu), against the
 *  share of the Sep–Aug marketing year elapsed. */
function paceVsTarget(
  cumMT: number | null,
  targetBu: number | null | undefined,
  crop: Crop,
): { status: "ahead" | "behind" | "on track"; text: string } | null {
  if (cumMT == null || targetBu == null) return null;
  const targetMT = (targetBu * 1e6) / BU_PER_MT[crop];
  const pctOfTarget = (cumMT / targetMT) * 100;
  const pctElapsed = myElapsedPct();
  const gap = pctOfTarget - pctElapsed;
  const status = gap > 4 ? "ahead" : gap < -4 ? "behind" : "on track";
  return {
    status,
    text: `${round(pctOfTarget, 0)}% of the ${round(targetBu, 0)} mil bu export target with ${round(pctElapsed, 0)}% of the marketing year elapsed — running ${status}`,
  };
}

function paceFromRunRate(
  annualBu: number,
  targetBu: number | null | undefined,
): { status: "ahead" | "behind" | "on track"; text: string } | null {
  if (targetBu == null) return null;
  const pct = (annualBu / targetBu) * 100;
  const status = pct > 103 ? "ahead" : pct < 97 ? "behind" : "on track";
  return {
    status,
    text: `current run-rate ≈ ${round(annualBu, 0)} mil bu/yr vs the ${round(targetBu, 0)} mil bu USDA target — ${status} of pace`,
  };
}

function myElapsedPct(): number {
  const now = new Date();
  const y = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const start = Date.UTC(y, 8, 1); // Sep 1
  const pct = ((now.getTime() - start) / (365 * 86_400_000)) * 100;
  return Math.max(0, Math.min(100, pct));
}

// ── small helpers ────────────────────────────────────────────────────────────
type EsrRow = {
  weekEndingDate?: string;
  weeklyExports?: number | string;
  currentMYNetSales?: number | string;
  currentMYTotalCommitment?: number | string;
};
type NassRow = {
  short_desc?: string;
  Value?: string;
  year?: string | number;
  reference_period_desc?: string;
  load_time?: string;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function prevMonth(m: string): string {
  const i = MONTHS.indexOf(m.toUpperCase());
  return i <= 0 ? "DEC" : MONTHS[i - 1];
}
function monthRow(rows: NassRow[], mon: string, yr: number): number | null {
  const r = rows.find(
    (x) =>
      (x.reference_period_desc ?? "").trim().toUpperCase() === mon &&
      Number(x.year) === yr,
  );
  return num(r?.Value);
}
function weeksApart(a: string, b: string): number {
  return Math.abs(Date.parse(b) - Date.parse(a)) / (7 * 86_400_000);
}
function num(v: number | string | undefined | null): number | null {
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
async function getJson(
  url: string,
  headers?: Record<string, string>,
): Promise<unknown | null> {
  const txt = await getText(url, headers);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}
async function getText(
  url: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FurrowBot/1.0)", ...headers },
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
