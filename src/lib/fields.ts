import type { Polygon } from "geojson";

import type { Crop, Tenure } from "@/lib/types/database";

/** A field as the map workspace uses it — geom normalized to a GeoJSON Polygon
 *  (PostgREST returns PostGIS geometry as GeoJSON). */
export type MapField = {
  id: string;
  name: string;
  acreage: number | null;
  tenure: Tenure;
  rent_per_acre: number | null;
  geom: Polygon;
};

// ── per-field records (planting + harvest history) ───────────────────────────

/** A planting record: what crop went in a field in a given year (public.plantings). */
export type FieldPlanting = {
  id: string;
  fieldId: string;
  crop: Crop;
  cropYear: number;
  plantedDate: string | null;
};

/** A field-tagged harvest, summed per field+year from the harvest ledger. */
export type FieldHarvest = { fieldId: string; crop: Crop; cropYear: number; bushels: number };

/** One row of a field's year-over-year record: what was planted, what it yielded. */
export type FieldYearRecord = {
  year: number;
  crop: Crop | null; // the planted crop (from plantings)
  harvestedBu: number; // summed field-tagged harvest bushels
  buPerAcre: number | null; // harvestedBu ÷ acreage, when acreage is known
};

/** Build a field's per-year record from its plantings + field-tagged harvests.
 *  Newest year first; bu/acre only when the field's acreage is known. */
export function fieldHistory(
  field: { id: string; acreage: number | null },
  plantings: FieldPlanting[],
  harvests: FieldHarvest[],
): FieldYearRecord[] {
  const byYear = new Map<number, FieldYearRecord>();
  const row = (y: number): FieldYearRecord => {
    let r = byYear.get(y);
    if (!r) {
      r = { year: y, crop: null, harvestedBu: 0, buPerAcre: null };
      byYear.set(y, r);
    }
    return r;
  };
  for (const p of plantings) if (p.fieldId === field.id) row(p.cropYear).crop = p.crop;
  for (const h of harvests) if (h.fieldId === field.id) row(h.cropYear).harvestedBu += h.bushels;

  const acreage = field.acreage;
  return [...byYear.values()]
    .map((r) => {
      const harvestedBu = Math.round(r.harvestedBu * 10) / 10;
      return {
        ...r,
        harvestedBu,
        buPerAcre: acreage && acreage > 0 && harvestedBu > 0 ? Math.round((harvestedBu / acreage) * 10) / 10 : null,
      };
    })
    .sort((a, b) => b.year - a.year);
}

export const TENURE_META: Record<
  Tenure,
  { label: string; short: string; rented: boolean }
> = {
  owned: { label: "Owned", short: "Owned", rented: false },
  cash_rent: { label: "Cash rent", short: "Cash", rented: true },
  crop_share: { label: "Crop share", short: "Share", rented: true },
};

export const TENURE_OPTIONS: Tenure[] = ["owned", "cash_rent", "crop_share"];

/** Columns to select from `fields`; geom comes back as a GeoJSON Polygon. */
export const FIELD_COLUMNS = "id, name, acreage, tenure, rent_per_acre, geom";
