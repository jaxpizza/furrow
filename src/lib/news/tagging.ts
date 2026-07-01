import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { readNewsItems } from "@/lib/outlook/cache";
import type { NewsItem } from "@/lib/outlook/types";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Per-article sentiment, tagged ONCE on first encounter and stored in
// news_article_tags (global cache, service-role only). The page reads a cheap
// cached lookup; the model only runs for articles that have never been tagged.
const db = createServiceRoleClient;

// Same model the outlook synthesis uses, so the per-article read carries the
// same judgment as the engine's news read — just pinned per article and cached.
const TAG_MODEL = "claude-sonnet-4-6";

export type Sentiment = "bullish" | "bearish" | "neutral";

export type ArticleTag = {
  link: string;
  corn: Sentiment | null; // null = article doesn't bear on this crop
  soy: Sentiment | null;
  takeaway: string | null; // one line: "what this means for the market"
  model: string | null;
  taggedAt: string | null;
};

export type TaggedArticle = NewsItem & { tag: ArticleTag | null };

type TagRow = {
  link: string;
  corn_sentiment: string | null;
  soy_sentiment: string | null;
  takeaway: string | null;
  model: string | null;
  tagged_at: string | null;
};

const norm = (s?: string | null): Sentiment | null =>
  s === "bullish" || s === "bearish" || s === "neutral" ? s : null;

async function readTags(links: string[]): Promise<Map<string, ArticleTag>> {
  const map = new Map<string, ArticleTag>();
  if (links.length === 0) return map;
  try {
    const { data } = await db()
      .from("news_article_tags")
      .select("*")
      .in("link", links);
    for (const r of (data as TagRow[] | null) ?? []) {
      map.set(r.link, {
        link: r.link,
        corn: norm(r.corn_sentiment),
        soy: norm(r.soy_sentiment),
        takeaway: r.takeaway,
        model: r.model,
        taggedAt: r.tagged_at,
      });
    }
  } catch {
    /* missing migration / transient — degrade to no tags */
  }
  return map;
}

async function storeTags(tags: ArticleTag[]): Promise<void> {
  if (tags.length === 0) return;
  try {
    await db()
      .from("news_article_tags")
      .upsert(
        tags.map((t) => ({
          link: t.link,
          corn_sentiment: t.corn,
          soy_sentiment: t.soy,
          takeaway: t.takeaway,
          model: t.model,
        })),
        { onConflict: "link" },
      );
  } catch {
    /* best-effort cache write */
  }
}

const TAG_SYSTEM = `You are the news-reading layer of a grain-market intelligence engine for Illinois corn & soybean farmers who still have grain to price.

For EACH article, decide its likely PRICE impact for corn and for soybeans:
- "bullish" — points the cash/futures price UP (supportive)
- "bearish" — points the price DOWN (pressuring)
- "neutral" — relevant to the crop but no clear directional lean
- null — the article does not bear on that crop at all

Then write ONE short plain-English takeaway (≤ 18 words) of what it means for the market.

Framing rules (non-negotiable):
- Judge the SURPRISE / direction relative to expectations, not the absolute level.
- More supply / bigger crop / weaker demand → bearish. Tighter supply / stronger demand / crop threat → bullish.
- If you cannot confidently read the direction, use "neutral" and keep the takeaway honest ("mixed signals", "no clear read").
- NEVER give advice, NEVER predict a price. Describe the market read only. Be terse and concrete.`;

const TAG_TOOL: Anthropic.Tool = {
  name: "record_news_tags",
  description: "Record the per-crop sentiment tag and takeaway for each article, one entry per index.",
  input_schema: {
    type: "object",
    properties: {
      tags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number", description: "The [n] index of the article." },
            corn: { type: "string", enum: ["bullish", "bearish", "neutral", "none"] },
            soy: { type: "string", enum: ["bullish", "bearish", "neutral", "none"] },
            takeaway: { type: "string", description: "One line, ≤18 words. What it means for the market." },
          },
          required: ["index", "corn", "soy", "takeaway"],
        },
      },
    },
    required: ["tags"],
  },
};

async function tagBatch(items: NewsItem[]): Promise<ArticleTag[]> {
  if (items.length === 0 || !process.env.ANTHROPIC_API_KEY) return [];
  try {
    const client = new Anthropic({ maxRetries: 3, timeout: 45_000 });
    const list = items
      .map((n, i) => `[${i}] (${n.source}) ${n.title}${n.summary ? ` — ${n.summary.slice(0, 280)}` : ""}`)
      .join("\n");
    const resp = await client.messages.create({
      model: TAG_MODEL,
      max_tokens: 2000,
      system: TAG_SYSTEM,
      tools: [TAG_TOOL],
      tool_choice: { type: "tool", name: "record_news_tags" },
      messages: [
        {
          role: "user",
          content: `Tag these ${items.length} ag-news headlines. Return exactly one entry per index.\n\n${list}`,
        },
      ],
    });
    const block = resp.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return [];
    const raw = (block.input as { tags?: { index?: number; corn?: string; soy?: string; takeaway?: string }[] }).tags ?? [];
    const out: ArticleTag[] = [];
    for (const t of raw) {
      const it = items[t.index ?? -1];
      if (!it) continue;
      out.push({
        link: it.link,
        corn: norm(t.corn),
        soy: norm(t.soy),
        takeaway: t.takeaway?.trim() || null,
        model: TAG_MODEL,
        taggedAt: new Date().toISOString(),
      });
    }
    return out;
  } catch (e) {
    console.warn("[news] tag batch failed", e);
    return [];
  }
}

/**
 * Read the corpus joined with stored tags. Any article never seen before is
 * tagged in ONE batched model call (bounded), stored, and served from cache on
 * every subsequent load — the model never re-runs on an already-tagged article.
 */
export async function getTaggedNews(limit = 40): Promise<TaggedArticle[]> {
  const items = await readNewsItems(limit);
  const tagMap = await readTags(items.map((i) => i.link));
  const untagged = items.filter((i) => !tagMap.has(i.link));
  if (untagged.length > 0) {
    const fresh = await tagBatch(untagged.slice(0, 25)); // bound first-load cost
    await storeTags(fresh);
    for (const t of fresh) tagMap.set(t.link, t);
  }
  return items.map((i) => ({ ...i, tag: tagMap.get(i.link) ?? null }));
}

/** Background pre-tagging (cron/heartbeat): tag any untagged articles, store, return count. */
export async function tagUntaggedNews(limit = 25): Promise<number> {
  const items = await readNewsItems(60);
  const tagMap = await readTags(items.map((i) => i.link));
  const untagged = items.filter((i) => !tagMap.has(i.link)).slice(0, limit);
  if (untagged.length === 0) return 0;
  const fresh = await tagBatch(untagged);
  await storeTags(fresh);
  return fresh.length;
}
