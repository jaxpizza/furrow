import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import type { CotBundle } from "./cot-types";

const db = createServiceRoleClient;

export async function writeCotBundle(b: CotBundle): Promise<boolean> {
  try {
    const { crop, reportDate, releasedAt, sourceUrl, ...frames } = b;
    const { error } = await db()
      .from("cot_cache")
      .upsert(
        {
          crop,
          report_date: reportDate,
          payload: JSON.parse(JSON.stringify(frames)),
          source_url: sourceUrl,
          released_at: releasedAt,
          fetched_at: new Date().toISOString(), // bump so the staleness gate clears
        },
        { onConflict: "crop,report_date" },
      );
    return !error;
  } catch {
    return false;
  }
}

/** Latest weekly COT reading per crop. */
export async function readLatestCotBundles(): Promise<CotBundle[]> {
  try {
    const { data } = await db()
      .from("cot_cache")
      .select("*")
      .order("report_date", { ascending: false });
    const seen = new Set<string>();
    const out: CotBundle[] = [];
    for (const r of (data as CotRow[] | null) ?? []) {
      if (seen.has(r.crop)) continue;
      seen.add(r.crop);
      const f = (r.payload ?? {}) as Record<string, unknown>;
      out.push({
        crop: r.crop,
        reportDate: r.report_date,
        releasedAt: r.released_at,
        sourceUrl: r.source_url ?? "",
        long: numOr(f.long),
        short: numOr(f.short),
        net: numOr(f.net),
        openInterest: f.openInterest == null ? null : numOr(f.openInterest),
        deltaPriorNet: f.deltaPriorNet == null ? null : numOr(f.deltaPriorNet),
        trendNet4w: f.trendNet4w == null ? null : numOr(f.trendNet4w),
        percentile: numOr(f.percentile),
        histLow: numOr(f.histLow),
        histHigh: numOr(f.histHigh),
        historyWeeks: numOr(f.historyWeeks),
        extreme: (f.extreme as CotBundle["extreme"]) ?? null,
        positioning: (f.positioning as CotBundle["positioning"]) ?? "net long",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function cotLastFetched(): Promise<number | null> {
  try {
    const { data } = await db()
      .from("cot_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);
    const ts = data?.[0]?.fetched_at;
    return ts ? new Date(ts).getTime() : null;
  } catch {
    return null;
  }
}

function numOr(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type CotRow = {
  crop: Crop;
  report_date: string;
  payload: unknown;
  source_url: string | null;
  released_at: string | null;
  fetched_at: string;
};
