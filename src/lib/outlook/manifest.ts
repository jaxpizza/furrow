import type { Crop } from "@/lib/types/database";

import type { DemandBundle, DemandDataType } from "./demand-types";
import type { EconBundle } from "./econ-types";
import type { MacroBundle, MacroSignalType } from "./macro-types";
import type { ReportBundle } from "./types";

/**
 * Sub-source MANIFEST — the expected sub-signals per multi-source bucket, per crop.
 * Two uses:
 *  - HONESTY (synthesis): when an expected sub-source is missing this read, the
 *    corpus emits an explicit "(DATA GAP — … UNAVAILABLE)" line so the engine
 *    discloses the hole instead of presenting the bucket as complete.
 *  - SELF-HEAL (ingest): a bucket missing an expected sub-source is treated as
 *    INCOMPLETE and refreshes on a short cadence (retries the failed source soon)
 *    instead of waiting a full TTL because a sibling source is fresh.
 */
export const SUBSOURCE_LABEL: Record<string, string> = {
  export_sales: "weekly export sales (FAS pace + China share)",
  ethanol: "ethanol grind",
  crush: "soybean crush",
  wasde: "WASDE balance sheet",
  grain_stocks: "quarterly grain stocks",
  acres: "planted / intended acreage",
  dollar: "US dollar (DXY)",
  crude: "crude oil",
  macro_weather: "Corn Belt weather",
  condition: "crop condition rating",
};

const CROPS: Crop[] = ["corn", "soybean"];

/** When a bucket is INCOMPLETE (a sub-source failed/absent), retry on this short
 *  cadence instead of waiting the full TTL because a sibling source is fresh —
 *  so a transient outage (e.g. FAS 503) self-heals within ~30 min rather than 12h.
 *  Still gated (not every page load) to avoid hammering the working sources. */
export const INCOMPLETE_TTL_MS = 30 * 60 * 1000;

/** Staleness gate that shortens the TTL when the bucket is missing an expected
 *  sub-source. `complete` comes from the per-bucket xxxComplete() helpers. */
export function bucketStale(
  last: number | null,
  complete: boolean,
  normalTtl: number,
): boolean {
  if (last == null) return true;
  return Date.now() - last >= (complete ? normalTtl : INCOMPLETE_TTL_MS);
}

/** Days since an ISO timestamp (null/invalid → Infinity = treated as absent). */
export function ageDays(iso: string | null | undefined, nowMs = Date.now()): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (nowMs - t) / 86_400_000 : Infinity;
}

// ── DEMAND ───────────────────────────────────────────────────────────────────
// Export sales publish weekly (Thursdays), so a recent reading stays valid for
// days (KEEP-LAST-GOOD). Three states by how long since we last stored export:
//   fresh (≤2d) · dated [keep-last-good] (2–10d) · absent [gap] (>10d or none).
export const EXPORT_FRESH_DAYS = 2;
export const EXPORT_GAP_DAYS = 10;

export type FreshState = "fresh" | "dated" | "absent";

export function demandExpected(crop: Crop): DemandDataType[] {
  // ethanol is corn-only, crush is soy-only; export sales applies to both.
  return crop === "corn" ? ["export_sales", "ethanol"] : ["export_sales", "crush"];
}

/** Keep-last-good state of the export reading for one crop. */
export function exportState(cropBundles: DemandBundle[], nowMs = Date.now()): {
  state: FreshState;
  ageDays: number;
} {
  const ex = cropBundles.find((b) => b.dataType === "export_sales");
  if (!ex) return { state: "absent", ageDays: Infinity };
  const age = ageDays(ex.fetchedAt, nowMs);
  const state: FreshState =
    age > EXPORT_GAP_DAYS ? "absent" : age > EXPORT_FRESH_DAYS ? "dated" : "fresh";
  return { state, ageDays: age };
}

/**
 * Missing demand sub-source labels for one crop. Export counts as a GAP only in
 * state (c) — absent or older than EXPORT_GAP_DAYS — so a recent-but-dated
 * keep-last-good reading is NOT reported as a gap (it's served, dated).
 */
export function demandGaps(
  crop: Crop,
  cropBundles: DemandBundle[],
  nowMs = Date.now(),
): string[] {
  const present = new Set(cropBundles.map((b) => b.dataType));
  const out: string[] = [];
  for (const k of demandExpected(crop)) {
    if (k === "export_sales") {
      if (exportState(cropBundles, nowMs).state === "absent")
        out.push(SUBSOURCE_LABEL[k]);
    } else if (!present.has(k)) {
      out.push(SUBSOURCE_LABEL[k]);
    }
  }
  return out;
}

/** "Complete" for the refresh gate (flag B): present sub-sources AND a FRESH
 *  export reading. A dated-but-valid export (state b) is intentionally treated as
 *  incomplete so the short retry keeps trying to pick up a fresh one / FAS recovery
 *  — but it is NOT a gap (it's still served). */
export function demandComplete(all: DemandBundle[], nowMs = Date.now()): boolean {
  return CROPS.every((crop) => {
    const cropBundles = all.filter((b) => b.crop === crop);
    const present = new Set(cropBundles.map((b) => b.dataType));
    return demandExpected(crop).every((k) =>
      k === "export_sales"
        ? exportState(cropBundles, nowMs).state === "fresh"
        : present.has(k),
    );
  });
}

// ── SUPPLY ───────────────────────────────────────────────────────────────────
// "acres" is satisfied by either the June Acreage report or March Prospective
// Plantings (whichever is the current planted-acres read).
function supplyMissingKeys(reportTypes: Set<string>): string[] {
  const miss: string[] = [];
  if (!reportTypes.has("wasde")) miss.push("wasde");
  if (!reportTypes.has("grain_stocks")) miss.push("grain_stocks");
  if (!reportTypes.has("acreage") && !reportTypes.has("prospective_plantings"))
    miss.push("acres");
  return miss;
}

export function supplyGaps(cropBundles: EconBundle[]): string[] {
  return supplyMissingKeys(new Set(cropBundles.map((b) => b.reportType))).map(
    (k) => SUBSOURCE_LABEL[k],
  );
}

export function supplyComplete(all: EconBundle[]): boolean {
  return CROPS.every(
    (crop) =>
      supplyMissingKeys(
        new Set(all.filter((b) => b.crop === crop).map((b) => b.reportType)),
      ).length === 0,
  );
}

// ── MACRO (crop-agnostic) ────────────────────────────────────────────────────
export const MACRO_EXPECTED: MacroSignalType[] = ["dollar", "crude", "macro_weather"];

export function macroGaps(macro: MacroBundle[]): string[] {
  const present = new Set(macro.map((b) => b.signalType));
  return MACRO_EXPECTED.filter((k) => !present.has(k)).map((k) => SUBSOURCE_LABEL[k]);
}

export function macroComplete(macro: MacroBundle[]): boolean {
  const present = new Set(macro.map((b) => b.signalType));
  return MACRO_EXPECTED.every((k) => present.has(k));
}

// ── CONDITIONS (the load-bearing good/excellent rating) ──────────────────────
export function conditionGaps(cropReports: ReportBundle[]): string[] {
  const hasCondition = cropReports.some((b) => b.reportType === "condition");
  return hasCondition ? [] : [SUBSOURCE_LABEL.condition];
}

export function conditionsComplete(reports: ReportBundle[]): boolean {
  return CROPS.every((crop) =>
    reports.some((b) => b.crop === crop && b.reportType === "condition"),
  );
}
