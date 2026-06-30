import "server-only";

import { readLatestOutlookV2 } from "@/lib/outlook/cache";
import { econLastFetched, readLatestEconBundles, readReportCalendar } from "@/lib/outlook/econ-cache";
import { releasedReports, upcomingReports } from "@/lib/outlook/econ-ingest";
import type { EconBundle, EconFrame } from "@/lib/outlook/econ-types";
import type { OutlookFactorV2, OutlookV2 } from "@/lib/outlook/synthesis";
import type { Crop } from "@/lib/types/database";

import type { TaggedArticle } from "./tagging";

export type Direction = "up" | "down" | "neutral";

export type EventResult = {
  crop: Crop;
  metric: string;
  valueLabel: string; // "9,024 mil bu"
  deltaLabel: string | null; // "+877 vs 2025 (+10.8%)"
  direction: Direction; // price impact of the figure
  sourceUrl: string;
};

export type ReleasedEvent = {
  reportType: string;
  label: string;
  releaseDate: string;
  daysAgo: number;
  description: string;
  results: EventResult[];
  takeaway: { text: string; direction: Direction; fromEngine: boolean } | null;
  articles: { link: string; source: string; title: string }[];
};

export type UpcomingEvent = {
  reportType: string;
  label: string;
  releaseDate: string;
  daysUntil: number;
  description: string;
  whatToWatch: string;
};

