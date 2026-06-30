export type CostKey =
  | "seed"
  | "fertilizer"
  | "chemicals"
  | "fuel_oil"
  | "machinery"
  | "labor"
  | "land"
  | "crop_insurance"
  | "drying_storage"
  | "interest"
  | "other";

/** The standard ag cost-of-production categories, grouped for entry. All $/acre. */
export const COST_GROUPS: {
  group: string;
  items: { key: CostKey; label: string; hint?: string }[];
}[] = [
  {
    group: "Inputs",
    items: [
      { key: "seed", label: "Seed" },
      { key: "fertilizer", label: "Fertilizer", hint: "N · P · K · lime" },
      { key: "chemicals", label: "Chemicals", hint: "herbicide · pesticide · fungicide" },
    ],
  },
  {
    group: "Operations",
    items: [
      { key: "fuel_oil", label: "Fuel & oil" },
      { key: "machinery", label: "Machinery", hint: "repairs · depreciation" },
      { key: "labor", label: "Labor" },
    ],
  },
  {
    group: "Land & financing",
    items: [
      { key: "land", label: "Land", hint: "cash rent or ownership" },
      { key: "crop_insurance", label: "Crop insurance" },
      { key: "interest", label: "Interest", hint: "operating capital" },
    ],
  },
  {
    group: "Post-harvest & other",
    items: [
      { key: "drying_storage", label: "Drying & storage" },
      { key: "other", label: "Other / misc" },
    ],
  },
];

export const COST_KEYS: CostKey[] = COST_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export function numStr(n: number | null | undefined): string {
  return n != null ? String(n) : "";
}

export function toNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
