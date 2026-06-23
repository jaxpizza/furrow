import type { History, PricePoint, Quote, Symbol } from "./types";

/**
 * Deterministic SAMPLE market data — used only as a clearly-labeled fallback
 * when no live feed (API_NINJAS_KEY) and no cached data are available, so the
 * Markets UI is never blank. Always tagged `source: "sample"` so the UI badges
 * it honestly and never passes it off as live. Replaced the instant real data
 * exists. No Math.random / Date.now here (deterministic by construction).
 */

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ~1 year of business-day closes ending at `end`, trending start→finish with a
// deterministic index-driven wiggle. Oldest → newest.
function sampleSeries(
  end: Date,
  startPrice: number,
  endPrice: number,
  amplitude: number,
): PricePoint[] {
  const N = 252; // trading days in a year
  const pts: PricePoint[] = [];
  const cursor = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  // walk back N business days, collecting dates
  const dates: Date[] = [];
  while (dates.length < N) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  dates.reverse();
  dates.forEach((d, i) => {
    const t = i / (N - 1);
    const trend = startPrice + (endPrice - startPrice) * t;
    // Multiple frequencies incl. a fast term so adjacent days differ (a flat
    // day-over-day delta would read like a bug).
    const wiggle =
      amplitude *
      (Math.sin(i / 6.3) * 0.5 +
        Math.sin(i / 19) * 0.3 +
        Math.sin(i * 0.7) * 0.22);
    pts.push({ time: isoDate(d), value: Math.round((trend + wiggle) * 100) / 100 });
  });
  return pts;
}

export function sampleHistory(symbol: Symbol, now: Date): History {
  const points =
    symbol === "corn"
      ? sampleSeries(now, 4.18, 4.83, 0.12)
      : sampleSeries(now, 11.55, 11.18, 0.22);
  return {
    symbol,
    points,
    asOf: now.toISOString(),
    stale: false,
    source: "sample",
  };
}

export function sampleQuote(symbol: Symbol, now: Date): Quote {
  const h = sampleHistory(symbol, now);
  const last = h.points[h.points.length - 1].value;
  return {
    symbol,
    price: last,
    currency: "USD",
    asOf: now.toISOString(),
    stale: false,
    source: "sample",
  };
}

/** A plausible sample basis (cents vs futures) per symbol, for the cash
 *  breakdown before the farmer sets their own. */
export const SAMPLE_BASIS_CENTS: Record<Symbol, number> = {
  corn: -22,
  soybean: -38,
};
