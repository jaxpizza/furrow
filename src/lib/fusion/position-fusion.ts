import type { Position } from "@/lib/inputs/ledger";
import type { DominantTension, Signal } from "@/lib/outlook/synthesis";
import type { Crop } from "@/lib/types/database";

/**
 * Personal-position fusion — the light, per-farmer layer that sits ON TOP of the
 * shared, cacheable market read (FURROW_INTELLIGENCE_DESIGN.md §5). It NEVER
 * re-derives the market and the market never needs his data; it just takes the
 * generic read's signal/tension plus his real numbers and states FACTS and their
 * RELEVANCE.
 *
 * Deliberately deterministic (no LLM): this is the lightest possible layer, and
 * it is the only way to *guarantee* the hard honesty rule — every word here is
 * authored, so nothing can drift into advice ("sell", "lock in", "wait") or a
 * price prediction ("prices will fall", "this is the top"). We surface his
 * numbers vs break-even, his exposure, the market situation, and the factual
 * relevance of one to the other. The decision stays his.
 */

export type Exposure = "high" | "moderate" | "low" | "none";

export type PositionFusion = {
  crop: Crop;
  cropLabel: string;
  hasPosition: boolean; // any production/remaining logged
  hasBreakeven: boolean;
  hasCash: boolean;
  // cash vs break-even (present facts)
  cashPrice: number | null;
  breakeven: number | null;
  spread: number | null; // cash − break-even
  aboveBreakeven: boolean | null;
  atProfitTarget: boolean;
  // exposure (present facts)
  remaining: number;
  pctSold: number | null;
  pctUnsold: number | null;
  ownedRemaining: number;
  commercialRemaining: number;
  exposure: Exposure;
  // brief echo of the shared market read (so his position sits next to it)
  signal: Signal | null;
  tensionLeans: "up" | "down" | "balanced" | null;
  tensionLine: string | null;
  // composed lines — facts + relevance ONLY, never a directive or a forecast
  exposureLine: string;
  situationLine: string;
  relevanceLine: string | null; // §5: folds his exposure into the read as relevance
  profitableNote: string | null; // present-tense fact only
  commercialNote: string | null;
};

const SIGNAL_WORD: Record<Signal, string> = {
  favorable: "favorable",
  mixed: "mixed",
  unfavorable: "unfavorable",
};

const fmtBu = (n: number) => Math.round(n).toLocaleString();
const money = (n: number) => `$${n.toFixed(2)}`;

export function fusePosition(input: {
  crop: Crop;
  cropLabel: string;
  position: Position;
  breakeven: number | null;
  cashPrice: number | null;
  profitTargetPrice?: number | null;
  signal: Signal | null;
  tension: DominantTension | null;
}): PositionFusion {
  const { crop, cropLabel, position, breakeven, cashPrice, signal, tension } = input;
  const profitTargetPrice = input.profitTargetPrice ?? null;
  const lc = cropLabel.toLowerCase();

  const remaining = Math.max(0, position.remaining);
  const hasPosition = position.produced > 0 || remaining > 0;
  const pctSold = position.pctSold;
  const pctUnsold = pctSold != null ? Math.max(0, Math.min(100, 100 - pctSold)) : null;
  const ownedRemaining = Math.max(0, position.ownedRemaining);
  const commercialRemaining = Math.max(0, position.commercialRemaining);

  const hasCash = cashPrice != null;
  const hasBreakeven = breakeven != null;
  const spread = hasCash && hasBreakeven ? Math.round((cashPrice! - breakeven!) * 100) / 100 : null;
  const aboveBreakeven = spread != null ? spread >= 0 : null;
  const atProfitTarget = hasCash && profitTargetPrice != null ? cashPrice! >= profitTargetPrice : false;

  const exposure: Exposure =
    !hasPosition || remaining <= 0
      ? "none"
      : pctUnsold == null
        ? "moderate"
        : pctUnsold >= 60
          ? "high"
          : pctUnsold >= 30
            ? "moderate"
            : "low";

  // ── exposure line (fact) ──────────────────────────────────────────────────
  const exposureLine = !hasPosition
    ? `No ${lc} logged yet.`
    : remaining <= 0
      ? `All of your ${lc} is priced — nothing left exposed.`
      : `${fmtBu(remaining)} bu unsold${pctUnsold != null ? ` — ${pctUnsold}% of your ${lc} still to price` : ""}.`;

  // ── commercial note (fact: commercial storage carries an ongoing cost) ────
  const commercialNote =
    commercialRemaining > 0
      ? `${fmtBu(commercialRemaining)} bu of that sits in commercial storage, which costs you every month it stays there.`
      : null;

  // ── brief read echo ───────────────────────────────────────────────────────
  const tensionLeans = tension?.leans ?? null;
  const tensionLine = tension
    ? `${tension.forceUp} vs. ${tension.forceDown} — ${
        tension.leans === "balanced" ? "balanced for now" : `leans ${tension.leans}`
      }.`
    : null;

  // ── situation line: pure facts joined; never a directive ──────────────────
  const cashClause = !hasCash
    ? "Cash isn't available right now"
    : !hasBreakeven
      ? `Cash is ${money(cashPrice!)} with no break-even set`
      : `Cash is ${money(Math.abs(spread!))} ${aboveBreakeven ? "above" : "below"} your break-even`;
  const exposureClause = !hasPosition
    ? `you haven't logged any ${lc} yet`
    : remaining <= 0
      ? `all of your ${lc} is priced`
      : pctUnsold != null
        ? `${pctUnsold}% of your ${lc} is still unsold`
        : `you still have ${fmtBu(remaining)} bu unsold`;
  const readClause = signal ? `the market read is ${SIGNAL_WORD[signal]}` : "the market read isn't available";
  const situationLine = `${cashClause} and ${exposureClause}, while ${readClause}.`;

  // ── relevance line (§5): the same conditions weigh differently by exposure ─
  let relevanceLine: string | null = null;
  if (hasPosition && remaining > 0) {
    if (exposure === "high")
      relevanceLine = `With ${pctUnsold}% of your ${lc} still unsold, this read applies to most of your crop.`;
    else if (exposure === "moderate")
      relevanceLine = `You have ${
        pctUnsold != null ? `${pctUnsold}% of` : "part of"
      } your ${lc} unsold, so this read bears on a meaningful share of your crop.`;
    else relevanceLine = `Most of your ${lc} is already priced; this read bears on the ${pctUnsold}% still unsold.`;
  } else if (hasPosition && remaining <= 0) {
    relevanceLine = `You've priced all of your ${lc}, so this read is context — no unsold bushels are exposed.`;
  }

  // ── profitable note: a PRESENT fact only, never "lock it in / before it drops" ─
  const profitableNote =
    hasCash && hasBreakeven && remaining > 0 && aboveBreakeven
      ? `At today's cash, your ${fmtBu(remaining)} unsold bu of ${lc} are priced above your break-even.`
      : null;

  return {
    crop,
    cropLabel,
    hasPosition,
    hasBreakeven,
    hasCash,
    cashPrice: cashPrice ?? null,
    breakeven: breakeven ?? null,
    spread,
    aboveBreakeven,
    atProfitTarget,
    remaining,
    pctSold,
    pctUnsold,
    ownedRemaining,
    commercialRemaining,
    exposure,
    signal,
    tensionLeans,
    tensionLine,
    exposureLine,
    situationLine,
    relevanceLine,
    profitableNote,
    commercialNote,
  };
}
