import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { Crop } from "@/lib/types/database";

import {
  readOutlookCache,
  writeOutlookCache,
  type OutlookRow,
} from "./cache";
import { stubHeadlines } from "./news-stub";
import { getFuturesHistory } from "./service";
import { CROP_LABEL, CROP_TO_SYMBOL } from "./symbols";

export const OUTLOOK_MODEL = "claude-sonnet-4-6";
const OUTLOOK_TTL_MS = 8 * 60 * 60 * 1000; // regenerate ~3×/day, not per load
const DISCLAIMER =
  "This is market context, not financial or trading advice. You decide.";

export type Signal = "favorable" | "mixed" | "unfavorable";
export type OutlookFactor = {
  text: string;
  direction: "up" | "down" | "neutral";
};
export type Outlook = {
  signal: Signal;
  summary: string;
  factors: OutlookFactor[];
  disclaimer: string;
  model: string;
  generatedAt: string;
  trendNote: string;
  sampleData: boolean;
};

// In-memory fallback cache for when the DB cache table isn't available yet
// (0003 not applied) — avoids re-calling Claude on every page load in dev.
const memCache = new Map<Crop, { outlook: Outlook; ts: number }>();

// ── The guardrails. This frames the read as CONTEXT, never a trade signal. ───
const SYSTEM = `You are a grain-market context assistant for a U.S. row-crop farmer. Your job is to explain, in plain English, what is currently pushing corn or soybean futures UP versus DOWN, and to give a single RELATIVE read.

HARD RULES — these are absolute:
- You are NOT a trading signal and NOT a financial advisor. NEVER tell the user to buy or sell. NEVER say or imply "sell now", "buy now", "lock it in", or any directive to transact.
- Frame everything as context the farmer weighs themselves. The read is a relative lean, not a recommendation or prediction of price.
- Use ONLY the data provided in the user message. Do NOT invent or cite prices, percentages, USDA numbers, bushel figures, or any statistic that is not given to you. You MAY reference the trend figures provided. If something lacks data, say so or describe it qualitatively.
- The three states mean, relative to a farmer who still has grain to price: "favorable" = conditions currently lean supportive; "mixed" = signals conflict, a hold/wait read; "unfavorable" = conditions currently lean unsupportive. These describe the market lean, not an instruction.
- The news headlines you are given are an ILLUSTRATIVE PLACEHOLDER feed, not live aggregation — treat them as soft context, do not quote figures from them, and do not over-weight them.
- Keep the summary calm, non-alarmist, plain-English, 2–4 sentences.
- Each "factor" is one short clause tagged: "up" (pushing price up), "down" (pushing price down), or "neutral".

Record your read by calling the record_market_read tool. Provide 2 to 4 factors.`;

const TOOL: Anthropic.Tool = {
  name: "record_market_read",
  description: "Record the structured market read for the farmer.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      signal: {
        type: "string",
        enum: ["favorable", "mixed", "unfavorable"],
        description: "The relative market lean. NOT a buy/sell instruction.",
      },
      summary: {
        type: "string",
        description:
          "2-4 calm, plain-English sentences on what is pushing the market up vs down. No fabricated numbers.",
      },
      factors: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: { type: "string", description: "One short clause." },
            direction: {
              type: "string",
              enum: ["up", "down", "neutral"],
            },
          },
          required: ["text", "direction"],
        },
      },
    },
    required: ["signal", "summary", "factors"],
  },
};

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

