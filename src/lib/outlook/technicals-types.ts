import type { Crop } from "@/lib/types/database";

/**
 * Technicals bucket (Phase E). Computed from the futures price HISTORY we already
 * pull. Technicals describe what CHART-DRIVEN traders act on — NOT a price
 * prediction. Support/resistance matter because traders watch them (self-
 * fulfilling), not because the chart foretells the future. Generally a
 * SECONDARY/tertiary signal vs fundamentals. When computed on sample/limited
 * data, they are explicitly low-confidence.
 */
export type MovingAverage = {
  period: number; // 20 / 50 / 200
  value: number;
  above: boolean; // price above this MA?
  priceVsPct: number; // (price − ma) / ma × 100
};

export type PriceLevel = {
  value: number;
  distancePct: number; // |price − level| / price × 100
  windowLabel: string; // "3-month"
};

export type TechnicalsBundle = {
  crop: Crop;
  asOf: string | null;
  basedOnSample: boolean; // true → low-confidence, not live
  source: string;
  pointCount: number;

  price: number;
  support: PriceLevel | null; // nearest significant low below price
  resistance: PriceLevel | null; // nearest significant high above price
  high52: number;
  low52: number;

  movingAverages: MovingAverage[];
  trend: "uptrend" | "downtrend" | "sideways";
  trendDetail: string; // e.g. "+4.1% over ~1M; price above 50-day"

  rsi: number | null; // RSI-14
  momentumLabel: string; // "overbought (>70)" / "oversold (<30)" / "neutral"

  rangePercentile: number; // where price sits in its trailing range (0–100)
  rangeWindowDays: number;

  /** true when price is within ~1.5% of the nearest level — "testing" it. */
  atKeyLevel: "resistance" | "support" | null;
};

export type { Crop };
