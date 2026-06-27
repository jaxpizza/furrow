import type { Crop } from "@/lib/types/database";

/**
 * Money-flow bucket (Phase C) — CFTC Commitment of Traders, Managed Money.
 * COT is POSITIONING, NOT PREDICTION. The percentile of the net position in its
 * own multi-year history is THE frame: extreme readings (crowded trades) are the
 * signal and cut BOTH ways (often contrarian — a near-record net-long can precede
 * a reversal DOWN). A mid-range reading is a weak signal — don't over-read it.
 */
export type CotBundle = {
  crop: Crop;
  reportDate: string; // YYYY-MM-DD (positions as of this Tuesday)
  releasedAt: string | null; // the Friday the report published
  sourceUrl: string; // keyless CFTC link

  long: number;
  short: number;
  net: number; // long − short
  openInterest: number | null;

  deltaPriorNet: number | null; // week-over-week change in net
  trendNet4w: number | null; // net now − net ~4 weeks ago

  percentile: number; // 0–100: where net sits in its history (THE key frame)
  histLow: number;
  histHigh: number;
  historyWeeks: number;

  extreme: "crowded long" | "crowded short" | null; // ≥90th / ≤10th pctile
  positioning: "net long" | "net short";
};

export type MoneyFlowProvider = {
  readonly name: string;
  getBundles(): Promise<CotBundle[]>;
};

// percentile thresholds for "extreme" (crowded trade)
export const EXTREME_HIGH = 90;
export const EXTREME_LOW = 10;

export type { Crop };
