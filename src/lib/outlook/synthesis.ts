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
export type OutlookV2 = {
  crop: Crop;
  signal: Signal;
  summary: string;
  factors: OutlookFactorV2[];
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

1. GROUNDING. Reason ONLY over the corpus provided in the user message. Every factor MUST cite a real source_id that appears in the corpus (e.g. U1, N3, P1). If a claim is not backed by a corpus item, do not make it. Never invent or estimate numbers, prices, percentages, bushel figures, quotes, or report results. The ONLY authoritative figures are the USDA [U#] items — do not quote numeric figures from news items, treat those as soft qualitative context.

2. CONDITION-RATING HUMILITY. Crop condition ratings (the % good/excellent) reflect CURRENT MARKET SENTIMENT, not future yield. They are weak yield predictors, especially early in the season, and they swing — e.g. Illinois ratings fell sharply in June 2023 and then recovered, with yields fine. When a factor rests on condition ratings, treat them as "what the market is reacting to right now," explicitly NOT as a yield forecast, and say so in the factor text. Never translate a condition rating into a yield or price prediction.

3. NOT ADVICE. You are not a financial advisor and never give a trade instruction. Never say or imply "sell", "buy", "lock in", "hold off", "price it", or any directive to transact. The signal is a RELATIVE LEAN describing current conditions, which the farmer weighs themselves: "favorable" = conditions currently lean supportive of price; "mixed" = signals conflict or there's no clear lean; "unfavorable" = conditions currently lean unsupportive. These describe the market, not an action.

4. HONEST ON THIN DATA. Your read is only as good as the corpus. If it is sparse, stale, or the items don't clearly point anywhere, say so plainly ("limited new information this week") and lean "mixed" rather than manufacture a confident story. Do not overstate. Reporting uncertainty honestly is correct and valued.

5. FACT vs INTERPRETATION. Within each factor, separate what was reported from what it may mean. State the fact first (e.g. "USDA reports U.S. corn 68% good/excellent"), then a qualified interpretation (e.g. "— a level the market has read as comfortable supply, which is sentiment, not a yield call"). Keep interpretation tentative.

OUTPUT:
- signal: the three-state relative lean defined above.
- summary: 2–4 calm, plain sentences on what is currently pushing this crop's price up versus down, and the net lean. No fabricated numbers; you may reference the trend and the USDA figures provided.
- factors: 2–5 items. Each carries a direction (up = supports price, down = pressures price, neutral), a short plain-English claim, and the source_id that backs it.
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
      watch_items: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: { type: "string" },
        description: "Concrete things to watch next, grounded in the corpus.",
      },
    },
    required: ["signal", "summary", "factors", "watch_items"],
  },
};

// ── corpus assembly ──────────────────────────────────────────────────────────

type Corpus = {
  contextText: string;
  sources: Map<string, OutlookSource>;
  freshness: OutlookV2["freshness"];
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
    hash: hashCorpus(crop, reports, news, dir),
    sampleData,
  };
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
): string {
  const usda = reports
    .map(
      (b) =>
        `${b.reportType}:${b.geography}:${b.period}:${b.points.map((p) => `${p.label}=${p.value}`).join(",")}`,
    )
    .sort()
    .join("|");
  const links = news.map((n) => n.link).sort().join("|");
  const canonical = `${crop}::${usda}::${links}::${dir}`;
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
      max_tokens: 1400,
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

    return {
      crop,
      signal,
      summary: String(input.summary ?? "").trim(),
      factors,
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
