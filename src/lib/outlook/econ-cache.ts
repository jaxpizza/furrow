import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import type {
  EconBundle,
  EconFrame,
  EconReportType,
  ReportCalendarEntry,
} from "./econ-types";

const db = createServiceRoleClient;

/** Write one framed bundle as a historical row (upsert on the release key). */
export async function writeEconBundle(b: EconBundle): Promise<boolean> {
  try {
    const { error } = await db()
      .from("usda_econ_cache")
      .upsert(
        {
          report_type: b.reportType,
          crop: b.crop,
          marketing_year: b.marketingYear,
          payload: JSON.parse(JSON.stringify(b.frames)),
          source_url: b.sourceUrl,
          released_at: b.releasedAt ?? new Date().toISOString(),
          // bump on every write so the staleness gate clears — otherwise an
          // unchanged release key leaves fetched_at at first-insert and the TTL
          // check stays "stale", re-fetching the source on every outlook gen.
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "report_type,crop,marketing_year,released_at" },
      );
    return !error;
  } catch {
    return false;
  }
}

/** The latest release per (report_type, crop) — what the surface/synthesis use. */
export async function readLatestEconBundles(): Promise<EconBundle[]> {
  try {
    const { data } = await db()
      .from("usda_econ_cache")
      .select("*")
      .order("released_at", { ascending: false });
    const seen = new Set<string>();
    const out: EconBundle[] = [];
    for (const r of (data as EconRow[] | null) ?? []) {
      const key = `${r.report_type}:${r.crop}`;
      if (seen.has(key)) continue; // first (newest) wins
      seen.add(key);
      out.push({
        reportType: r.report_type as EconReportType,
        crop: r.crop,
        marketingYear: r.marketing_year,
        releasedAt: r.released_at,
        sourceUrl: r.source_url ?? "",
        frames: Array.isArray(r.payload) ? (r.payload as EconFrame[]) : [],
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function econLastFetched(): Promise<number | null> {
  try {
    const { data } = await db()
      .from("usda_econ_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);
    const ts = data?.[0]?.fetched_at;
    return ts ? new Date(ts).getTime() : null;
  } catch {
    return null;
  }
}

export async function readReportCalendar(): Promise<ReportCalendarEntry[]> {
  try {
    const { data } = await db()
      .from("report_calendar")
      .select("*")
      .order("release_date", { ascending: true });
    return ((data as CalRow[] | null) ?? []).map((r) => ({
      reportType: r.report_type,
      releaseDate: r.release_date,
      description: r.description,
    }));
  } catch {
    return [];
  }
}

type EconRow = {
  report_type: string;
  crop: Crop;
  marketing_year: string;
  payload: unknown;
  source_url: string | null;
  released_at: string;
  fetched_at: string;
};
type CalRow = { report_type: string; release_date: string; description: string };
