import type { Crop } from "@/lib/types/database";

export type Geography = "IL" | "US";
export type ReportType = "condition" | "progress" | "yield" | "production";

/** A single grounded USDA data point — value + the period/source that anchors it. */
export type ReportDataPoint = {
  shortDesc: string; // NASS short_desc, e.g. "CORN - CONDITION, MEASURED IN PCT GOOD"
  label: string; // human label, e.g. "Good"
  value: number | null; // numeric value, null when NASS withholds it ("(D)")
  unit: string; // NASS unit_desc, e.g. "PCT GOOD", "BU / ACRE"
  year: number;
  period: string; // reference_period_desc, e.g. "WEEK #25", "YEAR"
  asOf: string; // NASS load_time (ISO)
};

/** One cached USDA query result: a crop×geography×report-type bundle of points. */
export type ReportBundle = {
  reportType: ReportType;
  crop: Crop;
  geography: Geography;
  period: string; // marketing year, e.g. "2026"
  sourceUrl: string; // keyless, reproducible NASS query URL (grounding)
  fetchedAt: string;
  points: ReportDataPoint[];
};

/** A grounded ag-news item — every field traceable to a real article. */
export type NewsItem = {
  link: string; // canonical URL (also the dedup key)
  source: string; // feed display name
  title: string;
  summary: string | null;
  publishedAt: string | null; // ISO
  cropTags: string[]; // ['corn','soybean','grain']
  fetchedAt: string;
};

/**
 * Provider seams — same swappable pattern as the price providers. Consumers call
 * these interfaces and never the raw feeds/APIs, so a source can be swapped or
 * added without touching anything downstream. Both are fault-tolerant: a single
 * dead source is logged and skipped, never thrown.
 */
export interface ReportProvider {
  readonly name: string;
  getReports(): Promise<ReportBundle[]>;
}

export interface NewsProvider {
  readonly name: string;
  getItems(): Promise<NewsItem[]>;
}
