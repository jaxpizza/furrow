import type { RainSeverity } from "./calc";

export type WeatherLocation = {
  lat: number;
  lon: number;
  label: string;
  /** true when derived from a field polygon; false for the farm/IL fallback */
  perField: boolean;
  fieldId: string | null;
  fieldCount: number;
};

export type CurrentConditions = {
  tempF: number;
  feelsF: number;
  humidity: number;
  windMph: number;
  windDir: number;
  precipIn: number;
  weatherCode: number;
  asOf: string;
};

export type RainPoint = {
  ord: number;
  /** cumulative inches this year (null for dates not yet reached) */
  actual: number | null;
  /** cumulative inches, 1991-2020 normal */
  normal: number;
};

export type RainfallRead = {
  ytdIn: number;
  normalIn: number;
  deltaIn: number; // actual − normal (negative = deficit)
  percentile: number; // 0-1 vs the 30-yr distribution
  severity: RainSeverity;
  headline: string; // e.g. "3.2 in below normal — abnormally dry"
  series: RainPoint[];
};

export type GddRead = {
  accumulated: number;
  normal: number;
  delta: number; // accumulated − normal
  seasonStart: string; // "May 1"
  aheadBehind: "ahead" | "behind" | "on track";
};

export type SoilRead = {
  tempF: number;
  depthLabel: string; // "6 cm (~2.4 in)"
  trend: "rising" | "falling" | "steady";
  changeF: number; // vs ~5 days ago
  // plant-timing read for corn (~50°F threshold), informational only
  timing: {
    state: "below" | "approaching" | "at_window" | "above";
    text: string;
  };
};

export type ForecastDay = {
  date: string;
  weekday: string;
  tmaxF: number;
  tminF: number;
  precipIn: number;
  precipProb: number;
  windMaxMph: number;
  weatherCode: number;
};

export type HourPoint = {
  iso: string;
  hourLabel: string;
  tempF: number;
  precipProb: number;
  weatherCode: number;
};

export type FieldworkWindow = {
  startDate: string;
  endDate: string;
  days: number;
  label: string; // "3 dry days Thu–Sat"
} | null;

export type StressFlag = {
  kind: "heat" | "freeze" | "heavy_rain";
  severity: "watch" | "alert";
  text: string;
};

export type WeatherDashboard = {
  location: WeatherLocation;
  current: CurrentConditions | null;
  rainfall: RainfallRead | null;
  gdd: GddRead | null;
  soil: SoilRead | null;
  daily: ForecastDay[];
  hourly: HourPoint[];
  fieldwork: FieldworkWindow;
  stress: StressFlag[];
  /** true when we're serving cached/degraded data because a fetch failed */
  degraded: boolean;
};
