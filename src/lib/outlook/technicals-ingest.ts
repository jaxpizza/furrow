import "server-only";

import { getFuturesHistory } from "@/lib/markets/service";
import type { Symbol } from "@/lib/markets/types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import { computeTechnicals } from "./technicals";
import type { TechnicalsBundle } from "./technicals-types";

const CROPS: Crop[] = ["corn", "soybean"];

export type TechnicalsSnapshot = {
  bundles: TechnicalsBundle[];
  basedOnSample: boolean;
};

/**
 * Compute technicals for both crops from the cached futures history, and
 * persist the daily close series to price_history (append-only, for the
 * backtest). Never throws.
 */
export async function getTechnicalsSnapshot(
  now: Date = new Date(),
): Promise<TechnicalsSnapshot> {
  const bundles: TechnicalsBundle[] = [];
  for (const crop of CROPS) {
    try {
      const history = await getFuturesHistory(crop as Symbol, now);
      const tech = computeTechnicals(crop, history);
      if (tech) {
        bundles.push(tech);
        await persistSeries(crop, history.points, history.source);
      }
    } catch (e) {
      console.warn(`[technicals] ${crop} failed`, e);
    }
  }
  return { bundles, basedOnSample: bundles.some((b) => b.basedOnSample) };
}

/** Upsert the close series into price_history; skip if already current. */
async function persistSeries(
  crop: Crop,
  points: { time: string; value: number }[],
  source: string,
): Promise<void> {
  if (points.length === 0) return;
  try {
    const db = createServiceRoleClient();
    const lastDate = points[points.length - 1].time.slice(0, 10);
    const { data: existing } = await db
      .from("price_history")
      .select("date")
      .eq("crop", crop)
      .order("date", { ascending: false })
      .limit(1);
    if (existing?.[0]?.date === lastDate) return; // already current

    const rows = points.map((p) => ({
      crop,
      date: p.time.slice(0, 10),
      close: p.value,
      source,
    }));
    // chunk to keep the payload reasonable
    for (let i = 0; i < rows.length; i += 500) {
      await db
        .from("price_history")
        .upsert(rows.slice(i, i + 500), { onConflict: "crop,date" });
    }
  } catch (e) {
    console.warn("[technicals] persist failed", e);
  }
}
