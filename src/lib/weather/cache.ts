import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database.gen";

/**
 * Service-role client for the global weather caches (RLS-enabled, no policies —
 * only the service role can touch them). Reads/writes are wrapped in try/catch
 * so a transient error degrades gracefully to a live re-fetch. Payloads are
 * stored as jsonb, so reads narrow `Json` to the caller's type.
 */
const weatherDb = createServiceRoleClient;

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
    return { payload: data.payload as unknown as T, ts: data.fetched_at as string };
  } catch {
    return null;
  }
}

export async function writeForecastCache(key: string, payload: unknown) {
  try {
    await weatherDb()
      .from("weather_forecast_cache")
      .upsert({
        cell_key: key,
        payload: payload as Json,
        fetched_at: new Date().toISOString(),
      });
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
    return { payload: data.payload as unknown as T, ts: data.computed_at as string };
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
        payload: payload as Json,
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
    return { payload: data.payload as unknown as T, ts: data.fetched_at as string };
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
        payload: payload as Json,
        fetched_at: new Date().toISOString(),
      });
  } catch {
    /* ignore */
  }
}
