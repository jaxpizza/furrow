import "server-only";

import { createServerClient } from "@supabase/ssr";

/**
 * Untyped service-role client for the weather caches added in 0004 (the
 * generated types predate that migration). Once `npm run db:types` is re-run
 * post-0004, swap this for the typed `createServiceRoleClient()` and drop the
 * row casts below — same pattern as the market caches. Everything is wrapped in
 * try/catch so the app degrades gracefully if 0004 hasn't been applied.
 */
function weatherDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export const FORECAST_TTL_MS = 8 * 60 * 60 * 1000; // ~3x/day
export const ACTUALS_TTL_MS = 12 * 60 * 60 * 1000; // daily
export const NORMALS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ~monthly (rarely changes)

export function isFresh(ts: string, ttlMs: number): boolean {
  return Date.now() - new Date(ts).getTime() < ttlMs;
}

type CacheHit<T> = { payload: T; ts: string } | null;

export async function readForecastCache<T>(key: string): Promise<CacheHit<T>> {
  try {
    const { data } = await weatherDb()
      .from("weather_forecast_cache")
      .select("payload, fetched_at")
      .eq("cell_key", key)
      .maybeSingle();
    if (!data) return null;
    return { payload: data.payload as T, ts: data.fetched_at as string };
  } catch {
    return null;
  }
}

export async function writeForecastCache(key: string, payload: unknown) {
  try {
    await weatherDb()
      .from("weather_forecast_cache")
      .upsert({ cell_key: key, payload, fetched_at: new Date().toISOString() });
  } catch {
    /* cache unavailable — ignore */
  }
}

export async function readNormalsCache<T>(key: string): Promise<CacheHit<T>> {
  try {
    const { data } = await weatherDb()
      .from("weather_normals_cache")
      .select("payload, computed_at")
      .eq("cell_key", key)
      .maybeSingle();
    if (!data) return null;
    return { payload: data.payload as T, ts: data.computed_at as string };
  } catch {
    return null;
  }
}

export async function writeNormalsCache(key: string, payload: unknown) {
  try {
    await weatherDb()
      .from("weather_normals_cache")
      .upsert({
        cell_key: key,
        payload,
        computed_at: new Date().toISOString(),
      });
  } catch {
    /* ignore */
  }
}

export async function readActualsCache<T>(
  key: string,
  year: number,
): Promise<CacheHit<T>> {
  try {
    const { data } = await weatherDb()
      .from("weather_actuals_cache")
      .select("payload, fetched_at")
      .eq("cell_key", key)
      .eq("year", year)
      .maybeSingle();
    if (!data) return null;
    return { payload: data.payload as T, ts: data.fetched_at as string };
  } catch {
    return null;
  }
}

export async function writeActualsCache(
  key: string,
  year: number,
  payload: unknown,
) {
  try {
    await weatherDb()
      .from("weather_actuals_cache")
      .upsert({
        cell_key: key,
        year,
        payload,
        fetched_at: new Date().toISOString(),
      });
  } catch {
    /* ignore */
  }
}
