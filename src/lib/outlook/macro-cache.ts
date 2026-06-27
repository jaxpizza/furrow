import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";

import type { MacroBundle, MacroFrame, MacroSignalType } from "./macro-types";

const db = createServiceRoleClient;

export async function writeMacroBundle(b: MacroBundle): Promise<boolean> {
  try {
    const { error } = await db()
      .from("macro_cache")
      .upsert(
        {
          signal_type: b.signalType,
          as_of: b.asOf ?? new Date().toISOString().slice(0, 10),
          payload: JSON.parse(JSON.stringify({ weight: b.weight, frames: b.frames })),
          source_url: b.sourceUrl,
        },
        { onConflict: "signal_type,as_of" },
      );
    return !error;
  } catch {
    return false;
  }
}

/** Latest reading per signal_type. */
export async function readLatestMacroBundles(): Promise<MacroBundle[]> {
  try {
    const { data } = await db()
      .from("macro_cache")
      .select("*")
      .order("as_of", { ascending: false });
    const seen = new Set<string>();
    const out: MacroBundle[] = [];
    for (const r of (data as MacroRow[] | null) ?? []) {
      if (seen.has(r.signal_type)) continue;
      seen.add(r.signal_type);
      const p = (r.payload ?? {}) as { weight?: MacroBundle["weight"]; frames?: MacroFrame[] };
      out.push({
        signalType: r.signal_type as MacroSignalType,
        asOf: r.as_of,
        sourceUrl: r.source_url ?? "",
        weight: p.weight ?? "medium",
        frames: Array.isArray(p.frames) ? p.frames : [],
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function macroLastFetched(): Promise<number | null> {
  try {
    const { data } = await db()
      .from("macro_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);
    const ts = data?.[0]?.fetched_at;
    return ts ? new Date(ts).getTime() : null;
  } catch {
    return null;
  }
}

type MacroRow = {
  signal_type: string;
  as_of: string;
  payload: unknown;
  source_url: string | null;
  fetched_at: string;
};
