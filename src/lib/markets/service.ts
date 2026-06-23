import "server-only";

import {
  HISTORY_TTL_MS,
  isFresh,
  QUOTE_TTL_MS,
  readHistoryCache,
  readQuoteCache,
  writeHistoryCache,
  writeQuoteCache,
} from "./cache";
import { ApiNinjasPriceProvider } from "./providers/api-ninjas";
import { sampleHistory, sampleQuote } from "./sample";
import type { History, PriceProvider, Quote, Symbol } from "./types";

// The active futures provider. Swap this one line to change vendors.
const provider: PriceProvider = new ApiNinjasPriceProvider();

/**
 * Cached futures quote. Tries cache (fresh < 15 min) → live provider → last
 * cached value (marked stale) → deterministic sample. Never throws, never
 * blank: honors the rotating free tier by serving the last-known value with its
 * timestamp.
 */
// The day-change isn't in the quote cache table, so remember the last live
// change per symbol in-process. This keeps the delta consistent (the real
// feed's change) on cache-hits within the 15-min window, instead of flipping to
// a history-derived value.
const changeMem = new Map<
  Symbol,
  { change?: number; changePercent?: number }
>();

export async function getFuturesQuote(
  symbol: Symbol,
  now: Date,
): Promise<Quote> {
  const cached = await readQuoteCache(symbol);
  if (cached && isFresh(cached.fetched_at, QUOTE_TTL_MS)) {
    return {
      symbol,
      price: cached.price,
      currency: cached.currency,
      ...changeMem.get(symbol),
      asOf: cached.as_of,
      stale: false,
      source: cached.source,
    };
  }

  const live = await provider.getQuote(symbol);
  if (live) {
    await writeQuoteCache({
      symbol,
      price: live.price,
      currency: live.currency,
      as_of: live.asOf,
      fetched_at: now.toISOString(),
      source: live.source,
    });
    changeMem.set(symbol, {
      change: live.change,
      changePercent: live.changePercent,
    });
    return live;
  }

  if (cached) {
    return {
      symbol,
      price: cached.price,
      currency: cached.currency,
      ...changeMem.get(symbol),
      asOf: cached.as_of,
      stale: true, // serving last-known because the live fetch was unavailable
      source: cached.source,
    };
  }

  return sampleQuote(symbol, now);
}

/** Cached 1-year daily history (sliced for ranges client-side). Same fallback
 *  ladder as the quote. */
export async function getFuturesHistory(
  symbol: Symbol,
  now: Date,
): Promise<History> {
  const cached = await readHistoryCache(symbol);
  if (cached && isFresh(cached.fetched_at, HISTORY_TTL_MS)) {
    return {
      symbol,
      points: cached.points.map((p) => ({ time: p.t, value: p.c })),
      asOf: cached.as_of,
      stale: false,
      source: cached.source,
    };
  }

  const live = await provider.getHistory(symbol, "daily", "1Y");
  if (live && live.points.length > 0) {
    await writeHistoryCache({
      symbol,
      points: live.points.map((p) => ({ t: p.time, c: p.value })),
      as_of: live.asOf,
      fetched_at: now.toISOString(),
      source: live.source,
    });
    return live;
  }

  if (cached) {
    return {
      symbol,
      points: cached.points.map((p) => ({ time: p.t, value: p.c })),
      asOf: cached.as_of,
      stale: true,
      source: cached.source,
    };
  }

  return sampleHistory(symbol, now);
}

/** Day-over-day change derived from history (the quote feed has no change
 *  field). Colorblind-safe direction is paired with a caret in the UI. */
export function deltaFromHistory(history: History): {
  change: number;
  pct: number;
  direction: "up" | "down" | "flat";
} {
  const pts = history.points;
  if (pts.length < 2) return { change: 0, pct: 0, direction: "flat" };
  const latest = pts[pts.length - 1].value;
  const prior = pts[pts.length - 2].value;
  const change = latest - prior;
  const pct = prior !== 0 ? (change / prior) * 100 : 0;
  const direction = change > 0.0001 ? "up" : change < -0.0001 ? "down" : "flat";
  return { change, pct, direction };
}
