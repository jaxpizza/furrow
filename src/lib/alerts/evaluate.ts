import "server-only";

import { cashProvider } from "@/lib/markets/manual-basis";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

import {
  decideAlerts,
  round4,
  type PriorState,
  type ThresholdType,
} from "./hysteresis";

type TargetRow = Database["public"]["Tables"]["breakeven_targets"]["Row"];
type StateRow = Database["public"]["Tables"]["alert_state"]["Row"];

export type EvalSummary = {
  evaluated: number;
  fired: number;
  alerts: {
    crop: string;
    thresholdType: ThresholdType;
    thresholdPrice: number;
    cashPrice: number;
  }[];
};

/** Evaluate every active target for one farm (on-demand, when a page loads). */
export async function evaluateFarm(farmId: string): Promise<EvalSummary> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("breakeven_targets")
    .select("*")
    .eq("farm_id", farmId)
    .eq("active", true);
  return evaluateTargets(db, (data as TargetRow[] | null) ?? []);
}

/** Evaluate every active target across all farms. Entry point for the cron route. */
export async function evaluateAllFarms(): Promise<EvalSummary> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("breakeven_targets")
    .select("*")
    .eq("active", true);
  return evaluateTargets(db, (data as TargetRow[] | null) ?? []);
}

type DbClient = ReturnType<typeof createServiceRoleClient>;

async function evaluateTargets(
  db: DbClient,
  targets: TargetRow[],
): Promise<EvalSummary> {
  const summary: EvalSummary = { evaluated: targets.length, fired: 0, alerts: [] };

  for (const t of targets) {
    const breakeven = num(t.effective_breakeven);
    if (breakeven == null) continue; // config incomplete — nothing to compare

    // THE CORE PRINCIPLE: compare against the local CASH price (futures + basis),
    // never raw futures. We reuse the markets cash provider verbatim.
    const cash = await cashProvider.getCashPrice(t.crop, t.farm_id);
    const cashPrice = cash.cashPrice;
    if (cashPrice == null) continue; // no cash number available right now

    // Thresholds for this target. profit_target sits above break-even.
    const profit = num(t.profit_target_per_bushel);
    const thresholds: { type: ThresholdType; price: number }[] = [
      { type: "breakeven", price: breakeven },
    ];
    if (profit != null && profit > 0) {
      thresholds.push({
        type: "profit_target",
        price: round4(breakeven + profit),
      });
    }

    // Load existing hysteresis state for this target.
    const { data: stateData } = await db
      .from("alert_state")
      .select("*")
      .eq("target_id", t.id);
    const stateByType = new Map<string, StateRow>(
      ((stateData as StateRow[] | null) ?? []).map((s) => [s.threshold_type, s]),
    );

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    // Pure hysteresis decision (unit-tested in isolation).
    const priorState = new Map<ThresholdType, PriorState>();
    for (const s of stateByType.values()) {
      priorState.set(s.threshold_type, {
        armed: s.armed,
        lastFiredAt: s.last_fired_at ? new Date(s.last_fired_at).getTime() : null,
      });
    }
    const decisions = decideAlerts({
      thresholds,
      state: priorState,
      cashPrice,
      nowMs: now,
    });

    for (const d of decisions) {
      if (d.writeState) {
        await db.from("alert_state").upsert(
          {
            target_id: t.id,
            farm_id: t.farm_id,
            threshold_type: d.type,
            armed: d.nextArmed,
            last_threshold_price: d.price,
            ...(d.setLastFired ? { last_fired_at: nowIso } : {}),
            updated_at: nowIso,
          },
          { onConflict: "target_id,threshold_type" },
        );
      }

      if (d.fire) {
        await db.from("price_alerts").insert({
          farm_id: t.farm_id,
          target_id: t.id,
          crop: t.crop,
          threshold_type: d.type,
          threshold_price: d.price,
          cash_price_at_fire: cashPrice,
          basis_at_fire: cash.basisCents,
          futures_at_fire: cash.futuresRef?.price ?? null,
          status: "unread",
        });
        summary.fired += 1;
        summary.alerts.push({
          crop: t.crop,
          thresholdType: d.type,
          thresholdPrice: d.price,
          cashPrice,
        });
      }
    }
  }

  return summary;
}

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}