export async function getOutlook(crop: Crop, now: Date): Promise<Outlook | null> {
  // 1. DB cache (fresh < 8h)
  const cached = await readOutlookCache(crop);
  if (
    cached &&
    Date.now() - new Date(cached.generated_at).getTime() < OUTLOOK_TTL_MS
  ) {
    return rowToOutlook(cached);
  }
  // in-memory fallback cache
  const mem = memCache.get(crop);
  if (mem && Date.now() - mem.ts < OUTLOOK_TTL_MS) return mem.outlook;

  if (!process.env.ANTHROPIC_API_KEY) return null;

  // 2. Compose inputs from OUR data (never the raw API)
  const symbol = CROP_TO_SYMBOL[crop];
  const history = await getFuturesHistory(symbol, now);
  const values = history.points.map((p) => p.value);
  const latest = values[values.length - 1];
  const w = pctOver(values, 5);
  const m = pctOver(values, 21);
  const dir =
    m == null ? "flat" : m > 1 ? "rising" : m < -1 ? "falling" : "sideways";
  const trendNote = `30-day trend ${dir} (${fmtPct(m)})`;
  const sampleData = history.source === "sample";

  const headlines = stubHeadlines(crop)
    .map((h) => `- ${h.headline} [${h.source}]`)
    .join("\n");

  const userText = `Crop: ${CROP_LABEL[crop]}

Futures trend (from our price history${sampleData ? " — SAMPLE data, no live feed connected yet" : ""}):
- Latest front-month close: $${latest.toFixed(2)}/bu
- 1-week change: ${fmtPct(w)}
- 1-month change: ${fmtPct(m)}
- 30-day direction: ${dir}

Recent news headlines (ILLUSTRATIVE PLACEHOLDER feed — not live aggregation; do not quote figures from these, treat as soft context):
${headlines}

Produce the structured market read for a farmer who still has ${CROP_LABEL[crop].toLowerCase()} to price. Remember: a relative lean, never a buy/sell instruction.`;

  // 3. Claude (model per spec: claude-sonnet-4-6), forced structured tool call.
  // Bump retries so a transient 429/529 (overloaded) doesn't drop the outlook —
  // the SDK retries 429/5xx with exponential backoff.
  try {
    const client = new Anthropic({ maxRetries: 4 });
    const resp = await client.messages.create({
      model: OUTLOOK_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_market_read" },
      messages: [{ role: "user", content: userText }],
    });

    const block = resp.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    const input = block.input as {
      signal?: string;
      summary?: string;
      factors?: { text?: string; direction?: string }[];
    };

    const signal: Signal = (["favorable", "mixed", "unfavorable"] as const).includes(
      input.signal as Signal,
    )
      ? (input.signal as Signal)
      : "mixed";
    const factors: OutlookFactor[] = (input.factors ?? [])
      .filter((f) => f.text)
      .slice(0, 4)
      .map((f) => ({
        text: String(f.text),
        direction: (["up", "down", "neutral"] as const).includes(
          f.direction as OutlookFactor["direction"],
        )
          ? (f.direction as OutlookFactor["direction"])
          : "neutral",
      }));

    const outlook: Outlook = {
      signal,
      summary: String(input.summary ?? "").trim(),
      factors,
      disclaimer: DISCLAIMER,
      model: OUTLOOK_MODEL,
      generatedAt: now.toISOString(),
      trendNote,
      sampleData,
    };

    // 4. cache (DB if available, else in-memory)
    await writeOutlookCache({
      crop,
      signal: outlook.signal,
      summary: outlook.summary,
      factors: outlook.factors,
      model: outlook.model,
      generated_at: outlook.generatedAt,
    });
    memCache.set(crop, { outlook, ts: Date.now() });
    return outlook;
  } catch {
    return null;
  }
}

function rowToOutlook(row: OutlookRow): Outlook {
  return {
    signal: (["favorable", "mixed", "unfavorable"] as const).includes(
      row.signal as Signal,
    )
      ? (row.signal as Signal)
      : "mixed",
    summary: row.summary,
    factors: (row.factors ?? []).map((f) => ({
      text: f.text,
      direction: (["up", "down", "neutral"] as const).includes(
        f.direction as OutlookFactor["direction"],
      )
        ? (f.direction as OutlookFactor["direction"])
        : "neutral",
    })),
    disclaimer: DISCLAIMER,
    model: row.model,
    generatedAt: row.generated_at,
    trendNote: "",
    sampleData: false,
  };
}
