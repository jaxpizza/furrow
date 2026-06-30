import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import {
  computePosition,
  type HarvestEntry,
  type Position,
  type SaleEntry,
  type StorageLocation,
  type StorageKind,
} from "./ledger";

const CROPS: Crop[] = ["corn", "soybean"];

/** Per-crop marketing position for a crop year, summed from the ledgers. Used by
 *  the dashboard holdings summary and available to the personal read layer. */
export async function getHoldings(
  farmId: string,
  cropYear: number,
): Promise<Record<Crop, Position>> {
  const db = createServiceRoleClient();
  const [{ data: locs }, { data: harv }, { data: sales }] = await Promise.all([
    db.from("storage_locations").select("*").eq("farm_id", farmId),
    db.from("harvest_entries").select("*").eq("farm_id", farmId).eq("crop_year", cropYear),
    db.from("sale_entries").select("*").eq("farm_id", farmId).eq("crop_year", cropYear),
  ]);
  const locations: StorageLocation[] = (locs ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    kind: l.kind as StorageKind,
    capacityBu: l.capacity_bu,
    storageCostCentsPerBuMonth: l.storage_cost_cents_per_bu_month,
  }));
  const harvests: (HarvestEntry & { crop: Crop })[] = (harv ?? []).map((h) => ({
    crop: h.crop,
    id: h.id,
    bushels: h.bushels,
    storageLocationId: h.storage_location_id,
    entryDate: h.entry_date,
    moisture: h.moisture,
    notes: h.notes,
  }));
  const allSales: (SaleEntry & { crop: Crop })[] = (sales ?? []).map((s) => ({
    crop: s.crop,
    id: s.id,
    bushels: s.bushels,
    storageLocationId: s.storage_location_id,
    price: s.price,
    buyer: s.buyer,
    entryDate: s.entry_date,
  }));

  const out = {} as Record<Crop, Position>;
  for (const crop of CROPS) {
    out[crop] = computePosition(
      harvests.filter((h) => h.crop === crop),
      allSales.filter((s) => s.crop === crop),
      locations,
    );
  }
  return out;
}
