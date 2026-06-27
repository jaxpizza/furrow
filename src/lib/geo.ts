import area from "@turf/area";
import type { Feature, Polygon, Position } from "geojson";

/** PostGIS reads geometry back as GeoJSON but tags it with a CRS member; turf
 *  and Mapbox only need {type, coordinates}, so normalize when we read. */
export type LngLat = [number, number];

export const SQ_METERS_PER_ACRE = 4046.8564224;

/** Square meters (turf, on the WGS84 ellipsoid) → acres. */
export function acresFromPolygon(poly: Polygon | Feature<Polygon>): number {
  return area(poly) / SQ_METERS_PER_ACRE;
}

/**
 * GeoJSON Polygon → PostGIS EWKT, e.g. `SRID=4326;POLYGON((lng lat, …))`.
 * Inserting this string into a geometry(Polygon,4326) column works directly via
 * PostgREST (PostGIS provides the implicit text→geometry cast). Handles holes.
 */
export function polygonToEWKT(poly: Polygon): string {
  const ring = (r: Position[]) =>
    "(" + r.map(([lng, lat]) => `${lng} ${lat}`).join(",") + ")";
  return `SRID=4326;POLYGON(${poly.coordinates.map(ring).join(",")})`;
}

/** Tabular-friendly acreage, e.g. 1,240.5 — pair with the .tnum class. */
export function formatAcres(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Bounding box [minLng, minLat, maxLng, maxLat] of a polygon, for map fly-to. */
export function bboxOfPolygon(poly: Polygon): [number, number, number, number] {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const ring of poly.coordinates) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLng, minLat, maxLng, maxLat];
}

/** Union bounding box of several polygons (e.g. all of a farm's fields), or null
 *  when there are none. Used to fit the map to a farm's mapped acreage on load. */
export function bboxOfPolygons(
  polys: Polygon[],
): [number, number, number, number] | null {
  if (polys.length === 0) return null;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const p of polys) {
    const [a, b, c, d] = bboxOfPolygon(p);
    if (a < minLng) minLng = a;
    if (b < minLat) minLat = b;
    if (c > maxLng) maxLng = c;
    if (d > maxLat) maxLat = d;
  }
  return [minLng, minLat, maxLng, maxLat];
}
