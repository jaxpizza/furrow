"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { allocateWholeFarm, CROPS } from "@/lib/inputs/ledger";
import type { Crop } from "@/lib/types/database";

type DB = Awaited<ReturnType<typeof createClient>>;
type Result = { ok: boolean; error?: string };

/**
 * Recompute breakeven_targets from the EXPENSE LEDGER for BOTH crops of a (farm,
 * year): each crop's cost_per_acre = (its crop-tagged expenses + its acreage
 * share of whole-farm/crop=null expenses) ÷ acres. The DB-generated
 * effective_breakeven (cost_per_acre ÷ expected_yield) is then the SAME number
 * the markets card, terminal, cash-vs-break-even chart, and alert evaluator read
 * — never forked. Both crops are recomputed together because whole-farm costs and
 * acreage are cross-crop. (profit_target_per_bushel is omitted so a target set on
 * the markets card is preserved.)
 */
async function syncBreakeven(supabase: DB, farmId: string, cropYear: number) {
  const [{ data: exp }, { data: settings }] = await Promise.all([
    supabase.from("expense_entries").select("crop, line_total").eq("farm_id", farmId).eq("crop_year", cropYear),
    supabase.from("crop_year_settings").select("crop, acres, expected_yield").eq("farm_id", farmId).eq("crop_year", cropYear),
  ]);
  const expenses = (exp ?? []).map((e) => ({ crop: e.crop as Crop | null, lineTotal: Number(e.line_total) || 0 }));
  const acresByCrop = { corn: null, soybean: null } as Record<Crop, number | null>;
  const yieldByCrop = { corn: null, soybean: null } as Record<Crop, number | null>;
  for (const s of settings ?? []) {
    acresByCrop[s.crop as Crop] = s.acres;
    yieldByCrop[s.crop as Crop] = s.expected_yield;
  }
  const alloc = allocateWholeFarm(expenses, acresByCrop);
  for (const crop of CROPS) {
    const acres = acresByCrop[crop];
    const costPerAcre = acres && acres > 0 ? Math.round((alloc[crop].total / acres) * 100) / 100 : null;
    await supabase.from("breakeven_targets").upsert(
      {
        farm_id: farmId,
        crop,
        entry_mode: "per_acre_yield",
        cost_per_bushel: null,
        cost_per_acre: costPerAcre,
        expected_yield: yieldByCrop[crop] ?? null,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "farm_id,crop" },
    );
  }
}

const done = (error?: { message?: string } | null): Result => {
  revalidatePath("/inputs");
  return error ? { ok: false, error: error.message ?? "Something went wrong." } : { ok: true };
};

// ── Ledger 1: expenses ───────────────────────────────────────────────────────
export async function addExpense(input: {
  farmId: string;
  crop: Crop | null; // null = whole-farm (allocated across crops by acreage)
  cropYear: number;
  category: string;
  description: string;
  unitCost: number;
  quantity: number;
  entryDate: string;
}): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("expense_entries").insert({
    farm_id: input.farmId,
    crop: input.crop,
    crop_year: input.cropYear,
    category: input.category,
    description: input.description || null,
    unit_cost: input.unitCost,
    quantity: input.quantity,
    entry_date: input.entryDate,
  });
  if (!error) await syncBreakeven(supabase, input.farmId, input.cropYear);
  return done(error);
}

export async function deleteExpense(input: { id: string; farmId: string; cropYear: number }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("expense_entries").delete().eq("id", input.id);
  if (!error) await syncBreakeven(supabase, input.farmId, input.cropYear);
  return done(error);
}

export async function saveCropSettings(input: {
  farmId: string;
  crop: Crop;
  cropYear: number;
  acres: number | null;
  expectedYield: number | null;
}): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("crop_year_settings").upsert(
    {
      farm_id: input.farmId,
      crop: input.crop,
      crop_year: input.cropYear,
      acres: input.acres,
      expected_yield: input.expectedYield,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "farm_id,crop,crop_year" },
  );
  if (!error) await syncBreakeven(supabase, input.farmId, input.cropYear);
  return done(error);
}

// ── Ledger 2: harvest ────────────────────────────────────────────────────────
export async function addHarvest(input: {
  farmId: string;
  crop: Crop;
  cropYear: number;
  bushels: number;
  storageLocationId: string | null;
  entryDate: string;
  moisture: number | null;
  notes: string;
  /** OPTIONAL — the field this harvest came from (per-field yield history). Left
   *  unset for farm-level logging (the simple, few-taps flow). */
  fieldId?: string | null;
}): Promise<Result> {
  const supabase = await createClient();
  // Only send field_id when a field was actually chosen, so farm-level logging
  // never depends on the field_id column (migration 0018) being present.
  const { error } = await supabase.from("harvest_entries").insert({
    farm_id: input.farmId,
    crop: input.crop,
    crop_year: input.cropYear,
    bushels: input.bushels,
    storage_location_id: input.storageLocationId,
    entry_date: input.entryDate,
    moisture: input.moisture,
    notes: input.notes || null,
    ...(input.fieldId ? { field_id: input.fieldId } : {}),
  });
  return done(error);
}

export async function deleteHarvest(input: { id: string }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("harvest_entries").delete().eq("id", input.id);
  return done(error);
}

// ── Ledger 3: sales ──────────────────────────────────────────────────────────
export async function addSale(input: {
  farmId: string;
  crop: Crop;
  cropYear: number;
  bushels: number;
  storageLocationId: string | null;
  price: number;
  buyer: string;
  entryDate: string;
}): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("sale_entries").insert({
    farm_id: input.farmId,
    crop: input.crop,
    crop_year: input.cropYear,
    bushels: input.bushels,
    storage_location_id: input.storageLocationId,
    price: input.price,
    buyer: input.buyer || null,
    entry_date: input.entryDate,
  });
  return done(error);
}

export async function deleteSale(input: { id: string }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("sale_entries").delete().eq("id", input.id);
  return done(error);
}

// ── Storage locations ────────────────────────────────────────────────────────
export async function addStorageLocation(input: {
  farmId: string;
  name: string;
  kind: "owned" | "commercial";
  capacityBu: number | null;
  storageCostCentsPerBuMonth: number | null;
}): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("storage_locations").insert({
    farm_id: input.farmId,
    name: input.name,
    kind: input.kind,
    capacity_bu: input.capacityBu,
    storage_cost_cents_per_bu_month: input.kind === "commercial" ? input.storageCostCentsPerBuMonth : null,
  });
  return done(error);
}

export async function deleteStorageLocation(input: { id: string }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("storage_locations").delete().eq("id", input.id);
  return done(error);
}
