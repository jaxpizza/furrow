import type { Crop } from "@/lib/types/database";

import { round4, type ThresholdType } from "./hysteresis";

export {
  REARM_MARGIN,
  COOLDOWN_MS,
  round4,
  type ThresholdType,
} from "./hysteresis";

export type EntryMode = "per_bushel" | "per_acre_yield";
export type AlertStatus = "unread" | "read" | "dismissed";

/** The farmer's per-crop cost/target, with the DB-derived effective break-even. */
export type BreakevenTarget = {
  id: string;
  farmId: string;
  crop: Crop;
  entryMode: EntryMode;
  costPerBushel: number | null;
  costPerAcre: number | null;
  expectedYield: number | null;
  profitTargetPerBushel: number | null;
  effectiveBreakeven: number | null;
  active: boolean;
};

export type FiredAlert = {
  id: string;
  crop: Crop;
  thresholdType: ThresholdType;
  thresholdPrice: number;
  cashPriceAtFire: number;
  basisAtFire: number | null;
  futuresAtFire: number | null;
  firedAt: string;
  status: AlertStatus;
};

/**
 * Effective break-even in $/bushel — the SINGLE number the rest of the app
 * compares cash against. Mirrors the DB generated column so the client form can
 * preview it live before saving.
 *   - per_bushel       → cost_per_bushel
 *   - per_acre_yield   → cost_per_acre ÷ expected_yield
 * Returns null when the inputs for the chosen mode are incomplete.
 */
export function computeEffectiveBreakeven(p: {
  entryMode: EntryMode;
  costPerBushel: number | null;
  costPerAcre: number | null;
  expectedYield: number | null;
}): number | null {
  if (p.entryMode === "per_bushel") {
    return p.costPerBushel != null && p.costPerBushel > 0
      ? round4(p.costPerBushel)
      : null;
  }
  if (
    p.costPerAcre != null &&
    p.costPerAcre > 0 &&
    p.expectedYield != null &&
    p.expectedYield > 0
  ) {
    return round4(p.costPerAcre / p.expectedYield);
  }
  return null;
}
