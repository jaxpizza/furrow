import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import type { DemandBundle, DemandDataType, DemandFrame } from "./demand-types";

const db = createServiceRoleClient;

export async function writeDemandBundle(b: DemandBundle): Promise<boolean> {
  try {
    const { error } = await db()
      .from("usda_demand_cache")
      .upsert(
        {
          data_type: b.dataType,
          crop: b.crop,
          marketing_year: b.marketingYear,
          period: b.period ?? "latest",
          payload: JSON.parse(JSON.stringify(b.frames)),
          source_url: b.sourceUrl,
          released_at: b.releasedAt,
          fetched_at: new Date().toISOString(), // bump so the staleness gate clears
        },
        { onConflict: "data_type,crop,period" },
      );
    return !error;
  } catch {
    return false;
  }
}

/** Latest reading per (data_type, crop) — what the surface/synthesis use. */
export async function readLatestDemandBundles(): Promise<DemandBundle[]> {
  try {
    const { data } = await db()
      .from("usda_demand_cache")
      .select("*")
      .order("fetched_at", { ascending: false })
      .order("released_at", { ascending: false, nullsFirst: false });
    const seen = new Set<string>();
    const out: DemandBundle[] = [];
    for (const r of (data as DemandRow[] | null) ?? []) {
      const key = `${r.data_type}:${r.crop}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        dataType: r.data_type as DemandDataType,
        crop: r.crop,
        marketingYear: r.marketing_year,
        period: r.period,
        releasedAt: r.released_at,
        sourceUrl: r.source_url ?? "",
        frames: Array.isArray(r.payload) ? (r.payload as DemandFrame[]) : [],
        fetchedAt: r.fetched_at,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function demandLastFetched(): Promise<number | null> {
  try {
    const { data } = await db()
      .from("usda_demand_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);
    const ts = data?.[0]?.fetched_at;
    return ts ? new Date(ts).getTime() : null;
  } catch {
    return null;
  }
}

type DemandRow = {
  data_type: string;
  crop: Crop;
  marketing_year: string;
  period: string;
  payload: unknown;
  source_url: string | null;
  released_at: string | null;
  fetched_at: string;
};
