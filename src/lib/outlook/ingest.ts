import "server-only";

import {
  newsLastFetched,
  readNewsItems,
  readReportBundles,
  reportsLastFetched,
  writeNewsItems,
  writeReportBundle,
} from "./cache";
import { reportProvider } from "./providers/nass";
import { newsProvider } from "./providers/rss-news";
import type { NewsItem, ReportBundle } from "./types";

const NEWS_TTL_MS = 6 * 60 * 60 * 1000; // refresh a few times a day
const REPORTS_TTL_MS = 24 * 60 * 60 * 1000; // USDA doesn't change intraday

function isStale(last: number | null, ttl: number): boolean {
  return last == null || Date.now() - last >= ttl;
}

/** Fetch fresh news (if stale) and write it. Never throws. */
export async function refreshNews(force = false): Promise<number> {
  try {
    if (!force && !isStale(await newsLastFetched(), NEWS_TTL_MS)) return 0;
    const items = await newsProvider.getItems();
    return await writeNewsItems(items);
  } catch (e) {
    console.warn("[outlook] refreshNews failed", e);
    return 0;
  }
}

/** Fetch fresh USDA reports (if stale) and write them. Never throws. */
export async function refreshReports(force = false): Promise<number> {
  try {
    if (!force && !isStale(await reportsLastFetched(), REPORTS_TTL_MS)) return 0;
    const bundles = await reportProvider.getReports();
    let written = 0;
    for (const b of bundles) if (await writeReportBundle(b)) written++;
    return written;
  } catch (e) {
    console.warn("[outlook] refreshReports failed", e);
    return 0;
  }
}

export type SourcesSnapshot = {
  news: NewsItem[];
  reports: ReportBundle[];
  newsFetchedAt: number | null;
  reportsFetchedAt: number | null;
};

/**
 * The view the verification surface renders: refresh-on-read (each source
 * independent and fault-tolerant), then return everything cached. A failed
 * refresh just serves the last good cache.
 */
export async function getSourcesSnapshot(
  force = false,
): Promise<SourcesSnapshot> {
  await Promise.allSettled([refreshNews(force), refreshReports(force)]);
  const [news, reports, newsFetchedAt, reportsFetchedAt] = await Promise.all([
    readNewsItems(),
    readReportBundles(),
    newsLastFetched(),
    reportsLastFetched(),
  ]);
  return { news, reports, newsFetchedAt, reportsFetchedAt };
}
