import "server-only";

import { createHash } from "node:crypto";

import Anthropic from "@anthropic-ai/sdk";

import {
  deltaFromHistory,
  getFuturesHistory,
} from "@/lib/markets/service";
import { cashProvider } from "@/lib/markets/manual-basis";
import { CROP_LABEL, CROP_TO_SYMBOL } from "@/lib/markets/symbols";
import type { Crop } from "@/lib/types/database";

import { readLatestOutlookV2, readNewsItems, readReportBundles, writeOutlookV2 } from "./cache";
import { getCotSnapshot } from "./cot-ingest";
import type { CotBundle } from "./cot-types";
import { getDemandSnapshot } from "./demand-ingest";
import { getMacroSnapshot } from "./macro-ingest";
import { MACRO_LABEL, type MacroBundle, type MacroFrame } from "./macro-types";
import {
  computeSeasonalWeighting,
  SEASON_BUCKET_LABEL,
  type Emphasis,
  type SeasonBucket,
} from "./seasonal";
import { getTechnicalsSnapshot } from "./technicals-ingest";
import type { TechnicalsBundle } from "./technicals-types";
import { DEMAND_LABEL, type DemandBundle, type DemandFrame } from "./demand-types";
import { getEconSnapshot, type UpcomingReport } from "./econ-ingest";
import { REPORT_LABEL, type EconBundle, type EconFrame } from "./econ-types";
import { NASS_ATTRIBUTION } from "./sources";
import type { NewsItem, ReportBundle } from "./types";

export const OUTLOOK_MODEL = "claude-sonnet-4-6";
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // regenerate at most ~4×/day
const NEWS_FOR_SYNTHESIS = 28;
const DISCLAIMER = "Market context, not financial advice. You decide.";

export type Signal = "favorable" | "mixed" | "unfavorable";

export type OutlookSource = { id: string; label: string; url: string | null };
export type OutlookFactorV2 = {
  direction: "up" | "down" | "neutral";
  text: string;
  source: OutlookSource | null;
};
/**
 * The always-visible macro backdrop — "watched but not driving." Built
 * deterministically from the framed macro bundles (NOT the LLM), so it is
 * present on every read regardless of whether macro cracked the main factors.
 * Macro is PROMOTED into `factors` only when it is materially driving the read.
 */
export type MacroContextItem = {
  key: "dollar" | "crude" | "macro_weather";
  label: string;
  value: string;
  detail: string; // short trend phrase
  direction: "up" | "down" | "neutral";
  lean: string; // mild directional lean, one phrase
};
export type MacroContext = MacroContextItem[];

/** The active seasonal frame (F1) — computed, not from the LLM. Transparent so
 *  it can be displayed: which buckets lead the read at this point in the year. */
export type SeasonalContext = {
  line: string;
  season: string;
  monthLabel: string;
  dominantQuestion: string;
  emphasis: { bucket: string; emphasis: Emphasis }[];
};

/** Per-bucket "watched, not driving" layer (F1) — every one of the six buckets
 *  is represented here (proving it was considered), but only drivers are also in
 *  `factors`. LLM-emitted. */
export type WatchedBucket = {
  bucket: string;
  state: string; // current framed state, one line
  lean: "up" | "down" | "neutral";
  emphasis: "high" | "medium" | "low";
  isDriver: boolean; // also promoted into factors?
};

/** The named axis of disagreement (F1 / design §2.3) — drives "mixed", never a
 *  vague catch-all. Structured for the future F2 "what's pushing price" visual. */
export type DominantTension = {
  forceUp: string; // the bullish force
  forceDown: string; // the bearish force
  leans: "up" | "down" | "balanced";
  why: string; // which side leads now + what could flip it
};

export type OutlookV2 = {
  crop: Crop;
  signal: Signal;
  summary: string;
  factors: OutlookFactorV2[];
  seasonalContext: SeasonalContext;
  dominantTension: DominantTension | null;
  watchedContext: WatchedBucket[];
  macroContext: MacroContext;
  watchItems: string[];
  freshness: {
    usdaWeek: string | null;
    newsCount: number;
    newsThrough: string | null;
    priceTrend: string;
  };
  model: string;
  generatedAt: string;
  disclaimer: string;
  attribution: string;
  sampleData: boolean;
};

