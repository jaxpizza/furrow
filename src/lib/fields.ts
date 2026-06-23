import type { Polygon } from "geojson";

import type { Tenure } from "@/lib/types/database";

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
