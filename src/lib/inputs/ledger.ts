import type { Crop } from "@/lib/types/database";

export const CROPS: Crop[] = ["corn", "soybean"];
export const CROP_SHORT: Record<Crop, string> = { corn: "Corn", soybean: "Soy" };

/** The standard ag expense categories (Ledger 1). */
export const EXPENSE_CATEGORIES = [
  { key: "seed", label: "Seed" },
  { key: "fertilizer", label: "Fertilizer" },
  { key: "chemical", label: "Chemical" },
  { key: "fuel_oil", label: "Fuel & oil" },
  { key: "machinery", label: "Machinery" },
  { key: "labor", label: "Labor" },
  { key: "land", label: "Land" },
  { key: "crop_insurance", label: "Crop insurance" },
  { key: "drying", label: "Drying" },
  { key: "interest", label: "Interest" },
  { key: "other", label: "Other" },
] as const;

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c.label]),
);

export type StorageKind = "owned" | "commercial";

/** The crop year a freshly-logged entry defaults to (calendar year). */
export function currentCropYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

// ── row view types (mapped from the DB rows) — crop is a property of each entry ─
export type ExpenseEntry = {
  id: string;
  crop: Crop;
  category: string;
  description: string | null;
  unitCost: number;
  quantity: number;
  lineTotal: number;
  entryDate: string;
};
export type HarvestEntry = {
  id: string;
  crop: Crop;
  bushels: number;
  storageLocationId: string | null;
  entryDate: string;
  moisture: number | null;
  notes: string | null;
};
export type SaleEntry = {
  id: string;
  crop: Crop;
  bushels: number;
  storageLocationId: string | null;
  price: number;
  buyer: string | null;
  entryDate: string;
};
export type StorageLocation = {
  id: string;
  name: string;
  kind: StorageKind;
  capacityBu: number | null;
  storageCostCentsPerBuMonth: number | null;
};

// ── pure tallies (the app does the arithmetic, never the farmer) ─────────────

export function expenseTotals(entries: ExpenseEntry[]) {
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.lineTotal;
    total += e.lineTotal;
  }
  return { byCategory, total: Math.round(total * 100) / 100 };
}

/** Break-even from the logged expenses: total ÷ (acres × yield). Returns the
 *  cost_per_acre and the per-bushel effective break-even (what flows to
 *  breakeven_targets, and what markets/terminal/alerts already read). */
export function ledgerBreakeven(total: number, acres: number | null, expectedYield: number | null) {
  const costPerAcre = acres && acres > 0 ? Math.round((total / acres) * 100) / 100 : null;
  const effective =
    costPerAcre != null && expectedYield && expectedYield > 0
      ? Math.round((costPerAcre / expectedYield) * 10000) / 10000
      : null;
  return { costPerAcre, effective };
}

export function salesTotals(sales: SaleEntry[]) {
  let bu = 0;
  let revenue = 0;
  for (const s of sales) {
    bu += s.bushels;
    revenue += s.bushels * s.price;
  }
  const avgPrice = bu > 0 ? Math.round((revenue / bu) * 10000) / 10000 : null;
  return {
    bushelsSold: Math.round(bu * 10) / 10,
    revenue: Math.round(revenue * 100) / 100,
    avgPrice,
  };
}

export function productionTotal(harvests: HarvestEntry[]): number {
  return Math.round(harvests.reduce((s, h) => s + h.bushels, 0) * 10) / 10;
}

/** Net bushels in a given location (harvested in − sold out). */
export function locationBalance(
  locationId: string,
  harvests: HarvestEntry[],
  sales: SaleEntry[],
): number {
  const inBu = harvests.filter((h) => h.storageLocationId === locationId).reduce((s, h) => s + h.bushels, 0);
  const outBu = sales.filter((s) => s.storageLocationId === locationId).reduce((s, x) => s + x.bushels, 0);
  return Math.round((inBu - outBu) * 10) / 10;
}

export type Position = {
  produced: number;
  sold: number;
  remaining: number;
  pctSold: number | null;
  avgPrice: number | null;
  revenue: number;
  ownedRemaining: number;
  commercialRemaining: number;
  unassignedRemaining: number;
};

export function computePosition(
  harvests: HarvestEntry[],
  sales: SaleEntry[],
  locations: StorageLocation[],
): Position {
  const produced = productionTotal(harvests);
  const { bushelsSold: sold, avgPrice, revenue } = salesTotals(sales);
  const remaining = Math.round((produced - sold) * 10) / 10;
  const kindOf = new Map(locations.map((l) => [l.id, l.kind]));
  let owned = 0;
  let commercial = 0;
  let unassigned = 0;
  for (const l of locations) {
    const bal = locationBalance(l.id, harvests, sales);
    if (kindOf.get(l.id) === "commercial") commercial += bal;
    else owned += bal;
  }
  // harvests with no location assigned
  const assignedIds = new Set(locations.map((l) => l.id));
  const inUn = harvests.filter((h) => !h.storageLocationId || !assignedIds.has(h.storageLocationId)).reduce((s, h) => s + h.bushels, 0);
  const outUn = sales.filter((s) => !s.storageLocationId || !assignedIds.has(s.storageLocationId)).reduce((s, x) => s + x.bushels, 0);
  unassigned = Math.round((inUn - outUn) * 10) / 10;
  return {
    produced,
    sold,
    remaining,
    pctSold: produced > 0 ? Math.min(100, Math.max(0, Math.round((sold / produced) * 100))) : null,
    avgPrice,
    revenue,
    ownedRemaining: Math.round(owned * 10) / 10,
    commercialRemaining: Math.round(commercial * 10) / 10,
    unassignedRemaining: unassigned,
  };
}

/** Accrued commercial storage cost so far: months held × rate × bushels still
 *  in commercial. Only meaningful when a rate is set. */
export function accruedStorageCost(
  location: StorageLocation,
  harvests: HarvestEntry[],
  sales: SaleEntry[],
  now: Date = new Date(),
): number | null {
  if (location.kind !== "commercial" || location.storageCostCentsPerBuMonth == null) return null;
  const bal = locationBalance(location.id, harvests, sales);
  if (bal <= 0) return null;
  // earliest harvest into this location → how long it's been stored
  const dates = harvests
    .filter((h) => h.storageLocationId === location.id)
    .map((h) => Date.parse(h.entryDate))
    .filter((t) => Number.isFinite(t));
  if (dates.length === 0) return null;
  const months = Math.max(0, (now.getTime() - Math.min(...dates)) / (30 * 86_400_000));
  return Math.round(bal * (location.storageCostCentsPerBuMonth / 100) * months * 100) / 100;
}
