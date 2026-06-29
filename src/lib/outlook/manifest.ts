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

// ── DEMAND ───────────────────────────────────────────────────────────────────
export function demandExpected(crop: Crop): DemandDataType[] {
  // ethanol is corn-only, crush is soy-only; export sales applies to both.
  return crop === "corn" ? ["export_sales", "ethanol"] : ["export_sales", "crush"];
}

/** Missing demand sub-source labels for one crop (caller passes that crop's bundles). */
export function demandGaps(crop: Crop, cropBundles: DemandBundle[]): string[] {
  const present = new Set(cropBundles.map((b) => b.dataType));
  return demandExpected(crop)
    .filter((k) => !present.has(k))
    .map((k) => SUBSOURCE_LABEL[k]);
}

export function demandComplete(all: DemandBundle[]): boolean {
  return CROPS.every((crop) => {
    const present = new Set(all.filter((b) => b.crop === crop).map((b) => b.dataType));
    return demandExpected(crop).every((k) => present.has(k));
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
