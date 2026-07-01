import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { EventsTracker } from "@/components/news/events-tracker";
import { NewsFeed } from "@/components/news/news-feed";
import { getEventsTimeline } from "@/lib/news/events";
import { getTaggedNews } from "@/lib/news/tagging";
import { newsLastFetched } from "@/lib/outlook/cache";

export const metadata: Metadata = { title: "News & Events" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  // allSettled so a single failing source (tagging model, the calendar) degrades
  // one section rather than blanking the whole page.
  const [articlesR, fetchedR] = await Promise.allSettled([getTaggedNews(40), newsLastFetched()]);
  const articles = articlesR.status === "fulfilled" ? articlesR.value : [];
  const fetchedAt = fetchedR.status === "fulfilled" ? fetchedR.value : null;
  const events = await getEventsTimeline(articles).catch(() => ({ upcoming: [], released: [], fetchedAt: null }));

  const sources = new Set(articles.map((a) => a.source)).size;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="News & Events"
        subtitle="Every article the engine reads, tagged by market impact — plus the USDA report calendar, from countdown to result."
      />

      <div className="space-y-4">
        <NewsFeed articles={articles} />
        <EventsTracker upcoming={events.upcoming} released={events.released} />

        <p className="text-text-tertiary px-1 text-center text-[11px]">
          {articles.length} articles from {sources} sources · corpus refreshed {ago(fetchedAt)}. Real ag-news
          and the live USDA calendar — nothing fabricated.
        </p>
      </div>
    </div>
  );
}

function ago(ts: number | null): string {
  if (!ts) return "—";
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
