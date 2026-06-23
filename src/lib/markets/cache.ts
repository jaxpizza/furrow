import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import type { Symbol } from "./types";

/**
 * Service-role client for the global market tables (RLS-enabled, no policies —
 * only the service role can touch them). Reads/writes are wrapped in try/catch
 * so a transient error degrades gracefully to the sample fallback.
 */
const marketDb = createServiceRoleClient;

export const QUOTE_TTL_MS = 15 * 60 * 1000; // match the 15-min delayed feed
export const HISTORY_TTL_MS = 6 * 60 * 60 * 1000;

export type QuoteRow = {
  symbol: string;
  price: number;
  currency: string;
  as_of: string;
  fetched_at: string;
  source: string;
};
export type HistoryRow = {
  symbol: string;
  points: { t: string; c: number }[];
  as_of: string;
  fetched_at: string;
  source: string;
};
export type OutlookRow = {
  crop: Crop;
  signal: string;
  summary: string;
  factors: { text: string; direction: string }[];
  model: string;
  generated_at: string;
};
export type BasisRow = {
  crop: Crop;
  basis_cents: number;
  elevator_name: string | null;
  updated_at: string;
};

export function isFresh(fetchedAt: string, ttlMs: number): boolean {
  return Date.now() - new Date(fetchedAt).getTime() < ttlMs;
}

// ── quote cache ─────────────────────────────────────────────────────────────
export async function readQuoteCache(symbol: Symbol): Promise<QuoteRow | null> {
  try {
    const { data } = await marketDb()
      .from("market_quote_cache")
      .select("*")
      .eq("symbol", symbol)
      .maybeSingle();
    return (data as QuoteRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function writeQuoteCache(row: QuoteRow): Promise<void> {
  try {
    await marketDb()
      .from("market_quote_cache")
      .upsert({ ...row, fetched_at: new Date().toISOString() });
  } catch {
    /* cache unavailable (migration not applied) — ignore */
  }
}

// ── history cache ───────────────────────────────────────────────────────────
export async function readHistoryCache(
  symbol: Symbol,
): Promise<HistoryRow | null> {
  try {
    const { data } = await marketDb()
      .from("market_history_cache")
      .select("*")
      .eq("symbol", symbol)
      .maybeSingle();
    return (data as unknown as HistoryRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function writeHistoryCache(row: HistoryRow): Promise<void> {
  try {
    await marketDb()
      .from("market_history_cache")
      .upsert({ ...row, fetched_at: new Date().toISOString() });
  } catch {
    /* ignore */
  }
}

// ── outlook cache ───────────────────────────────────────────────────────────
export async function readOutlookCache(crop: Crop): Promise<OutlookRow | null> {
  try {
    const { data } = await marketDb()
      .from("market_outlook_cache")
      .select("*")
      .eq("crop", crop)
      .maybeSingle();
    return (data as unknown as OutlookRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function writeOutlookCache(row: OutlookRow): Promise<void> {
  try {
    await marketDb().from("market_outlook_cache").upsert(row);
  } catch {
    /* ignore */
  }
}

// ── basis (read via service role for the cash provider) ─────────────────────
export async function readBasis(
  farmId: string,
  crop: Crop,
): Promise<BasisRow | null> {
  try {
    const { data } = await marketDb()
      .from("basis_entries")
      .select("crop, basis_cents, elevator_name, updated_at")
      .eq("farm_id", farmId)
      .eq("crop", crop)
      .maybeSingle();
    return (data as BasisRow | null) ?? null;
  } catch {
    return null;
  }
}
