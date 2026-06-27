import type { Crop } from "@/lib/types/database";

export type DemandDataType = "export_sales" | "flash_sale" | "ethanol" | "crush";

/**
 * One framed demand figure. Like the supply frames, no raw number stands alone.
 * The KEY frame for export sales is pace-vs-target (cumulative vs the WASDE
 * annual export target, against marketing-year elapsed) — surfaced as
 * paceStatus + paceText. Ethanol/crush carry a run-rate-vs-target paceText.
 */
export type DemandFrame = {
  metric: string;
  value: number | null;
  unit: string;
  deltaPrior: number | null; // week-over-week or month-over-month
  priorLabel: string | null;
  deltaYear: number | null; // vs the same point last marketing year
  priorYearLabel: string | null;
  priorYearValue: number | null;
  pctChina: number | null; // export sales: share to China, the swing buyer
  paceStatus: "ahead" | "behind" | "on track" | null;
  paceText: string | null; // "92% of the 3,150 mil bu target, 84% of the MY elapsed"
  note: string | null;
};

export type DemandBundle = {
  dataType: DemandDataType;
  crop: Crop;
  marketingYear: string;
  period: string | null; // "week ending Jun 19" / "Apr 2026"
  releasedAt: string | null;
  sourceUrl: string; // keyless grounding link
  frames: DemandFrame[];
};

export type DemandProvider = {
  readonly name: string;
  getBundles(): Promise<DemandBundle[]>;
};

export const DEMAND_LABEL: Record<DemandDataType, string> = {
  export_sales: "Export Sales",
  flash_sale: "Flash Sales",
  ethanol: "Ethanol Grind",
  crush: "Soybean Crush",
};

export type { Crop };
