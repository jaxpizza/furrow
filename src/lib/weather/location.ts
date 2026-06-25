import centroid from "@turf/centroid";
import type { Polygon } from "geojson";

import type { WeatherLocation } from "./types";

// Central Illinois — same default as the field map, used when a farm has no
// fields drawn yet.
const CENTRAL_IL = { lat: 40.116, lon: -88.243 };

export type WeatherField = { id: string; name: string; geom: Polygon };

function centroidOf(geom: Polygon): { lat: number; lon: number } {
  const c = centroid(geom).geometry.coordinates;
  return { lon: c[0], lat: c[1] };
}

export type FieldMarker = { id: string; name: string; lat: number; lon: number };

/** Centroid pin for each field — used to mark field locations on the radar. */
export function fieldMarkers(fields: WeatherField[]): FieldMarker[] {
  return fields.map((f) => ({ id: f.id, name: f.name, ...centroidOf(f.geom) }));
}

/**
 * Resolve the weather point for the current selection:
 *  - a specific field  → its polygon centroid
 *  - "all" / unset     → the average of all field centroids (farm average)
 *  - no fields at all  → central Illinois, flagged so the UI can prompt drawing
 */
export function resolveLocation(
  fields: WeatherField[],
  selected: string | null,
): WeatherLocation {
  if (fields.length === 0) {
    return {
      ...CENTRAL_IL,
      label: "Central Illinois",
      perField: false,
      fieldId: null,
      fieldCount: 0,
    };
  }

  const picked =
    selected && selected !== "all"
      ? fields.find((f) => f.id === selected)
      : undefined;

  if (picked) {
    return {
      ...centroidOf(picked.geom),
      label: picked.name,
      perField: true,
      fieldId: picked.id,
      fieldCount: fields.length,
    };
  }

  // farm average of field centroids
  const cs = fields.map((f) => centroidOf(f.geom));
  const lat = cs.reduce((s, c) => s + c.lat, 0) / cs.length;
  const lon = cs.reduce((s, c) => s + c.lon, 0) / cs.length;
  return {
    lat,
    lon,
    label: "All fields",
    perField: false,
    fieldId: null,
    fieldCount: fields.length,
  };
}
