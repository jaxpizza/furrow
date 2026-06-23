/**
 * Placeholder visuals for Phase 1. Clearly fake, deterministic (no Math.random)
 * so the layout reads as real without implying live data. Replaced by real
 * market/weather feeds in later phases.
 */
import type { PricePoint } from "@/components/dashboard/price-chart";

// A gently trending corn cash-price series (~30 sessions).
export const CORN_PRICE_SERIES: PricePoint[] = [
  4.18, 4.21, 4.17, 4.24, 4.29, 4.27, 4.33, 4.31, 4.38, 4.42, 4.39, 4.46, 4.44,
  4.51, 4.49, 4.55, 4.6, 4.57, 4.63, 4.61, 4.58, 4.64, 4.69, 4.66, 4.72, 4.7,
  4.75, 4.73, 4.78, 4.81,
].map((value, i) => ({ label: `D${i + 1}`, value }));

export const SOY_PRICE_SERIES: PricePoint[] = [
  11.4, 11.36, 11.42, 11.38, 11.31, 11.35, 11.28, 11.33, 11.25, 11.2, 11.27,
  11.19, 11.23, 11.16, 11.21, 11.14, 11.18, 11.12, 11.17, 11.22,
].map((value, i) => ({ label: `D${i + 1}`, value }));

export const MOCK_WEATHER = {
  location: "Champaign, IL",
  tempF: 78,
  condition: "Partly cloudy",
  highF: 84,
  lowF: 61,
  precipChance: 20,
  windMph: 9,
  gddToday: 24,
};

export const MOCK_FIELDS_SUMMARY = {
  fieldCount: 14,
  totalAcres: 4980,
  cornAcres: 2740,
  soyAcres: 2240,
};

export const MOCK_NEWS = [
  {
    source: "USDA WASDE",
    time: "2h",
    headline: "Corn ending stocks trimmed on stronger export pace",
    tone: "pos" as const,
  },
  {
    source: "Reuters",
    time: "5h",
    headline: "Soybean basis firms across central Illinois elevators",
    tone: "pos" as const,
  },
  {
    source: "DTN",
    time: "1d",
    headline: "Forecast turns drier for the eastern Corn Belt next week",
    tone: "neutral" as const,
  },
  {
    source: "Bloomberg",
    time: "1d",
    headline: "Diesel input costs ease as crude slips below range",
    tone: "neg" as const,
  },
];