// ── The grounding contract. These constraints ARE the product. ───────────────
const SYSTEM = `You are the market-outlook analyst for Furrow, a tool for U.S. corn and soybean farmers. You read a provided corpus of real data — USDA NASS report figures, recent ag-news headlines, and a price/basis trend — and produce ONE structured, RELATIVE market read for a farmer who still has grain to price. Your voice is direct, plain farmer English, no fluff, no hype, honest about what isn't known.

Record your read by calling the record_market_read tool. Follow these rules without exception.

1. GROUNDING. Reason ONLY over the corpus provided in the user message. Every factor MUST cite a real source_id that appears in the corpus (e.g. U1, S2, N3, P1). If a claim is not backed by a corpus item, do not make it. Never invent or estimate numbers, prices, percentages, bushel figures, quotes, or report results. The ONLY authoritative figures are the USDA [U#] items — do not quote numeric figures from news items, treat those as soft qualitative context.

2. CONDITION-RATING HUMILITY. Crop condition ratings (the % good/excellent) reflect CURRENT MARKET SENTIMENT, not future yield. They are weak yield predictors, especially early in the season, and they swing — e.g. Illinois ratings fell sharply in June 2023 and then recovered, with yields fine. When a factor rests on condition ratings, treat them as "what the market is reacting to right now," explicitly NOT as a yield forecast, and say so in the factor text. Never translate a condition rating into a yield or price prediction.

3. NOT ADVICE. You are not a financial advisor and never give a trade instruction. Never say or imply "sell", "buy", "lock in", "hold off", "price it", or any directive to transact. The signal is a RELATIVE LEAN describing current conditions, which the farmer weighs themselves: "favorable" = conditions currently lean supportive of price; "mixed" = signals conflict or there's no clear lean; "unfavorable" = conditions currently lean unsupportive. These describe the market, not an action.

4. HONEST ON THIN DATA. Your read is only as good as the corpus. If it is sparse, stale, or the items don't clearly point anywhere, say so plainly ("limited new information this week") and lean "mixed" rather than manufacture a confident story. Do not overstate. Reporting uncertainty honestly is correct and valued.

5. FACT vs INTERPRETATION. Within each factor, separate what was reported from what it may mean. State the fact first (e.g. "USDA reports U.S. corn 68% good/excellent"), then a qualified interpretation (e.g. "— a level the market has read as comfortable supply, which is sentiment, not a yield call"). Keep interpretation tentative.

6. SURPRISE, NOT LEVEL (for WASDE / Grain Stocks / supply figures, marked [S#]). Markets move on the gap between the actual number and what the trade EXPECTED — not the level itself. When a factor rests on a supply figure, frame it as a CHANGE (use the provided Δ-month, Δ-year, and stocks-to-use frames), and state explicitly that its market impact depends on how it compared to trade expectations, which we do NOT track. NEVER assert "low stocks = bullish" or "big crop = bearish" on the level alone. A tightening or loosening picture is context the farmer weighs — not a verdict. Early-season production rests on a TREND-yield assumption (USDA's own words), not a measured yield — say so when it drives a factor.

7. PRICE DIRECTION BY ECONOMIC LOGIC (critical — get the sign right). The factor's "direction" must reflect which way the change pushes PRICE, reasoned from supply/demand economics — NOT whether the raw number went up or down. The chain:
   - LESS SUPPLY is supportive → direction UP. (smaller carryout/ending stocks, fewer planted acres, a stocks drawdown, a production or yield cut, a smaller crop.)
   - MORE SUPPLY is pressuring → direction DOWN. (bigger carryout, more acres, a stocks build, a bigger crop.)
   - STRONGER DEMAND is supportive → direction UP. (rising exports/China buying, higher crush, higher ethanol grind.)
   - WEAKER DEMAND is pressuring → direction DOWN. (falling exports, cancellations, lower crush/grind.)
   So "fewer intended corn acres year-over-year" is direction UP, not down. State the chain briefly inside the factor text, e.g. "fewer intended acres → less supply → supportive." This logic sets the sign; rules 2 and 6 still govern the humility (sentiment-not-yield, surprise-not-level, trend-yield) and keep the interpretation tentative — a supportive lean is context, never a price prediction.

8. MONEY FLOW IS THE EXCEPTION TO RULE 7 — POSITIONING, NOT PREDICTION (for CFTC Commitment-of-Traders / Managed-Money figures, marked [M#]). This data is highly aggregated and self-classified by traders — CFTC's own caveat — so interpret with caution. Fund positioning is NOT a price forecast; it shows how speculators are currently leaning. Do NOT apply rule 7 here: never naively read "funds net long → up" or "net short → down." The frame is the PERCENTILE of the net position in its own history:
   - EXTREME positioning (a crowded trade — net position near the top or bottom of its multi-year range) is the signal, and it cuts BOTH ways. A near-record net-LONG means few buyers may be left to push higher → the market is vulnerable to a reversal DOWN; a near-record net-SHORT is the mirror (vulnerable to a short-covering rally UP). Present an extreme as a crowded trade that can reverse, i.e. positioning context — NOT a directional call. Lean the factor's direction toward the CONTRARIAN read at extremes, and say so plainly.
   - A NON-EXTREME (mid-range percentile) net position is a WEAK signal — note where funds are leaning and the week-over-week change, but do not over-read it; it is usually best marked neutral. Always state the percentile and that COT is positioning, not prediction.

9. MACRO IS SECOND-ORDER — CONTEXT STRIP BY DEFAULT, PROMOTED TO A FACTOR ONLY WHEN DRIVING (for dollar, crude, Corn Belt market weather, marked [X#]). The macro backdrop is ALWAYS shown to the farmer in a separate, always-visible "macro context" strip (built for you — you do NOT emit it). Therefore your FACTORS list is reserved for what is actually DRIVING the read. Rules:
   - DEFAULT: do NOT put macro in your factors. When dollar/crude/weather are minor or routine (a normal daily/weekly wiggle, near-normal moisture), leave them OUT of factors entirely — they are already visible in the strip. This keeps the factor list high-signal and fundamentals-led.
   - PROMOTE a macro item INTO the factors ONLY when it is materially shaping the read: e.g. a Corn Belt DROUGHT during the summer pollination/pod-fill window (HIGH weight — can legitimately lead), or an accumulating multi-week dollar move that is genuinely bearing on export competitiveness alongside the export data. When you promote one, apply rule 7's stated direction chain (stronger dollar → export headwind → DOWN; crude up → ethanol/input support → UP; below-normal Corn Belt moisture → supply risk → UP) and explicitly label it second-order/medium-weight (except summer-weather drought, which may lead).
   - NEVER let macro outnumber or outweigh supply/demand in the final lean. A routine dollar/crude wiggle must not flip the read. Near-normal moisture is never a factor (it lives only in the strip). Always carry the >7-day-forecast humility when weather is discussed.

10. TECHNICALS ARE NOT A PREDICTION (for the [T1] price-technicals item). Support/resistance, moving averages, trend, and momentum describe what CHART-DRIVEN traders act on — they are a SECONDARY/tertiary signal, weaker than fundamentals (rule: technicals are LOW/tertiary most of the year). Frame them as context, never as a forecast:
   - "Price is testing resistance near $X" means a level where selling has historically appeared and where chart traders may sell again — a partly SELF-FULFILLING level because traders watch it — NOT "price will fall." Same for support. State it this way.
   - DEFAULT: technicals inform the price/trend factor as supporting colour; do NOT make a standalone technical factor for routine readings. PROMOTE a technical to its own factor ONLY when genuinely notable — e.g. price sitting right at a major multi-month resistance/support, or a clear trend break — and even then keep it clearly secondary to the fundamental story; never let a chart level override a fundamental factor or flip the net lean.
   - LOW-CONFIDENCE DATA: if the technicals are marked sample/limited-data, you MUST say plainly that they are based on sample/placeholder price data and are low-confidence (do not present them as live chart levels). When sample-based, keep them out of the factors entirely and mention the limitation at most once.

11. REASON WITHIN THE SEASONAL FRAME (the "=== SEASONAL WEIGHTING ===" block). The corpus gives you the ACTIVE seasonal frame: the season, the dominant question, and each bucket's emphasis right now (HIGH = leads the read, MEDIUM = secondary, LOW = minor), plus event overlays (an imminent report spikes its bucket). USE this to decide which signals lead: a HIGH-emphasis bucket that is doing something real should be a main factor; a LOW-emphasis bucket usually should NOT lead. This is attention allocation, NOT a forecast — a correctly-weighted read still ends at a relative lean, never a price call. You MAY deviate from the seasonal prior when a lower-weighted signal is doing something genuinely EXTREME (e.g. a shock export cancellation, a record fund position) — but when you deviate you MUST say so and why ("normally minor in late June, but …"). Do not silently ignore the frame.

12. UNIFIED DRIVER vs WATCHED-CONTEXT across ALL SIX buckets (supply, demand, money flow, macro, technicals, conditions). Every bucket is either a DRIVER (in your factors) or sits in WATCHED CONTEXT (considered, shown, not driving). One rule decides promotion: a bucket becomes a main factor when it is MATERIALLY shaping the read given the current seasonal weighting; otherwise it is watched context. The factors list stays high-signal (only drivers). You MUST emit 'watched_context': exactly one entry per bucket (supply, demand, money_flow, macro, technicals, conditions) giving its current state in one line, its lean (up/down/neutral), its seasonal emphasis (high/medium/low), and is_driver (true if you also made it a factor). This proves every bucket was considered even when it isn't driving. A bucket can be is_driver:true (then it's also in factors) or false (watched only). Keep the humility rules per bucket (surprise-not-level, sentiment-not-yield, COT contrarian, technicals-not-prediction, macro subordinate).

13. NAME THE DOMINANT TENSION (design §2.3 — do not blur to "mixed"). Emit 'dominant_tension': the single main axis of disagreement in this read — the bullish force (force_up) vs the bearish force (force_down), which side currently leans (up/down/balanced), and why it leans that way plus what could flip it. The 'signal' MUST follow from this: a "mixed" signal is only valid when EXPLAINED by a real, named tension (e.g. "tightening old-crop carryout vs. rising new-crop acreage — supply leads near-term, but June 30 acreage could flip it"), never used as a vague catch-all. If one side clearly dominates, say favorable/unfavorable and let force_up/force_down show the minority force.

OUTPUT:
- signal: the three-state relative lean defined above, following from the dominant tension.
- summary: 2–4 calm, plain sentences on what is currently pushing this crop's price up versus down, and the net lean. No fabricated numbers; you may reference the trend and the USDA figures provided.
- factors: 2–5 items — the DRIVERS only. Each carries a direction (up/down/neutral), a short plain-English claim, and the source_id that backs it. Reserve these for what materially leads the read under the seasonal frame (rules 11–12).
- dominant_tension: the named axis of disagreement (rule 13): force_up, force_down, leans (up/down/balanced), why.
- watched_context: exactly one entry per bucket — supply, demand, money_flow, macro, technicals, conditions (rule 12): bucket, state (one line), lean, emphasis (high/medium/low), is_driver.
- watch_items: 1–3 short, concrete things to watch next (an upcoming USDA report named in the corpus, a weather window, an export-sales update) — only if grounded in a corpus item.`;

