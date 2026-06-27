import type { Crop } from "@/lib/types/database";

export type EconReportType =
  | "wasde"
  | "grain_stocks"
  | "acreage"
  | "prospective_plantings";

/**
 * One framed supply figure. Per REFERENCE_FRAMING_SPEC: no raw number enters the
 * corpus alone — each carries the frames that apply. Null frames simply don't
 * apply to that metric. `expectationAvailable` is always false for now (we don't
 * have trade polling) so the engine can be honest per surprise-not-level.
 */
export type EconFrame = {
  metric: string; // "Ending Stocks", "Production", "Grain Stocks", "Acres Planted"…
  value: number | null;
  unit: string; // "mil bu", "$/bu", "mil ac"
  // Δ prior period (WASDE = month-over-month; stocks/acreage = report-over-report)
  deltaPrior: number | null;
  priorLabel: string | null; // "May", "March intentions"
  priorValue: number | null;
  // Δ vs the same point last year
  deltaYear: number | null;
  priorYearLabel: string | null; // "2025/26", "Mar 2025"
  priorYearValue: number | null;
  // ending-stocks only: carryout ÷ total use, as a %
  stocksToUse: number | null;
  // inline humility / context (trend-assumption, surprise-not-level reminder…)
  note: string | null;
  // we do NOT have trade-expectation polling — kept explicit, never silently dropped
  expectationAvailable: boolean;
};

export type EconBundle = {
  reportType: EconReportType;
  crop: Crop;
  marketingYear: string; // "2026/27" (WASDE) or "2026" (stocks/acreage)
  releasedAt: string | null; // ISO — when USDA published it
  sourceUrl: string; // grounding link
  frames: EconFrame[];
};

export type ReportCalendarEntry = {
  reportType: string;
  releaseDate: string; // YYYY-MM-DD
  description: string;
};

export type EconProvider = {
  readonly name: string;
  getBundles(): Promise<EconBundle[]>;
};

export const REPORT_LABEL: Record<EconReportType, string> = {
  wasde: "WASDE",
  grain_stocks: "Grain Stocks",
  acreage: "Acreage",
  prospective_plantings: "Prospective Plantings",
};

export type { Crop };
