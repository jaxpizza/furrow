// Pure, dependency-free hysteresis core for the break-even alert engine. Kept
// free of app imports so it can be unit-tested in isolation — this is the
// "fire once per genuine crossing, never spam" logic the whole feature rests on.

export type ThresholdType = "breakeven" | "profit_target";

/** Once fired, a threshold won't re-fire until the cash price has dropped at
 *  least this far below the line (a real reset) OR the cooldown has elapsed. */
export const REARM_MARGIN = 0.03; // $/bushel — "meaningfully below" the line
export const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type ThresholdInput = { type: ThresholdType; price: number };

/** Prior persisted state for one threshold (absent = never evaluated). */
export type PriorState = {
  armed: boolean;
  lastFiredAt: number | null; // epoch ms
};

export type ThresholdDecision = {
  type: ThresholdType;
  price: number;
  /** insert a price_alert for this threshold */
  fire: boolean;
  /** armed value to persist */
  nextArmed: boolean;
  /** stamp last_fired_at = now */
  setLastFired: boolean;
  /** whether the state row needs to be written at all (keeps steady state quiet) */
  writeState: boolean;
};

/**
 * Decide, for one target, what happens this evaluation pass.
 *
 * Rules:
 *  - A threshold is ARMED (eligible to fire) by default. After firing it
 *    DISARMS. It re-arms only when the cash price has dropped a margin below the
 *    line OR a cooldown has elapsed since the last fire.
 *  - We fire at most ONE alert per target: the HIGHEST threshold that is armed
 *    AND crossed. Any lower armed+crossed threshold is "superseded" — disarmed
 *    without its own alert (so a leap past break-even straight to the profit
 *    target doesn't double-notify).
 *  - State is only written when something changed (a fire/supersede or a
 *    re-arm), so a price hovering at the line produces no churn and no spam.
 */
export function decideAlerts(params: {
  thresholds: ThresholdInput[];
  state: Map<ThresholdType, PriorState>;
  cashPrice: number;
  nowMs: number;
}): ThresholdDecision[] {
  const { thresholds, state, cashPrice, nowMs } = params;

  const evals = thresholds.map((th) => {
    const st = state.get(th.type);
    const hadState = st != null;
    const wasArmed = st ? st.armed : true;
    let armed = wasArmed;
    if (st && !armed) {
      const cooldownPassed =
        st.lastFiredAt != null && nowMs - st.lastFiredAt >= COOLDOWN_MS;
      const droppedBelow = cashPrice < th.price - REARM_MARGIN;
      if (cooldownPassed || droppedBelow) armed = true;
    }
    return {
      type: th.type,
      price: th.price,
      armed,
      crossed: cashPrice >= th.price,
      hadState,
      wasArmed,
    };
  });

  const candidates = evals.filter((e) => e.armed && e.crossed);
  const winner =
    candidates.length > 0
      ? candidates.reduce((a, b) => (b.price > a.price ? b : a))
      : null;

  return evals.map((e) => {
    const isWinner = winner != null && e.type === winner.type;
    const superseded =
      winner != null && e.armed && e.crossed && e.price < winner.price;

    let nextArmed = e.armed;
    let setLastFired = false;
    if (isWinner || superseded) {
      nextArmed = false;
      setLastFired = true;
    }
    const rearmFlipped = e.hadState && !e.wasArmed && e.armed;
    return {
      type: e.type,
      price: e.price,
      fire: isWinner,
      nextArmed,
      setLastFired,
      writeState: isWinner || superseded || rearmFlipped,
    };
  });
}
