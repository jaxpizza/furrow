import type { History } from "@/lib/markets/types";
import type { Crop } from "@/lib/types/database";

import type {
  MovingAverage,
  PriceLevel,
  TechnicalsBundle,
} from "./technicals-types";

const MA_PERIODS = [20, 50, 200];
const RANGE_WINDOW = 63; // ~3 trading months
const RSI_PERIOD = 14;
const AT_LEVEL_PCT = 1.5; // within 1.5% → "testing" the level

/**
 * Compute framed technicals from a daily close series. Pure — no IO. Carries the
 * source/sample flag through so the caller can label low-confidence reads.
 */
export function computeTechnicals(
  crop: Crop,
  history: History,
): TechnicalsBundle | null {
  const closes = history.points.map((p) => p.value).filter(Number.isFinite);
  const n = closes.length;
  if (n < 20) return null; // not enough to say anything

  const price = closes[n - 1];
  const basedOnSample = history.source === "sample";

  // moving averages
  const movingAverages: MovingAverage[] = [];
  for (const period of MA_PERIODS) {
    if (n < period) continue;
    const value = round(mean(closes.slice(n - period)), 4);
    movingAverages.push({
      period,
      value,
      above: price >= value,
      priceVsPct: round(((price - value) / value) * 100, 1),
    });
  }

  // support / resistance over the trailing ~3M window
  const win = closes.slice(Math.max(0, n - RANGE_WINDOW));
  const winHigh = Math.max(...win);
  const winLow = Math.min(...win);
  const resistance: PriceLevel | null =
    winHigh > price
      ? { value: round(winHigh, 4), distancePct: round(((winHigh - price) / price) * 100, 1), windowLabel: "3-month" }
      : null;
  const support: PriceLevel | null =
    winLow < price
      ? { value: round(winLow, 4), distancePct: round(((price - winLow) / price) * 100, 1), windowLabel: "3-month" }
      : null;

  const atKeyLevel: TechnicalsBundle["atKeyLevel"] =
    resistance && resistance.distancePct <= AT_LEVEL_PCT
      ? "resistance"
      : support && support.distancePct <= AT_LEVEL_PCT
        ? "support"
        : null;

  // 52-week (full-series) extremes
  const high52 = round(Math.max(...closes), 4);
  const low52 = round(Math.min(...closes), 4);

  // trend — MA stack + 1-month change
  const ma20 = movingAverages.find((m) => m.period === 20)?.value ?? null;
  const ma50 = movingAverages.find((m) => m.period === 50)?.value ?? null;
  const chg1m = n > 21 ? ((price - closes[n - 22]) / closes[n - 22]) * 100 : 0;
  let trend: TechnicalsBundle["trend"] = "sideways";
  if (ma50 != null) {
    if (price > ma50 && (ma20 == null || ma20 >= ma50) && chg1m > 1) trend = "uptrend";
    else if (price < ma50 && (ma20 == null || ma20 <= ma50) && chg1m < -1) trend = "downtrend";
  }
  const trendDetail =
    `${signed(round(chg1m, 1))}% over ~1M` +
    (ma50 != null ? `; price ${price >= ma50 ? "above" : "below"} 50-day` : "");

  // momentum — RSI(14)
  const rsi = computeRsi(closes, RSI_PERIOD);
  const momentumLabel =
    rsi == null
      ? "n/a"
      : rsi >= 70
        ? `overbought (RSI ${Math.round(rsi)})`
        : rsi <= 30
          ? `oversold (RSI ${Math.round(rsi)})`
          : `neutral (RSI ${Math.round(rsi)})`;

  // percentile of recent range
  const rangePercentile =
    winHigh > winLow ? round(((price - winLow) / (winHigh - winLow)) * 100, 0) : 50;

  return {
    crop,
    asOf: history.asOf ?? null,
    basedOnSample,
    source: history.source,
    pointCount: n,
    price: round(price, 4),
    support,
    resistance,
    high52,
    low52,
    movingAverages,
    trend,
    trendDetail,
    rsi: rsi != null ? round(rsi, 1) : null,
    momentumLabel,
    rangePercentile,
    rangeWindowDays: win.length,
    atKeyLevel,
  };
}

/**
 * Wilder's RSI over `period` — the standard charting platforms use, so it matches
 * what chart traders actually see. Seeds the average over the first `period`
 * changes, then smooths exponentially across ALL remaining bars (NOT a simple
 * average of only the last `period`, which would diverge from every trading tool).
 */
function computeRsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  // seed: simple average of the first `period` changes
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) gain += ch;
    else loss -= ch;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  // Wilder smoothing across the rest of the series
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const up = ch >= 0 ? ch : 0;
    const down = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + up) / period;
    avgLoss = (avgLoss * (period - 1) + down) / period;
  }
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function mean(a: number[]): number {
  return a.reduce((s, v) => s + v, 0) / a.length;
}
function round(n: number, p: number): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}
function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
