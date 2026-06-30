import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import type { OutlookV2 } from "./synthesis";

/** The structured "what the engine saw" snapshot — enough to reconstruct the
 *  inputs to any generation. Built in assembleCorpus, stored on the telemetry row. */
export type BucketSnapshot = {
  present: boolean;
  freshness: string; // fresh | dated | absent | live | sample | n/a
  itemCount: number;
  items: unknown[]; // the framed data each bucket provided
};
export type TelemetryInput = {
  seasonal: { line: string; season: string; emphasis: { bucket: string; emphasis: string }[] };
  buckets: Record<string, BucketSnapshot>;
  gaps: Record<string, string[]>; // active data gaps per bucket
  failedSources: string[]; // buckets / sub-sources absent this run
};

/** Per-bucket driver/watched reasoning linkage — so we can later analyze
 *  "it saw X but didn't surface it" (the class of bug validation caught). */
export type TelemetryReasoning = {
  perBucket: { bucket: string; isDriver: boolean; lean: string; emphasis: string }[];
  drivers: string[]; // bucket labels promoted to factors
  watched: string[]; // bucket labels kept as context
  factorBuckets: string[]; // the source labels behind each main factor
};

export type TelemetryTrigger = "initial" | "new-corpus" | "max-age" | "forced";

export type TelemetryRecord = {
  crop: Crop;
  generatedAt: string;
  signal: string;
  trigger: TelemetryTrigger;
  corpusHash: string;
  model: string;
  latencyMs: number | null;
  sampleData: boolean;
  inputSnapshot: TelemetryInput;
  corpusText: string;
  output: OutlookV2;
  reasoning: TelemetryReasoning;
  gaps: Record<string, string[]>;
  failedSources: string[];
};

/** Derive the reasoning linkage from the generated read. */
export function buildReasoning(out: OutlookV2): TelemetryReasoning {
  const wc = out.watchedContext ?? [];
  return {
    perBucket: wc.map((w) => ({
      bucket: w.bucket,
      isDriver: w.isDriver,
      lean: w.lean,
      emphasis: w.emphasis,
    })),
    drivers: wc.filter((w) => w.isDriver).map((w) => w.bucket),
    watched: wc.filter((w) => !w.isDriver).map((w) => w.bucket),
    factorBuckets: out.factors.map((f) => f.source?.label ?? "(unsourced)"),
  };
}

/**
 * Durable, analyzable telemetry record — one per generation, IN ADDITION to the
 * market_outlook_v2 cache that serves farmers. Written with the service-role
 * client (RLS bypass; the table is admin-only-readable). Never throws — telemetry
 * must never break generation.
 */
export async function writeTelemetry(rec: TelemetryRecord): Promise<void> {
  try {
    const db = createServiceRoleClient();
    await db.from("outlook_telemetry").insert({
      crop: rec.crop,
      generated_at: rec.generatedAt,
      signal: rec.signal,
      trigger: rec.trigger,
      corpus_hash: rec.corpusHash,
      model: rec.model,
      latency_ms: rec.latencyMs,
      sample_data: rec.sampleData,
      input_snapshot: JSON.parse(JSON.stringify(rec.inputSnapshot)),
      corpus_text: rec.corpusText,
      output: JSON.parse(JSON.stringify(rec.output)),
      reasoning: JSON.parse(JSON.stringify(rec.reasoning)),
      gaps: JSON.parse(JSON.stringify(rec.gaps)),
      failed_sources: JSON.parse(JSON.stringify(rec.failedSources)),
    });
  } catch (e) {
    console.warn("[telemetry] write failed", e);
  }
}