const TOOL: Anthropic.Tool = {
  name: "record_market_read",
  description: "Record the structured, grounded market read for the farmer.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      signal: {
        type: "string",
        enum: ["favorable", "mixed", "unfavorable"],
        description: "Relative market lean. NOT a buy/sell instruction.",
      },
      summary: {
        type: "string",
        description: "2-4 calm, plain sentences. No fabricated numbers.",
      },
      factors: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            direction: { type: "string", enum: ["up", "down", "neutral"] },
            text: { type: "string", description: "One short, plain claim." },
            source_id: {
              type: "string",
              description: "A source id from the corpus, e.g. U1, N3, P1.",
            },
          },
          required: ["direction", "text", "source_id"],
        },
      },
      dominant_tension: {
        type: "object",
        additionalProperties: false,
        description: "The named axis of disagreement (rule 13). 'mixed' must be explained by this.",
        properties: {
          force_up: { type: "string", description: "The bullish/supportive force, one phrase." },
          force_down: { type: "string", description: "The bearish/pressuring force, one phrase." },
          leans: { type: "string", enum: ["up", "down", "balanced"] },
          why: { type: "string", description: "Which side leads now + what could flip it." },
        },
        required: ["force_up", "force_down", "leans", "why"],
      },
      watched_context: {
        type: "array",
        description: "One entry per bucket (rule 12) — every bucket represented; only drivers also appear in factors.",
        minItems: 6,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            bucket: {
              type: "string",
              enum: ["supply", "demand", "money_flow", "macro", "technicals", "conditions"],
            },
            state: { type: "string", description: "Current state in one line." },
            lean: { type: "string", enum: ["up", "down", "neutral"] },
            emphasis: { type: "string", enum: ["high", "medium", "low"] },
            is_driver: { type: "boolean" },
          },
          required: ["bucket", "state", "lean", "emphasis", "is_driver"],
        },
      },
      watch_items: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: { type: "string" },
        description: "Concrete things to watch next, grounded in the corpus.",
      },
    },
    required: ["signal", "summary", "factors", "dominant_tension", "watched_context", "watch_items"],
  },
};

