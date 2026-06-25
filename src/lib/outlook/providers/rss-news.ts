import "server-only";

import { parseFeed } from "../rss";
import { classifyNews, FEEDS, type FeedSource } from "../sources";
import type { NewsItem, NewsProvider } from "../types";

const FETCH_TIMEOUT_MS = 12_000;
const PER_FEED_LIMIT = 25; // cap each feed's contribution before filtering

/**
 * Aggregates ag-news from the configured RSS feeds. FAULT-TOLERANT BY DESIGN:
 * each feed is fetched and parsed independently, a failure is logged and
 * skipped, and whatever succeeded is returned. One dead feed never breaks the
 * pipeline. Swap/extend feeds in sources.ts — this class doesn't change.
 */
export class RssNewsProvider implements NewsProvider {
  readonly name = "rss";

  async getItems(): Promise<NewsItem[]> {
    const fetchedAt = new Date().toISOString();
    const results = await Promise.allSettled(
      FEEDS.map((feed) => this.fetchFeed(feed, fetchedAt)),
    );

    const seen = new Set<string>();
    const items: NewsItem[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.warn(`[outlook] feed failed: ${FEEDS[i].name}`, r.reason);
        return;
      }
      for (const item of r.value) {
        if (seen.has(item.link)) continue; // dedup across feeds
        seen.add(item.link);
        items.push(item);
      }
    });

    // newest first
    items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    return items;
  }

  private async fetchFeed(
    feed: FeedSource,
    fetchedAt: string,
  ): Promise<NewsItem[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FurrowBot/1.0)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const raw = parseFeed(xml).slice(0, PER_FEED_LIMIT);

      const out: NewsItem[] = [];
      for (const item of raw) {
        const tags = classifyNews(item.title, item.summary ?? "");
        if (!tags) continue; // filtered: not grain-market relevant
        out.push({
          link: item.link,
          source: feed.name,
          title: item.title,
          summary: item.summary,
          publishedAt: item.publishedAt,
          cropTags: tags,
          fetchedAt,
        });
      }
      return out;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const newsProvider: NewsProvider = new RssNewsProvider();
