import { NextResponse } from "next/server";

import { tagUntaggedNews } from "@/lib/news/tagging";
import { getMarketOutlook } from "@/lib/outlook/synthesis";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

// Background heartbeat: warms the market read for both crops on a schedule so the
// engine stays current WITHOUT requiring a page visit. getMarketOutlook runs the
// normal TTL-gated bucket refreshes (econ/demand/cot/macro/news/conditions) and
// regenerates the outlook ONLY when the corpus actually changed — so a quiet
// cycle is cheap (cache hit, no LLM call), while a new USDA report / news / price
// trend flips the corpus hash and produces a fresh read on its own.
//
// Wire via a scheduler hitting GET /api/cron/refresh (Vercel Cron config lives in
// vercel.json). Auth: set CRON_SECRET — Vercel Cron sends it as
// `Authorization: Bearer <secret>`. With no secret set (local dev) it's open, the
// same convention as /api/alerts/evaluate.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Two crops, each up to one ~45s synthesis when the corpus changed.
export const maxDuration = 300;

const CROPS: Crop[] = ["corn", "soybean"];

async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // The market read is global per crop — the corpus hash excludes farm-specific
  // basis (it keys on price DIRECTION, not the cash level), so any farm id just
  // supplies the corpus price line and the warmed read serves every farm.
  const db = createServiceRoleClient();
  const { data: farm } = await db.from("farms").select("id").limit(1).maybeSingle();
  const farmId = farm?.id ?? null;

  const results: Record<string, unknown> = {};
  for (const crop of CROPS) {
    if (!farmId) {
      results[crop] = "skipped (no farm)";
      continue;
    }
    try {
      const o = await getMarketOutlook(crop, farmId, now);
      results[crop] = o
        ? { signal: o.signal, generatedAt: o.generatedAt }
        : "unavailable";
    } catch (e) {
      results[crop] = `error: ${(e as Error).message}`;
    }
  }

  // getMarketOutlook already refreshed the news bucket; pre-tag any new articles
  // in the background so the News tab serves stored tags (no model call on load).
  let tagged = 0;
  try {
    tagged = await tagUntaggedNews();
  } catch (e) {
    results.newsTags = `error: ${(e as Error).message}`;
  }

  return NextResponse.json({ ok: true, ranAt: now.toISOString(), warmed: Boolean(farmId), tagged, results });
}

export const GET = handle;
export const POST = handle;
