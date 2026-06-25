// Pure normalization for USDA NASS rows → grounded data points. No app imports
// so it can be unit-tested against live NASS output in isolation. The provider
// (nass.ts) handles fetching/caching; this handles shaping.

import type { ReportDataPoint, ReportType } from "./types";

export type NassRow = {
  short_desc?: string;
  Value?: string; // NASS capitalizes this field
  unit_desc?: string;
  year?: string | number;
  reference_period_desc?: string;
  load_time?: string;
};

export function parseValue(v: NassRow["Value"]): number | null {
  if (v == null) return null;
  const s = String(v).replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null; // "(D)", "(NA)", etc.
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function loadTimeToIso(s: string | undefined): string {
  if (!s) return "";
  const t = Date.parse(s.replace(" ", "T"));
  return Number.isFinite(t) ? new Date(t).toISOString() : s;
}

const TITLE = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();

/** "CORN - CONDITION, MEASURED IN PCT GOOD" → "Good"; yield/production → type. */
export function friendlyLabel(
  shortDesc: string,
  reportType: ReportType,
): string {
  if (reportType === "yield") return "Yield";
  if (reportType === "production") return "Production";
  const m = shortDesc.match(/MEASURED IN\s+(.*)$/i);
  let tail = m ? m[1] : shortDesc;
  tail = tail.replace(/^PCT\s+/i, "").replace(/\bPCT\b/gi, "").trim();
  return TITLE(tail) || shortDesc;
}

export function normalize(
  rows: NassRow[],
  reportType: ReportType,
): ReportDataPoint[] {
  // latest row per series (short_desc), by load_time
  const sorted = [...rows].sort((a, b) =>
    String(a.load_time ?? "").localeCompare(String(b.load_time ?? "")),
  );
  const latest = new Map<string, NassRow>();
  for (const r of sorted) if (r.short_desc) latest.set(r.short_desc, r); // last wins

  let points: ReportDataPoint[] = [...latest.values()].map((r) => ({
    shortDesc: r.short_desc ?? "",
    label: friendlyLabel(r.short_desc ?? "", reportType),
    value: parseValue(r.Value),
    unit: r.unit_desc ?? "",
    year: Number(r.year) || 0,
    period: r.reference_period_desc ?? "",
    asOf: loadTimeToIso(r.load_time),
  }));

  if (reportType === "condition") {
    const ge = points.filter((p) => /^(Good|Excellent)$/i.test(p.label));
    const good = ge.find((p) => /good/i.test(p.label));
    const exc = ge.find((p) => /excellent/i.test(p.label));
    const ordered = [good, exc].filter((p): p is ReportDataPoint => !!p);
    // derived Good + Excellent — the headline condition number
    if (good?.value != null && exc?.value != null) {
      ordered.push({
        shortDesc: `${good.shortDesc.split(" - ")[0]} - CONDITION, GOOD + EXCELLENT`,
        label: "Good + Excellent",
        value: Math.round((good.value + exc.value) * 10) / 10,
        unit: "PCT",
        year: good.year,
        period: good.period,
        asOf: good.asOf,
      });
    }
    points = ordered;
  } else if (reportType === "progress") {
    points = points
      .filter((p) => p.value != null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 8);
  } else if (reportType === "yield" || reportType === "production") {
    // grain only — NASS also returns corn SILAGE yield (TONS/ACRE), which is
    // noise for a grain-market corpus. Keep bushel-denominated series.
    const grain = points.filter((p) => /\bBU\b/i.test(p.unit));
    if (grain.length > 0) points = grain;
  }

  return points.slice(0, 12);
}
