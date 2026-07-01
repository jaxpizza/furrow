import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { ExpenseLedger } from "@/components/inputs/expense-ledger";
import { HarvestLedger } from "@/components/inputs/harvest-ledger";
import { PositionSummary } from "@/components/inputs/position-summary";
import { SaleLedger } from "@/components/inputs/sale-ledger";
import { StorageManager } from "@/components/inputs/storage-manager";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import {
  computePosition,
  CROPS,
  currentCropYear,
  type ExpenseEntry,
  type HarvestEntry,
  type SaleEntry,
  type StorageKind,
  type StorageLocation,
} from "@/lib/inputs/ledger";
import { CROP_LABEL } from "@/lib/markets/symbols";
import { createClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

export const metadata: Metadata = { title: "Inputs" };
export const dynamic = "force-dynamic";

export default async function InputsPage() {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0];
  const farmId = activeFarm.id;
  const cropYear = currentCropYear();

  const supabase = await createClient();
  // allSettled so an unexpected error on one query degrades to an empty ledger
  // rather than crashing the whole page.
  const [expR, harvR, salR, locsR, setR] = await Promise.allSettled([
    supabase.from("expense_entries").select("*").eq("farm_id", farmId).eq("crop_year", cropYear).order("entry_date", { ascending: false }),
    supabase.from("harvest_entries").select("*").eq("farm_id", farmId).eq("crop_year", cropYear).order("entry_date", { ascending: false }),
    supabase.from("sale_entries").select("*").eq("farm_id", farmId).eq("crop_year", cropYear).order("entry_date", { ascending: false }),
    supabase.from("storage_locations").select("*").eq("farm_id", farmId).order("created_at"),
    supabase.from("crop_year_settings").select("crop, acres, expected_yield").eq("farm_id", farmId).eq("crop_year", cropYear),
  ]);
  const settled = <T,>(r: PromiseSettledResult<{ data: T | null }>): { data: T | null } =>
    r.status === "fulfilled" ? r.value : { data: null };
  const exp = settled(expR);
  const harv = settled(harvR);
  const sal = settled(salR);
  const locs = settled(locsR);
  const set = settled(setR);

  const expenses: ExpenseEntry[] = (exp.data ?? []).map((e) => ({
    id: e.id, crop: e.crop, category: e.category, description: e.description,
    unitCost: e.unit_cost, quantity: e.quantity, lineTotal: e.line_total ?? 0, entryDate: e.entry_date,
  }));
  const harvests: HarvestEntry[] = (harv.data ?? []).map((h) => ({
    id: h.id, crop: h.crop, bushels: h.bushels, storageLocationId: h.storage_location_id,
    entryDate: h.entry_date, moisture: h.moisture, notes: h.notes,
  }));
  const sales: SaleEntry[] = (sal.data ?? []).map((s) => ({
    id: s.id, crop: s.crop, bushels: s.bushels, storageLocationId: s.storage_location_id,
    price: s.price, buyer: s.buyer, entryDate: s.entry_date,
  }));
  const locations: StorageLocation[] = (locs.data ?? []).map((l) => ({
    id: l.id, name: l.name, kind: l.kind as StorageKind,
    capacityBu: l.capacity_bu, storageCostCentsPerBuMonth: l.storage_cost_cents_per_bu_month,
  }));

  const settingsByCrop = Object.fromEntries(
    CROPS.map((c) => {
      const row = (set.data ?? []).find((s) => s.crop === c);
      return [c, row ? { acres: row.acres, expectedYield: row.expected_yield } : null];
    }),
  ) as Record<Crop, { acres: number | null; expectedYield: number | null } | null>;

  const positionByCrop = Object.fromEntries(
    CROPS.map((c) => [
      c,
      computePosition(harvests.filter((h) => h.crop === c), sales.filter((s) => s.crop === c), locations),
    ]),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Inputs"
        subtitle={`Log expenses, harvest, and sales as they happen — one flow, crop per entry. ${cropYear} crop year; the app tallies the rest.`}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CROPS.map((c) => (
            <PositionSummary key={c} cropLabel={CROP_LABEL[c]} position={positionByCrop[c]} />
          ))}
        </div>

        <ExpenseLedger farmId={farmId} cropYear={cropYear} expenses={expenses} settingsByCrop={settingsByCrop} />
        <StorageManager farmId={farmId} locations={locations} harvests={harvests} sales={sales} />
        <HarvestLedger farmId={farmId} cropYear={cropYear} harvests={harvests} locations={locations} />
        <SaleLedger farmId={farmId} cropYear={cropYear} sales={sales} locations={locations} />
      </div>
    </div>
  );
}
