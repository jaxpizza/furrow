// Pure weather math — no IO. Shared by normals, actuals, and the dashboard.

// Canonical 365-slot calendar so any year (leap or not) aligns by ordinal.
// Feb 29 folds into the Feb 28 slot (ordinal 59) so 30 years line up.
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_OFFSET = MONTH_DAYS.reduce<number[]>((acc, d, i) => {
  acc.push((acc[i - 1] ?? 0) + (i === 0 ? 0 : MONTH_DAYS[i - 1]));
  return acc;
}, []);

/** 1-based ordinal (1..365) for a month (1-12) and day, leap-folded. */
export function ordinal(month: number, day: number): number {
  const d = month === 2 && day === 29 ? 28 : day;
  return MONTH_OFFSET[month - 1] + d;
}

export function ordinalOfDate(iso: string): number {
  const [, m, d] = iso.split("-").map(Number);
  return ordinal(m, d);
}

export const ORD_MAY1 = ordinal(5, 1);
export const ORD_JUL1 = ordinal(7, 1);
export const ORD_AUG1 = ordinal(8, 1);

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Inverse of `ordinal` → { month (1-12), day }. */
export function ordinalToMonthDay(ord: number): { month: number; day: number } {
  const o = Math.max(1, Math.min(365, Math.round(ord)));
  let m = 11;
  for (let i = 0; i < 12; i++) if (o > MONTH_OFFSET[i]) m = i;
  return { month: m + 1, day: o - MONTH_OFFSET[m] };
}

/** "Apr 22" style label from a canonical ordinal. */
export function formatOrdinal(ord: number): string {
  const { month, day } = ordinalToMonthDay(ord);
  return `${MONTH_ABBR[month - 1]} ${day}`;
}

/**
 * Modified growing degree day for corn: base 50°F, both bounds clamped to
 * [50, 86]°F before averaging (the standard corn / "Modified GDD" method).
 * Always ≥ 0.
 */
export function cornGdd(tmaxF: number, tminF: number): number {
  const hi = Math.min(Math.max(tmaxF, 50), 86);
  const lo = Math.min(Math.max(tminF, 50), 86);
  return Math.max(0, (hi + lo) / 2 - 50);
}

/** Round a coordinate to ~0.1° so nearby fields share a cache cell. */
export function cellKey(lat: number, lon: number): string {
  return `${lat.toFixed(1)},${lon.toFixed(1)}`;
}

/** Fraction (0-1) of `samples` strictly below `value` — an empirical percentile. */
export function percentileOf(value: number, samples: number[]): number {
  if (samples.length === 0) return 0.5;
  const below = samples.filter((s) => s < value).length;
  return below / samples.length;
}

export type RainSeverity =
  | "well_below"
  | "below"
  | "near"
  | "above"
  | "well_above";

/** Map a percentile (vs the 30-yr distribution) to a plain-language severity. */
export function rainSeverity(percentile: number): RainSeverity {
  if (percentile < 0.1) return "well_below";
  if (percentile < 0.33) return "below";
  if (percentile <= 0.67) return "near";
  if (percentile <= 0.9) return "above";
  return "well_above";
}

export const RAIN_SEVERITY_LABEL: Record<RainSeverity, string> = {
  well_below: "well below normal",
  below: "below normal",
  near: "near normal",
  above: "above normal",
  well_above: "well above normal",
};
