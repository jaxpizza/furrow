import "server-only";

import { createClient } from "@/lib/supabase/server";

// Reads go through the RLS-enforced session client — a non-admin literally gets
// zero rows (the DB wall), on top of the UI requireAdmin() gate.

export type FeedRow = {
  id: string;
  crop: string;
  generated_at: string;
  signal: string;
  trigger: string;
  model: string;
  latency_ms: number | null;
  sample_data: boolean;
  gaps: Record<string, string[]> | null;
  failed_sources: string[] | null;
  reasoning: { drivers?: string[]; watched?: string[] } | null;
  annotation: { rating: string; notes: string | null } | null;
};

export type TelemetryFilters = {
  crop?: string;
  signal?: string;
  trigger?: string;
  limit?: number;
};

/** Recent generations for the feed — light columns only (no huge jsonb). */
export async function listTelemetry(f: TelemetryFilters = {}): Promise<FeedRow[]> {
  const db = await createClient();
  let q = db
    .from("outlook_telemetry")
    .select(
      "id, crop, generated_at, signal, trigger, model, latency_ms, sample_data, gaps, failed_sources, reasoning, telemetry_annotation(rating, notes, created_at)",
    )
    .order("generated_at", { ascending: false })
    .limit(f.limit ?? 100);
  if (f.crop) q = q.eq("crop", f.crop as "corn" | "soybean");
  if (f.signal) q = q.eq("signal", f.signal);
  if (f.trigger) q = q.eq("trigger", f.trigger);
  const { data } = await q;
  return (data ?? []).map((r) => {
    const anns = (r.telemetry_annotation ?? []) as {
      rating: string;
      notes: string | null;
      created_at: string;
    }[];
    const latest = anns.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return {
      id: r.id,
      crop: r.crop,
      generated_at: r.generated_at,
      signal: r.signal,
      trigger: r.trigger,
      model: r.model,
      latency_ms: r.latency_ms,
      sample_data: r.sample_data,
      gaps: r.gaps as FeedRow["gaps"],
      failed_sources: r.failed_sources as string[] | null,
      reasoning: r.reasoning as FeedRow["reasoning"],
      annotation: latest ? { rating: latest.rating, notes: latest.notes } : null,
    };
  });
}

export type TelemetryDetail = {
  id: string;
  crop: string;
  generated_at: string;
  signal: string;
  trigger: string;
  model: string;
  latency_ms: number | null;
  sample_data: boolean;
  corpus_hash: string;
  input_snapshot: unknown;
  corpus_text: string | null;
  output: unknown;
  reasoning: unknown;
  gaps: unknown;
  failed_sources: string[] | null;
  annotations: { id: string; rating: string; notes: string | null; created_at: string }[];
};

export async function getTelemetry(id: string): Promise<TelemetryDetail | null> {
  const db = await createClient();
  const { data } = await db
    .from("outlook_telemetry")
    .select(
      "*, telemetry_annotation(id, rating, notes, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const anns = ((data.telemetry_annotation ?? []) as TelemetryDetail["annotations"]).sort(
    (a, b) => b.created_at.localeCompare(a.created_at),
  );
  return {
    id: data.id,
    crop: data.crop,
    generated_at: data.generated_at,
    signal: data.signal,
    trigger: data.trigger,
    model: data.model,
    latency_ms: data.latency_ms,
    sample_data: data.sample_data,
    corpus_hash: data.corpus_hash,
    input_snapshot: data.input_snapshot,
    corpus_text: data.corpus_text,
    output: data.output,
    reasoning: data.reasoning,
    gaps: data.gaps,
    failed_sources: data.failed_sources as string[] | null,
    annotations: anns,
  };
}

export type Aggregates = {
  total: number;
  windowFrom: string | null;
  signalByCrop: Record<string, Record<string, number>>; // crop → signal → count
  driverFreq: Record<string, number>; // bucket → times a driver
  watchedFreq: Record<string, number>; // bucket → times watched
  gapFreq: Record<string, number>; // "bucket: sub" → count
  failedSourceFreq: Record<string, number>;
  latency: { avg: number | null; p50: number | null; max: number | null };
  triggerCounts: Record<string, number>;
};

/** Aggregate views over a recent window (default 300 generations). */
export async function telemetryAggregates(windowSize = 300): Promise<Aggregates> {
  const db = await createClient();
  const { data } = await db
    .from("outlook_telemetry")
    .select("crop, signal, trigger, generated_at, latency_ms, reasoning, gaps, failed_sources")
    .order("generated_at", { ascending: false })
    .limit(windowSize);
  const rows = data ?? [];
  const signalByCrop: Aggregates["signalByCrop"] = {};
  const driverFreq: Record<string, number> = {};
  const watchedFreq: Record<string, number> = {};
  const gapFreq: Record<string, number> = {};
  const failedSourceFreq: Record<string, number> = {};
  const triggerCounts: Record<string, number> = {};
  const lat: number[] = [];
  for (const r of rows) {
    (signalByCrop[r.crop] ??= {})[r.signal] = (signalByCrop[r.crop]?.[r.signal] ?? 0) + 1;
    triggerCounts[r.trigger] = (triggerCounts[r.trigger] ?? 0) + 1;
    if (r.latency_ms != null) lat.push(r.latency_ms);
    const reasoning = r.reasoning as { drivers?: string[]; watched?: string[] } | null;
    for (const b of reasoning?.drivers ?? []) driverFreq[b] = (driverFreq[b] ?? 0) + 1;
    for (const b of reasoning?.watched ?? []) watchedFreq[b] = (watchedFreq[b] ?? 0) + 1;
    const gaps = r.gaps as Record<string, string[]> | null;
    for (const [bucket, list] of Object.entries(gaps ?? {}))
      for (const g of list) gapFreq[`${bucket}: ${g}`] = (gapFreq[`${bucket}: ${g}`] ?? 0) + 1;
    for (const s of (r.failed_sources as string[] | null) ?? [])
      failedSourceFreq[s] = (failedSourceFreq[s] ?? 0) + 1;
  }
  lat.sort((a, b) => a - b);
  return {
    total: rows.length,
    windowFrom: rows.length ? rows[rows.length - 1].generated_at : null,
    signalByCrop,
    driverFreq,
    watchedFreq,
    gapFreq,
    failedSourceFreq,
    latency: {
      avg: lat.length ? Math.round(lat.reduce((s, v) => s + v, 0) / lat.length) : null,
      p50: lat.length ? lat[Math.floor(lat.length / 2)] : null,
      max: lat.length ? lat[lat.length - 1] : null,
    },
    triggerCounts,
  };
}