const LABEL: Record<string, string> = {
  wasde: "WASDE",
  grain_stocks: "Grain Stocks",
  acreage: "Acreage",
  prospective_plantings: "Prospective Plantings",
  export_sales: "Export Sales",
  crop_progress: "Crop Progress",
  cot: "Commitment of Traders",
  cftc: "Commitment of Traders",
};
const labelFor = (t: string) =>
  LABEL[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Why each upcoming report matters — the watch-item framing, farmer-facing.
const WHY: Record<string, string> = {
  wasde: "USDA's monthly balance sheet — ending stocks set the supply tone for price.",
  grain_stocks: "How many bushels are actually in bins — confirms or challenges the demand pace.",
  acreage: "Final planted acres vs. March intentions — a big revision resets the whole crop size.",
  prospective_plantings: "Farmers' planting intentions — the first read on this year's crop size.",
  export_sales: "Weekly demand signal — strong China buying is supportive, cancellations bearish.",
  crop_progress: "Condition ratings and development pace — a proxy for yield as the crop grows.",
  cot: "How the big managed-money funds are positioned — crowded bets can unwind hard.",
};
const whyFor = (t: string) => WHY[t] ?? "A scheduled USDA release the market watches.";

// Headline metric to surface per report type (keyword match against frame.metric).
const HEADLINE: Record<string, string> = {
  grain_stocks: "stock",
  wasde: "ending stock",
  acreage: "acre",
  prospective_plantings: "acre",
};

// Keywords that mark a news article as being about a given report.
const KEYWORDS: Record<string, string[]> = {
  grain_stocks: ["stock"],
  acreage: ["acre", "planted", "acreage"],
  wasde: ["wasde", "balance sheet", "ending stock"],
  prospective_plantings: ["planting", "intention", "acre"],
  export_sales: ["export", "china", "sales"],
};

const fmt = (n: number) =>
  Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : (Math.round(n * 10) / 10).toLocaleString();

function headlineFrame(b: EconBundle): EconFrame | null {
  if (b.frames.length === 0) return null;
  const kw = HEADLINE[b.reportType];
  if (kw) {
    const hit = b.frames.find((f) => f.metric.toLowerCase().includes(kw) && f.value != null);
    if (hit) return hit;
  }
  return b.frames.find((f) => f.value != null) ?? b.frames[0];
}

// These reports are all supply-side: a bigger figure YoY is bearish for price.
function priceDirection(deltaYear: number | null): Direction {
  if (deltaYear == null || deltaYear === 0) return "neutral";
  return deltaYear > 0 ? "down" : "up";
}

function buildResult(b: EconBundle): EventResult | null {
  const f = headlineFrame(b);
  if (!f || f.value == null) return null;
  let deltaLabel: string | null = null;
  if (f.deltaYear != null && f.priorYearValue) {
    const pct = (f.deltaYear / f.priorYearValue) * 100;
    const sign = f.deltaYear > 0 ? "+" : "";
    deltaLabel = `${sign}${fmt(f.deltaYear)} vs ${f.priorYearLabel ?? "last year"} (${sign}${fmt(pct)}%)`;
  } else if (f.deltaYear != null) {
    const sign = f.deltaYear > 0 ? "+" : "";
    deltaLabel = `${sign}${fmt(f.deltaYear)} vs ${f.priorYearLabel ?? "last year"}`;
  }
  return {
    crop: b.crop,
    metric: f.metric,
    valueLabel: `${fmt(f.value)} ${f.unit}`,
    deltaLabel,
    direction: priceDirection(f.deltaYear),
    sourceUrl: b.sourceUrl,
  };
}

// The engine's actual read of the release — the outlook factor that cites it.
function engineTakeaway(reportType: string, factors: OutlookFactorV2[]): { text: string; direction: Direction } | null {
  const want = labelFor(reportType).toLowerCase();
  const hit = factors.find((f) => f.source?.label?.toLowerCase().includes(want));
  return hit ? { text: hit.text, direction: hit.direction } : null;
}

function derivedTakeaway(results: EventResult[]): { text: string; direction: Direction } | null {
  const r = results.find((x) => x.direction !== "neutral") ?? results[0];
  if (!r || !r.deltaLabel) return null;
  const more = r.direction === "down";
  return {
    text: `${r.crop === "corn" ? "Corn" : "Soybean"} ${r.metric.toLowerCase()} ${r.valueLabel}, ${r.deltaLabel} — ${more ? "heavier supply, pressuring" : "tighter, supportive"}.`,
    direction: r.direction,
  };
}

function relatedArticles(reportType: string, releaseDate: string, news: TaggedArticle[]) {
  const rel = Date.parse(releaseDate + "T00:00:00Z");
  const kws = KEYWORDS[reportType] ?? [];
  return news
    .filter((n) => {
      if (!n.publishedAt) return false;
      const d = Date.parse(n.publishedAt);
      const days = (d - rel) / 86_400_000;
      if (days < -2 || days > 4) return false; // around the release window
      const hay = `${n.title} ${n.summary ?? ""}`.toLowerCase();
      return kws.some((k) => hay.includes(k)) || hay.includes("usda");
    })
    .slice(0, 3)
    .map((n) => ({ link: n.link, source: n.source, title: n.title }));
}

export type EventsTimeline = {
  upcoming: UpcomingEvent[];
  released: ReleasedEvent[];
  fetchedAt: number | null;
};

/** Build the farmer-facing events timeline from the calendar, ingested bundles, and the engine's read. */
export async function getEventsTimeline(news: TaggedArticle[]): Promise<EventsTimeline> {
  const [bundles, calendar, fetchedAt, cornRow, soyRow] = await Promise.all([
    readLatestEconBundles(),
    readReportCalendar(),
    econLastFetched(),
    readLatestOutlookV2("corn"),
    readLatestOutlookV2("soybean"),
  ]);
  const now = new Date();

  const factors: OutlookFactorV2[] = [cornRow, soyRow]
    .flatMap((r) => ((r?.payload as OutlookV2 | undefined)?.factors ?? []) as OutlookFactorV2[]);

  const upcoming: UpcomingEvent[] = upcomingReports(calendar, now, bundles).map((e) => ({
    reportType: e.reportType,
    label: labelFor(e.reportType),
    releaseDate: e.releaseDate,
    daysUntil: e.daysUntil,
    description: e.description,
    whatToWatch: whyFor(e.reportType),
  }));

  const released: ReleasedEvent[] = releasedReports(calendar, now, bundles).map((e) => {
    const evMs = Date.parse(e.releaseDate + "T00:00:00Z");
    // Only surface a crop's figure if its bundle is genuinely FROM this release
    // (releasedAt on/after the event date) — never a stale prior vintage under a
    // newer event label.
    const results = (["corn", "soybean"] as Crop[])
      .map((c) => {
        const fromRelease = bundles
          .filter((b) => b.reportType === e.reportType && b.crop === c && b.releasedAt && Date.parse(b.releasedAt) >= evMs)
          .sort((a, b) => Date.parse(b.releasedAt!) - Date.parse(a.releasedAt!));
        return fromRelease[0] ? buildResult(fromRelease[0]) : null;
      })
      .filter((r): r is EventResult => !!r);
    const engine = engineTakeaway(e.reportType, factors);
    const takeaway = engine
      ? { ...engine, fromEngine: true }
      : (() => {
          const d = derivedTakeaway(results);
          return d ? { ...d, fromEngine: false } : null;
        })();
    return {
      reportType: e.reportType,
      label: labelFor(e.reportType),
      releaseDate: e.releaseDate,
      daysAgo: -e.daysUntil,
      description: e.description,
      results,
      takeaway,
      articles: relatedArticles(e.reportType, e.releaseDate, news),
    };
  });

  return { upcoming, released, fetchedAt };
}
