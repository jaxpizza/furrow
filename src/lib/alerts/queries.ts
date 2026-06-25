import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

import type { BreakevenTarget, FiredAlert } from "./types";

/** The farmer's break-even config for one crop (RLS-scoped to their farm). */
export async function getBreakevenTarget(
  farmId: string,
  crop: Crop,
): Promise<BreakevenTarget | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("breakeven_targets")
    .select("*")
    .eq("farm_id", farmId)
    .eq("crop", crop)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    farmId: data.farm_id,
    crop: data.crop,
    entryMode: data.entry_mode,
    costPerBushel: num(data.cost_per_bushel),
    costPerAcre: num(data.cost_per_acre),
    expectedYield: num(data.expected_yield),
    profitTargetPerBushel: num(data.profit_target_per_bushel),
    effectiveBreakeven: num(data.effective_breakeven),
    active: data.active,
  };
}

/** Fired alerts for the farm, newest first. */
export async function getRecentAlerts(
  farmId: string,
  limit = 50,
): Promise<FiredAlert[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("farm_id", farmId)
    .neq("status", "dismissed")
    .order("fired_at", { ascending: false })
    .limit(limit);
  return ((data as PriceAlertRow[] | null) ?? []).map((a) => ({
    id: a.id,
    crop: a.crop,
    thresholdType: a.threshold_type,
    thresholdPrice: num(a.threshold_price) ?? 0,
    cashPriceAtFire: num(a.cash_price_at_fire) ?? 0,
    basisAtFire: num(a.basis_at_fire),
    futuresAtFire: num(a.futures_at_fire),
    firedAt: a.fired_at,
    status: a.status,
  }));
}

/** Unread count for the nav badge. */
export async function getUnreadAlertCount(farmId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("price_alerts")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .eq("status", "unread");
  return count ?? 0;
}

/** Mark the farm's unread alerts as read (called when the inbox is opened). */
export async function markAlertsRead(farmId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("price_alerts")
    .update({ status: "read" })
    .eq("farm_id", farmId)
    .eq("status", "unread");
}

type PriceAlertRow =
  import("@/lib/types/database").Database["public"]["Tables"]["price_alerts"]["Row"];

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}
