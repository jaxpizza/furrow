import "server-only";

import type { Crop } from "@/lib/types/database";
import {
  EXTREME_HIGH,
  EXTREME_LOW,
  type CotBundle,
  type MoneyFlowProvider,
} from "../cot-types";

const SOCRATA = "https://publicreporting.cftc.gov/resource/72hh-3qpy.json";
// CFTC public reporting — NO API KEY (CFTC does not issue tokens).
const SOURCE_URL =
  "https://publicreporting.cftc.gov/Public-Reporting/Commitments-of-Traders-Disaggregated-Reports-Futur/72hh-3qpy";
const TIMEOUT_MS = 40_000;
const HISTORY_LIMIT = 1300; // ~25yr of weekly rows — deep enough to rank against

const MARKETS: Record<Crop, string> = {
  corn: "CORN",
  soybean: "SOYBEANS",
};

type Row = {
  report_date_as_yyyy_mm_dd?: string;
  m_money_positions_long_all?: string;
  m_money_positions_short_all?: string;
  change_in_m_money_long_all?: string;
  change_in_m_money_short_all?: string;
  open_interest_all?: string;
};

/**
 * CFTC Commitment of Traders (Disaggregated Futures-Only, dataset 72hh-3qpy).
 * Pulls the latest weekly Managed Money position for corn & soybeans plus the
 * full history, and frames the net position by its historical percentile at
 * ingestion. Fault-tolerant per crop; never throws.
 */
export class CftcCotProvider implements MoneyFlowProvider {
  readonly name = "cftc-cot";

  async getBundles(): Promise<CotBundle[]> {
    const settled = await Promise.allSettled(
      (Object.keys(MARKETS) as Crop[]).map((c) => this.forCrop(c)),
    );
    const out: CotBundle[] = [];
    settled.forEach((r) => {
      if (r.status === "rejected") console.warn("[cot] crop failed", r.reason);
      else if (r.value) out.push(r.value);
    });
    return out;
  }

  private async forCrop(crop: Crop): Promise<CotBundle | null> {
    const where = encodeURIComponent(`contract_market_name='${MARKETS[crop]}'`);
    const url =
      `${SOCRATA}?$select=report_date_as_yyyy_mm_dd,m_money_positions_long_all,` +
      `m_money_positions_short_all,change_in_m_money_long_all,` +
      `change_in_m_money_short_all,open_interest_all` +
      `&$where=${where}&$order=report_date_as_yyyy_mm_dd DESC&$limit=${HISTORY_LIMIT}`;
    const rows = (await getJson(url)) as Row[] | null;
    if (!rows || rows.length === 0) return null;

    const nets = rows
      .map((r) => num(r.m_money_positions_long_all, r.m_money_positions_short_all))
      .filter((n): n is number => n != null);
    if (nets.length === 0) return null;

    const latest = rows[0];
    const long = int(latest.m_money_positions_long_all);
    const short = int(latest.m_money_positions_short_all);
    if (long == null || short == null) return null;
    const net = long - short;

    const dLong = int(latest.change_in_m_money_long_all);
    const dShort = int(latest.change_in_m_money_short_all);
    const deltaPriorNet = dLong != null && dShort != null ? dLong - dShort : null;
    const net4w = nets.length > 4 ? nets[4] : null;
    const trendNet4w = net4w != null ? net - net4w : null;

    // percentile: where current net ranks in its own history
    const sorted = [...nets].sort((a, b) => a - b);
    const below = sorted.filter((v) => v < net).length;
    const percentile = Math.round((below / sorted.length) * 100);
    const extreme =
      percentile >= EXTREME_HIGH
        ? "crowded long"
        : percentile <= EXTREME_LOW
          ? "crowded short"
          : null;

    const reportDate = (latest.report_date_as_yyyy_mm_dd ?? "").slice(0, 10);

    return {
      crop,
      reportDate,
      releasedAt: fridayAfter(reportDate),
      sourceUrl: SOURCE_URL,
      long,
      short,
      net,
      openInterest: int(latest.open_interest_all),
      deltaPriorNet,
      trendNet4w,
      percentile,
      histLow: sorted[0],
      histHigh: sorted[sorted.length - 1],
      historyWeeks: sorted.length,
      extreme,
      positioning: net >= 0 ? "net long" : "net short",
    };
  }
}

export const moneyFlowProvider: MoneyFlowProvider = new CftcCotProvider();

// ── helpers ──────────────────────────────────────────────────────────────────
function int(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? Math.round(n) : null;
}
function num(l: string | undefined, s: string | undefined): number | null {
  const a = int(l);
  const b = int(s);
  return a != null && b != null ? a - b : null;
}
/** Positions are as of Tuesday; the report publishes the following Friday. */
function fridayAfter(isoDate: string): string | null {
  const t = Date.parse(isoDate);
  if (!Number.isFinite(t)) return null;
  return new Date(t + 3 * 86_400_000).toISOString();
}
async function getJson(url: string): Promise<unknown | null> {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FurrowBot/1.0", Accept: "application/json" },
      cache: "no-store",
      signal: c.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
