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
// crop is NULL for a "whole farm" expense (fuel, parts, general maintenance) —
// not tied to one crop; allocated across crops by acreage in the break-even.
export type ExpenseEntry = {
  id: string;
  crop: Crop | null;
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

export type SpendCategory = { key: string; label: string; amount: number; pct: number };

/** Expenses grouped by category for the visual spending summary: largest-first,
 *  empty categories omitted, and integer percents of the total that sum to
 *  EXACTLY 100 (largest-remainder rounding, so the bars never total 99 or 101).
 *  A presentation layer over the same summed data the break-even uses. */
export function spendingByCategory(entries: ExpenseEntry[]): {
  total: number;
  count: number;
  rows: SpendCategory[];
} {
  const { byCategory, total } = expenseTotals(entries);
  const rows: SpendCategory[] = Object.entries(byCategory)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({ key, label: CATEGORY_LABEL[key] ?? key, amount, pct: 0 }))
    .sort((a, b) => b.amount - a.amount);

  if (total > 0 && rows.length > 0) {
    const exact = rows.map((r) => (r.amount / total) * 100);
    const floors = exact.map((x) => Math.floor(x));
    let leftover = 100 - floors.reduce((s, f) => s + f, 0);
    // Hand the leftover whole points to the largest fractional remainders.
    const byRemainder = exact
      .map((x, i) => ({ i, frac: x - Math.floor(x) }))
      .sort((a, b) => b.frac - a.frac);
    const bumped = new Set<number>();
    for (let k = 0; k < byRemainder.length && leftover > 0; k++, leftover--) {
      bumped.add(byRemainder[k].i);
    }
    rows.forEach((r, i) => (r.pct = floors[i] + (bumped.has(i) ? 1 : 0)));
  }
  return { total, count: entries.length, rows };
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

/** Each crop's cost that feeds its break-even, split into what it owns directly
 *  and its allocated share of whole-farm costs (for transparent display). */
export type CropAllocation = {
  tagged: number; // expenses tagged directly to this crop
  wholeFarmAllocated: number; // this crop's share of whole-farm (crop = null) expenses
  total: number; // tagged + allocated → the cost that feeds break-even
  sharePct: number | null; // acreage share used for allocation (null if no acres set anywhere)
};

/**
 * Allocate whole-farm (crop = null) expenses across crops by ACREAGE SHARE, and
 * return each crop's total cost (tagged + allocated). Every real cost lands
 * somewhere — whole-farm is split by acres (each crop's acres ÷ total acres),
 * never dropped, so the break-even never understates true cost. If no crop has
 * acres yet, whole-farm can't be allocated (share 0) — it flows in once acres
 * are set. If only one crop has acres, it takes the whole-farm cost entirely.
 */
export function allocateWholeFarm(
  expenses: { crop: Crop | null; lineTotal: number }[],
  acresByCrop: Record<Crop, number | null>,
): Record<Crop, CropAllocation> {
  const wholeFarm = expenses.filter((e) => e.crop == null).reduce((s, e) => s + e.lineTotal, 0);
  const acresOf = (c: Crop) => (acresByCrop[c] && acresByCrop[c]! > 0 ? acresByCrop[c]! : 0);
  const totalAcres = CROPS.reduce((s, c) => s + acresOf(c), 0);
  const out = {} as Record<Crop, CropAllocation>;
  for (const c of CROPS) {
    const tagged = expenses.filter((e) => e.crop === c).reduce((s, e) => s + e.lineTotal, 0);
    const share = totalAcres > 0 ? acresOf(c) / totalAcres : 0;
    const allocated = Math.round(wholeFarm * share * 100) / 100;
    out[c] = {
      tagged: Math.round(tagged * 100) / 100,
      wholeFarmAllocated: allocated,
      total: Math.round((tagged + allocated) * 100) / 100,
      sharePct: totalAcres > 0 ? Math.round(share * 100) : null,
    };
  }
  return out;
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
