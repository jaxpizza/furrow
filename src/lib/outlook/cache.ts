import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import type {
  Geography,
  NewsItem,
  ReportBundle,
  ReportDataPoint,
  ReportType,
} from "./types";

// Service-role client for the global outlook caches (RLS on, no policies). All
// access is wrapped so a missing migration or transient error degrades to empty
// rather than throwing — same posture as the market/weather caches.
const db = createServiceRoleClient;

// ── news ─────────────────────────────────────────────────────────────────────
export async function writeNewsItems(items: NewsItem[]): Promise<number> {
  if (items.length === 0) return 0;
  try {
    const rows = items.map((i) => ({
      link: i.link,
      source: i.source,
      title: i.title,
      summary: i.summary,
      published_at: i.publishedAt,
      crop_tags: i.cropTags,
      fetched_at: i.fetchedAt,
    }));
    const { error } = await db()
      .from("news_items_cache")
      .upsert(rows, { onConflict: "link" });
    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}

export async function readNewsItems(limit = 60): Promise<NewsItem[]> {
  try {
    const { data } = await db()
      .from("news_items_cache")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    return ((data as NewsRow[] | null) ?? []).map((r) => ({
      link: r.link,
      source: r.source,
      title: r.title,
      summary: r.summary,
      publishedAt: r.published_at,
      cropTags: Array.isArray(r.crop_tags) ? (r.crop_tags as string[]) : [],
      fetchedAt: r.fetched_at,
    }));
  } catch {
    return [];
  }
}

export async function newsLastFetched(): Promise<number | null> {
  try {
    const { data } = await db()
      .from("news_items_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);
    const ts = data?.[0]?.fetched_at;
    return ts ? new Date(ts).getTime() : null;
  } catch {
    return null;
  }
}

// ── USDA reports ─────────────────────────────────────────────────────────────
export async function writeReportBundle(b: ReportBundle): Promise<boolean> {
  try {
    const { error } = await db()
      .from("usda_reports_cache")
      .upsert(
        {
          report_type: b.reportType,
          crop: b.crop,
          geography: b.geography,
          period: b.period,
          // round-trip to a plain Json value for the jsonb column
          payload: JSON.parse(JSON.stringify(b.points)),
          source_url: b.sourceUrl,
          fetched_at: b.fetchedAt,
        },
        { onConflict: "report_type,crop,geography,period" },
      );
    return !error;
  } catch {
    return false;
  }
}

export async function readReportBundles(): Promise<ReportBundle[]> {
  try {
    const { data } = await db().from("usda_reports_cache").select("*");
    return ((data as ReportRow[] | null) ?? []).map((r) => ({
      reportType: r.report_type as ReportType,
      crop: r.crop,
      geography: r.geography as Geography,
      period: r.period,
      sourceUrl: r.source_url ?? "",
      fetchedAt: r.fetched_at,
      points: Array.isArray(r.payload) ? (r.payload as ReportDataPoint[]) : [],
    }));
  } catch {
    return [];
  }
}

export async function reportsLastFetched(): Promise<number | null> {
  try {
    const { data } = await db()
      .from("usda_reports_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);
    const ts = data?.[0]?.fetched_at;
    return ts ? new Date(ts).getTime() : null;
  } catch {
    return null;
  }
}

// ── synthesized outlook (Stage 2) ────────────────────────────────────────────
export type OutlookV2Row = {
  crop: Crop;
  corpus_hash: string;
  payload: unknown;
  model: string;
  generated_at: string;
};

export async function readLatestOutlookV2(
  crop: Crop,
): Promise<OutlookV2Row | null> {
  try {
    const { data } = await db()
      .from("market_outlook_v2")
      .select("crop, corpus_hash, payload, model, generated_at")
      .eq("crop", crop)
      .order("generated_at", { ascending: false })
      .limit(1);
    return (data?.[0] as OutlookV2Row | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function writeOutlookV2(
  crop: Crop,
  corpusHash: string,
  payload: unknown,
  model: string,
  generatedAt: string,
): Promise<boolean> {
  try {
    const { error } = await db()
      .from("market_outlook_v2")
      .upsert(
        {
          crop,
          corpus_hash: corpusHash,
          payload: JSON.parse(JSON.stringify(payload)),
          model,
          generated_at: generatedAt,
        },
        { onConflict: "crop,corpus_hash" },
      );
    return !error;
  } catch {
    return false;
  }
}

type NewsRow = {
  link: string;
  source: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  crop_tags: unknown;
  fetched_at: string;
};
type ReportRow = {
  report_type: string;
  crop: Crop;
  geography: string;
  period: string;
  payload: unknown;
  source_url: string | null;
  fetched_at: string;
};