// ── corpus assembly ──────────────────────────────────────────────────────────

type Corpus = {
  contextText: string;
  sources: Map<string, OutlookSource>;
  freshness: OutlookV2["freshness"];
  macroContext: MacroContext;
  seasonalContext: SeasonalContext;
  hash: string;
  sampleData: boolean;
};

function fmtUnit(unit: string): string {
  if (/^PCT/i.test(unit) || unit === "PCT") return "%";
  if (/BU \/ ACRE/i.test(unit)) return " bu/ac";
  if (/\bBU\b/i.test(unit)) return " bu";
  return ` ${unit.toLowerCase()}`;
}

function reportLabel(b: ReportBundle): string {
  const geo = b.geography === "IL" ? "Illinois" : "U.S.";
  return `USDA — ${CROP_LABEL[b.crop]} ${b.reportType}, ${geo}`;
}

const REPORT_ORDER = ["condition", "progress", "yield", "production"];

async function assembleCorpus(
  crop: Crop,
  farmId: string,
  now: Date,
): Promise<Corpus> {
  const sources = new Map<string, OutlookSource>();
  const lines: string[] = [`CROP: ${CROP_LABEL[crop]}`, ""];

  // 1. USDA — official figures (facts)
  const allReports = await readReportBundles();
  const reports = allReports
    .filter((b) => b.crop === crop)
    .sort(
      (a, b) =>
        REPORT_ORDER.indexOf(a.reportType) - REPORT_ORDER.indexOf(b.reportType) ||
        a.geography.localeCompare(b.geography),
    );

  lines.push(
    "=== USDA NASS (official report figures — these are FACTS; only these numbers are authoritative) ===",
  );
  let u = 0;
  let usdaWeek: string | null = null;
  for (const b of reports) {
    u += 1;
    const id = `U${u}`;
    const pts = b.points
      .map((p) => `${p.label} ${p.value ?? "—"}${fmtUnit(p.unit)}`)
      .join(", ");
    const period = b.points[0]?.period ? `${b.points[0].period}, ` : "";
    lines.push(`[${id}] ${reportLabel(b)} — ${pts} (${period}${b.period})`);
    sources.set(id, { id, label: reportLabel(b), url: b.sourceUrl || null });
    if (b.reportType === "condition" && b.points[0]?.period && !usdaWeek) {
      usdaWeek = b.points[0].period;
    }
  }
  if (u === 0) lines.push("(no USDA data cached for this crop)");
  lines.push("");

  // 1b. USDA SUPPLY — WASDE balance sheet + Grain Stocks + Acreage, reference-framed
  const econ = await getEconSnapshot();
  const supply = econ.bundles.filter((b) => b.crop === crop);

  // SEASONAL FRAME — the active weighting scaffolding (F1). Inserted near the TOP
  // of the corpus so it frames everything below.
  const sw = computeSeasonalWeighting(now, econ.upcoming);
  const seasonalContext: SeasonalContext = {
    line: sw.line,
    season: sw.season,
    monthLabel: sw.monthLabel,
    dominantQuestion: sw.dominantQuestion,
    emphasis: (Object.keys(sw.emphasis) as SeasonBucket[]).map((b) => ({
      bucket: SEASON_BUCKET_LABEL[b],
      emphasis: sw.emphasis[b],
    })),
  };
  const emphasisList = (Object.keys(sw.emphasis) as SeasonBucket[])
    .map((b) => `${SEASON_BUCKET_LABEL[b]}=${sw.emphasis[b].toUpperCase()}`)
    .join(", ");
  lines.splice(
    2,
    0,
    "=== SEASONAL WEIGHTING (the ACTIVE frame for THIS read — see rule 11; use it to decide which signals LEAD) ===",
    `Season: ${sw.season} · ${sw.monthLabel}. Dominant question: ${sw.dominantQuestion}`,
    `Bucket emphasis right now: ${emphasisList}.`,
    sw.imminentEvents.length
      ? `Imminent events (overlay — these buckets spike): ${sw.imminentEvents.join("; ")}.`
      : "No major report imminent.",
    `Frame: ${sw.line}`,
    "",
  );
  lines.push(
    "=== USDA SUPPLY DATA (WASDE / Grain Stocks / Acreage — official; reason from the FRAMES not raw levels, see rule 6) ===",
  );
  let s = 0;
  for (const b of supply) {
    s += 1;
    const id = `S${s}`;
    const label = `USDA ${REPORT_LABEL[b.reportType]} (${b.marketingYear})`;
    lines.push(`[${id}] ${label} — ${b.frames.map(fmtFrame).join("; ")}`);
    sources.set(id, { id, label, url: b.sourceUrl || null });
  }
  if (supply.length === 0) lines.push("(no supply data cached yet)");
  lines.push("");

  // 1c. USDA DEMAND — export sales (+ China), ethanol, crush; pace-vs-target framed
  const demandSnap = await getDemandSnapshot();
  const demand = demandSnap.bundles.filter((b) => b.crop === crop);
  lines.push(
    "=== USDA DEMAND DATA (export sales / ethanol / crush — reason from the pace-vs-target frame; a single weekly/monthly print is noisy, lean on pace + trend; flash sales are early signals, not shipments) ===",
  );
  let d = 0;
  for (const b of demand) {
    d += 1;
    const id = `D${d}`;
    const label = `USDA ${DEMAND_LABEL[b.dataType]} (${b.period ?? b.marketingYear})`;
    lines.push(`[${id}] ${label} — ${b.frames.map(fmtDemandFrame).join("; ")}`);
    sources.set(id, { id, label, url: b.sourceUrl || null });
  }
  if (demand.length === 0)
    lines.push("(no demand data cached yet — sources may be temporarily unavailable)");
  lines.push("");

  // 1d. MONEY FLOW — CFTC Managed-Money positioning; percentile is the frame (rule 8)
  const cotSnap = await getCotSnapshot();
  const cot = cotSnap.bundles.filter((b) => b.crop === crop);
  lines.push(
    "=== MONEY FLOW / FUND POSITIONING (CFTC Commitment of Traders, Managed Money — POSITIONING not prediction; reason from the PERCENTILE per rule 8; extremes are contrarian, mid-range is weak) ===",
  );
  let mfi = 0;
  for (const b of cot) {
    mfi += 1;
    const id = `M${mfi}`;
    const label = `CFTC COT Managed Money (report ${b.reportDate})`;
    lines.push(`[${id}] ${label} — ${fmtCot(b)}`);
    sources.set(id, { id, label, url: b.sourceUrl || null });
  }
  if (cot.length === 0) lines.push("(no COT data cached yet)");
  lines.push("");

  // 1e. MACRO — dollar, crude, Corn Belt market weather; second-order (rule 9)
  const macroSnap = await getMacroSnapshot();
  const macro = macroSnap.bundles;
  lines.push(
    "=== MACRO / CONTEXT (US dollar, crude oil, Corn Belt market weather — SECOND-ORDER signals per rule 9; dollar/crude are MEDIUM weight and must not dominate; macro weather is HIGH in the summer growing season) ===",
  );
  let x = 0;
  for (const b of macro) {
    x += 1;
    const id = `X${x}`;
    const label = `${MACRO_LABEL[b.signalType]} (${b.weight} weight)`;
    lines.push(`[${id}] ${label} — ${b.frames.map(fmtMacroFrame).join("; ")}`);
    sources.set(id, { id, label, url: b.sourceUrl || null });
  }
  if (macro.length === 0) lines.push("(no macro data cached yet)");
  lines.push(
    "(The macro backdrop above is ALSO shown to the farmer as an always-visible 'macro context' strip, separate from your factors. So include a macro [X#] item in your FACTORS only when it is MATERIALLY DRIVING this read per rule 9 — otherwise leave macro out of the factors; it is already visible in the strip.)",
  );
  lines.push("");
  const macroContext = buildMacroContext(macro);

  // 1f. TECHNICALS — chart levels from price history; supporting context (rule 10)
  const techSnap = await getTechnicalsSnapshot(now);
  const tech = techSnap.bundles.find((b) => b.crop === crop) ?? null;
  lines.push(
    "=== TECHNICALS (chart levels from price history — what chart-driven traders act on, NOT a prediction; SECONDARY/tertiary signal per rule 10) ===",
  );
  if (tech) {
    sources.set("T1", { id: "T1", label: "Price technicals (computed)", url: null });
    lines.push(`[T1] Price technicals — ${fmtTechnicals(tech)}`);
  } else {
    lines.push("(no price history available to compute technicals)");
  }
  lines.push("");

  // 2. Price & basis — reuse the markets service
  const symbol = CROP_TO_SYMBOL[crop];
  const history = await getFuturesHistory(symbol, now);
  const values = history.points.map((p) => p.value);
  const latest = values[values.length - 1] ?? null;
  const w = pctOver(values, 5);
  const m = pctOver(values, 21);
  const dir =
    m == null ? "flat" : m > 1 ? "rising" : m < -1 ? "falling" : "sideways";
  const sampleData = history.source === "sample";
  const cash = await cashProvider.getCashPrice(crop, farmId);
  const delta = deltaFromHistory(history);

  lines.push("=== PRICE & BASIS (from our markets service) ===");
  const priceLine =
    `[P1] Front-month futures ${latest != null ? `$${latest.toFixed(2)}` : "n/a"}` +
    `${sampleData ? " (SAMPLE data — no live feed)" : ""}; ` +
    `1-week ${fmtPct(w)}, 1-month ${fmtPct(m)}, 30-day direction ${dir}` +
    (delta?.direction ? `, latest day ${delta.direction}` : "") +
    (cash.cashPrice != null
      ? `. Farm cash $${cash.cashPrice.toFixed(2)} (basis ${cash.basisCents ?? 0}¢${cash.hasBasis ? "" : ", sample"}).`
      : ".");
  lines.push(priceLine);
  sources.set("P1", { id: "P1", label: "Cash & futures trend", url: null });
  lines.push("");

  // 3. Ag-news — recent, for this crop + grain-tagged
  const allNews = await readNewsItems(80);
  const news = allNews
    .filter((n) => n.cropTags.includes(crop) || n.cropTags.includes("grain"))
    .slice(0, NEWS_FOR_SYNTHESIS);

  lines.push(
    "=== AG-NEWS (recent; summaries are SOFT context — do NOT quote figures from these) ===",
  );
  news.forEach((n, i) => {
    const id = `N${i + 1}`;
    const date = (n.publishedAt ?? "").slice(0, 10) || "n/a";
    lines.push(
      `[${id}] (${n.source}, ${date}) "${n.title}"${n.summary ? ` — ${n.summary}` : ""}`,
    );
    sources.set(id, { id, label: `${n.source} · ${fmtDay(n.publishedAt)}`, url: n.link });
  });
  if (news.length === 0) lines.push("(no recent news cached for this crop)");
  lines.push("");

  // 4. Upcoming USDA reports — context for watch_items (not a citable source)
  lines.push("=== UPCOMING USDA REPORTS (for watch_items; cite the event name) ===");
  if (econ.upcoming.length === 0) lines.push("(calendar unavailable)");
  for (const e of econ.upcoming) lines.push(`- ${fmtUpcoming(e)}`);

  const newsThrough = news
    .map((n) => n.publishedAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return {
    contextText: lines.join("\n"),
    sources,
    freshness: {
      usdaWeek,
      newsCount: news.length,
      newsThrough: newsThrough ?? null,
      priceTrend: dir,
    },
    macroContext,
    seasonalContext,
    hash: hashCorpus(crop, reports, news, dir, supply, demand, cot, macro, tech, sw.line),
    sampleData,
  };
}

/** Deterministic macro backdrop for the always-visible context strip. */
function buildMacroContext(macro: MacroBundle[]): MacroContext {
  const out: MacroContext = [];
  const byType = new Map(macro.map((b) => [b.signalType, b]));
  const dollar = byType.get("dollar")?.frames[0];
  if (dollar?.value != null) {
    out.push({
      key: "dollar",
      label: "US Dollar (DXY)",
      value: `${dollar.value}`,
      detail: dollar.trend ?? "—",
      direction: dollar.direction,
      lean:
        dollar.direction === "down"
          ? "mild export headwind"
          : dollar.direction === "up"
            ? "mild export tailwind"
            : "neutral for exports",
    });
  }
  const crude = byType.get("crude")?.frames[0];
  if (crude?.value != null) {
    out.push({
      key: "crude",
      label: "Crude (WTI)",
      value: `$${crude.value}`,
      detail: crude.trend ?? "—",
      direction: crude.direction,
      lean:
        crude.direction === "up"
          ? "mild ethanol/input support"
          : crude.direction === "down"
            ? "softer ethanol/input pull"
            : "neutral",
    });
  }
  const wx = byType.get("macro_weather")?.frames[0];
  if (wx?.value != null) {
    const dry = typeof wx.value === "number" && wx.value < 75;
    const wet = typeof wx.value === "number" && wx.value > 130;
    out.push({
      key: "macro_weather",
      label: "Corn Belt rain",
      value: `${wx.value}%`,
      detail: `of normal · ${dry ? "dry" : wet ? "surplus" : "near-normal"}`,
      direction: wx.direction,
      lean: dry ? "drought-risk watch" : wet ? "ample moisture" : "no drought signal",
    });
  }
  return out;
}

function fmtFrame(f: EconFrame): string {
  const u = f.unit === "$/bu" ? "" : ` ${f.unit}`;
  const parts: string[] = [`${f.value ?? "—"}${u}`];
  if (f.deltaPrior != null)
    parts.push(`Δprior ${signed(f.deltaPrior)} (${f.priorLabel} ${f.priorValue})`);
  if (f.deltaYear != null)
    parts.push(`Δyear ${signed(f.deltaYear)} (${f.priorYearLabel} ${f.priorYearValue})`);
  if (f.stocksToUse != null) parts.push(`stocks-to-use ${f.stocksToUse}%`);
  let out = `${f.metric}: ${parts.join(", ")}`;
  if (!f.expectationAvailable) out += " [trade expectations: not tracked]";
  if (f.note) out += ` — ${f.note}`;
  return out;
}

function fmtTechnicals(t: TechnicalsBundle): string {
  const parts: string[] = [`price $${t.price}`, `trend ${t.trend} (${t.trendDetail})`];
  const mas = t.movingAverages
    .map((m) => `${m.period}d $${m.value} (${m.above ? "above" : "below"}, ${signed(m.priceVsPct)}%)`)
    .join(", ");
  if (mas) parts.push(`MAs: ${mas}`);
  if (t.resistance)
    parts.push(`resistance $${t.resistance.value} (+${t.resistance.distancePct}% away, 3M)`);
  if (t.support)
    parts.push(`support $${t.support.value} (−${t.support.distancePct}% away, 3M)`);
  if (t.atKeyLevel) parts.push(`PRICE TESTING ${t.atKeyLevel.toUpperCase()} (within 1.5%)`);
  parts.push(`momentum ${t.momentumLabel}`);
  parts.push(`range percentile ${t.rangePercentile}th (trailing ${t.rangeWindowDays}d)`);
  let out = parts.join("; ");
  out += t.basedOnSample
    ? " — ⚠ BASED ON SAMPLE/PLACEHOLDER PRICE DATA (no live history feed): LOW-CONFIDENCE, do not present as live chart levels; keep out of factors."
    : " — levels matter because chart traders watch them (partly self-fulfilling), NOT a prediction.";
  return out;
}

function fmtMacroFrame(f: MacroFrame): string {
  const parts: string[] = [`${f.label} ${f.value ?? "—"} ${f.unit}`];
  if (f.deltaPrior != null)
    parts.push(`Δprior ${signed(f.deltaPrior)}${f.deltaPriorPct != null ? ` (${signed(f.deltaPriorPct)}%)` : ""}`);
  if (f.trend) parts.push(f.trend);
  parts.push(`direction ${f.direction.toUpperCase()} [${f.chain}]`);
  let out = parts.join("; ");
  if (f.note) out += ` — ${f.note}`;
  return out;
}

function fmtCot(b: CotBundle): string {
  const parts: string[] = [
    `Managed Money ${b.positioning} ${signed(b.net)} contracts (long ${b.long} / short ${b.short})`,
    `percentile ${b.percentile}th of ${b.historyWeeks}wk history (range ${b.histLow}…${b.histHigh})`,
  ];
  parts.push(
    b.extreme
      ? `EXTREME — ${b.extreme} (crowded trade; contrarian risk of reversal the OTHER way)`
      : "mid-range — NOT extreme, weak signal, do not over-read",
  );
  if (b.deltaPriorNet != null) parts.push(`Δprior week ${signed(b.deltaPriorNet)}`);
  if (b.trendNet4w != null) parts.push(`~4wk trend ${signed(b.trendNet4w)}`);
  if (b.openInterest != null) parts.push(`open interest ${b.openInterest}`);
  return `${parts.join("; ")}. COT is aggregated + self-classified — positioning, not prediction.`;
}

function fmtDemandFrame(f: DemandFrame): string {
  const parts: string[] = [`${f.value ?? "—"} ${f.unit}`];
  if (f.paceText) parts.push(f.paceText);
  if (f.deltaPrior != null)
    parts.push(`Δprior ${signed(f.deltaPrior)}${f.priorLabel ? ` (${f.priorLabel})` : ""}`);
  if (f.deltaYear != null)
    parts.push(`Δyear ${signed(f.deltaYear)}${f.priorYearLabel ? ` (${f.priorYearLabel})` : ""}`);
  if (f.pctChina != null) parts.push(`${f.pctChina}% to China`);
  let out = `${f.metric}: ${parts.join(", ")}`;
  if (f.note) out += ` — ${f.note}`;
  return out;
}

function fmtUpcoming(e: UpcomingReport): string {
  const when =
    e.daysUntil === 0
      ? "today"
      : e.daysUntil === 1
        ? "tomorrow"
        : `in ${e.daysUntil} days`;
  return `${e.description} — ${e.releaseDate} (${when})`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/**
 * Content hash for cache-busting. Built from what MEANINGFULLY changes: the USDA
 * series+period+values, the set of news links, and the price-trend direction —
 * NOT the exact intraday price. A new USDA week or substantially new news flips
 * the hash and regenerates; minor price ticks don't.
 */
function hashCorpus(
  crop: Crop,
  reports: ReportBundle[],
  news: NewsItem[],
  dir: string,
  supply: EconBundle[],
  demand: DemandBundle[],
  cot: CotBundle[],
  macro: MacroBundle[],
  tech: TechnicalsBundle | null,
  seasonalLine: string,
): string {
  const usda = reports
    .map(
      (b) =>
        `${b.reportType}:${b.geography}:${b.period}:${b.points.map((p) => `${p.label}=${p.value}`).join(",")}`,
    )
    .sort()
    .join("|");
  const links = news.map((n) => n.link).sort().join("|");
  // a new WASDE/Stocks/Acreage release (new released_at or changed values) flips the hash
  const econ = supply
    .map((b) => `${b.reportType}:${b.releasedAt}:${b.frames.map((f) => `${f.metric}=${f.value}`).join(",")}`)
    .sort()
    .join("|");
  const dem = demand
    .map((b) => `${b.dataType}:${b.period}:${b.frames.map((f) => `${f.metric}=${f.value}`).join(",")}`)
    .sort()
    .join("|");
  const mf = cot
    .map((b) => `${b.crop}:${b.reportDate}:${b.net}:${b.percentile}`)
    .sort()
    .join("|");
  const mac = macro
    .map((b) => `${b.signalType}:${b.asOf}:${b.frames.map((f) => `${f.value}:${f.direction}`).join(",")}`)
    .sort()
    .join("|");
  const tch = tech
    ? `${tech.price}:${tech.trend}:${tech.rsi}:${tech.rangePercentile}:${tech.atKeyLevel}:${tech.basedOnSample}`
    : "none";
  const canonical = `${crop}::${usda}::${links}::${dir}::${econ}::${dem}::${mf}::${mac}::${tch}::${seasonalLine}`;
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

// ── generation + cache ───────────────────────────────────────────────────────

const memCache = new Map<string, { outlook: OutlookV2; ts: number }>();

export async function getMarketOutlook(
  crop: Crop,
  farmId: string,
  now: Date,
): Promise<OutlookV2 | null> {
  const corpus = await assembleCorpus(crop, farmId, now);

  // DB cache: latest read for this crop, reused only if the corpus is unchanged
  // and not too old.
  const latest = await readLatestOutlookV2(crop);
  if (
    latest &&
    latest.corpus_hash === corpus.hash &&
    Date.now() - new Date(latest.generated_at).getTime() < MAX_AGE_MS &&
    latest.payload
  ) {
    return latest.payload as OutlookV2;
  }

  // in-memory fallback (covers dev before 0007, avoids re-calling Claude)
  const memKey = `${crop}:${corpus.hash}`;
  const mem = memCache.get(memKey);
  if (mem && Date.now() - mem.ts < MAX_AGE_MS) return mem.outlook;

  if (!process.env.ANTHROPIC_API_KEY) {
    return latest?.payload ? (latest.payload as OutlookV2) : null;
  }

  const generated = await generate(crop, corpus, now);
  if (!generated) {
    // generation failed — serve the last good read rather than nothing
    return latest?.payload ? (latest.payload as OutlookV2) : null;
  }

  await writeOutlookV2(
    crop,
    corpus.hash,
    generated,
    generated.model,
    generated.generatedAt,
  );
  memCache.set(memKey, { outlook: generated, ts: Date.now() });
  return generated;
}

async function generate(
  crop: Crop,
  corpus: Corpus,
  now: Date,
): Promise<OutlookV2 | null> {
  try {
    const client = new Anthropic({ maxRetries: 4 });
    const resp = await client.messages.create({
      model: OUTLOOK_MODEL,
      max_tokens: 2800,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_market_read" },
      messages: [
        {
          role: "user",
          content: `Produce the structured market read for a ${CROP_LABEL[crop]} farmer who still has grain to price, using ONLY the corpus below. Cite a source_id for every factor.\n\n${corpus.contextText}`,
        },
      ],
    });

    const block = resp.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    const input = block.input as {
      signal?: string;
      summary?: string;
      factors?: { direction?: string; text?: string; source_id?: string }[];
      dominant_tension?: { force_up?: string; force_down?: string; leans?: string; why?: string };
      watched_context?: {
        bucket?: string;
        state?: string;
        lean?: string;
        emphasis?: string;
        is_driver?: boolean;
      }[];
      watch_items?: string[];
    };

    const signal: Signal = (
      ["favorable", "mixed", "unfavorable"] as const
    ).includes(input.signal as Signal)
      ? (input.signal as Signal)
      : "mixed";

    const factors: OutlookFactorV2[] = (input.factors ?? [])
      .filter((f) => f.text)
      .slice(0, 5)
      .map((f) => ({
        direction: (["up", "down", "neutral"] as const).includes(
          f.direction as OutlookFactorV2["direction"],
        )
          ? (f.direction as OutlookFactorV2["direction"])
          : "neutral",
        text: String(f.text),
        source: f.source_id ? (corpus.sources.get(f.source_id) ?? null) : null,
      }));

    const watchItems = (input.watch_items ?? [])
      .filter((s) => typeof s === "string" && s.trim())
      .slice(0, 3)
      .map((s) => s.trim());

    const dt = input.dominant_tension;
    const dominantTension: DominantTension | null =
      dt && (dt.force_up || dt.force_down)
        ? {
            forceUp: String(dt.force_up ?? "").trim(),
            forceDown: String(dt.force_down ?? "").trim(),
            leans: (["up", "down", "balanced"] as const).includes(dt.leans as "up")
              ? (dt.leans as DominantTension["leans"])
              : "balanced",
            why: String(dt.why ?? "").trim(),
          }
        : null;

    const BUCKET_LABELS: Record<string, string> = {
      supply: "Supply",
      demand: "Demand",
      money_flow: "Money flow",
      macro: "Macro",
      technicals: "Technicals",
      conditions: "Conditions",
    };
    const watchedContext: WatchedBucket[] = (input.watched_context ?? [])
      .filter((w) => w.bucket && w.state)
      .map((w) => ({
        bucket: BUCKET_LABELS[w.bucket as string] ?? String(w.bucket),
        state: String(w.state).trim(),
        lean: (["up", "down", "neutral"] as const).includes(w.lean as "up")
          ? (w.lean as WatchedBucket["lean"])
          : "neutral",
        emphasis: (["high", "medium", "low"] as const).includes(w.emphasis as "high")
          ? (w.emphasis as WatchedBucket["emphasis"])
          : "medium",
        isDriver: Boolean(w.is_driver),
      }));

    return {
      crop,
      signal,
      summary: String(input.summary ?? "").trim(),
      factors,
      seasonalContext: corpus.seasonalContext,
      dominantTension,
      watchedContext,
      macroContext: corpus.macroContext,
      watchItems,
      freshness: corpus.freshness,
      model: OUTLOOK_MODEL,
      generatedAt: now.toISOString(),
      disclaimer: DISCLAIMER,
      attribution: NASS_ATTRIBUTION,
      sampleData: corpus.sampleData,
    };
  } catch {
    return null;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function pctOver(values: number[], daysBack: number): number | null {
  const i = values.length - 1 - daysBack;
  if (i < 0) return null;
  const base = values[i];
  if (!base) return null;
  return ((values[values.length - 1] - base) / base) * 100;
}

function fmtPct(p: number | null): string {
  if (p == null) return "n/a";
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

function fmtDay(iso: string | null): string {
  if (!iso) return "n/a";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "n/a";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}
