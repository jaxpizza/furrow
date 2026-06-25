import type { Crop } from "@/lib/types/database";

import type { Geography, ReportType } from "./types";

/**
 * ── AG-NEWS RSS FEEDS ────────────────────────────────────────────────────────
 * The one place to edit the feed list. Add/remove a line and the pipeline picks
 * it up — nothing else changes. Each was verified to return parseable RSS
 * server-side (June 2026). Heavily Illinois/grain-weighted on purpose.
 *
 * Known-blocked (Cloudflare / bot walls) and therefore omitted for now: AgWeb,
 * Successful Farming (agriculture.com), DTN/Progressive Farmer. They can be
 * added here later via a fetch proxy or their official APIs.
 */
export type FeedSource = { name: string; url: string };

export const FEEDS: FeedSource[] = [
  {
    name: "farmdoc daily (U of I)",
    url: "https://farmdocdaily.illinois.edu/feed",
  },
  {
    name: "Farm Policy News (U of I)",
    url: "https://farmpolicynews.illinois.edu/feed/",
  },
  { name: "Brownfield Ag News", url: "https://www.brownfieldagnews.com/feed/" },
  { name: "Farm Progress", url: "https://www.farmprogress.com/rss.xml" },
  {
    name: "AgUpdate",
    url: "https://www.agupdate.com/search/?f=rss&t=article&l=50",
  },
];

/**
 * ── NEWS RELEVANCE FILTER ────────────────────────────────────────────────────
 * Keep only grain-market-relevant items, and tag which crops each touches.
 */
const CORN_RE = /\bcorn\b|\bmaize\b/i;
const SOY_RE = /\bsoybean|\bsoymeal\b|\bsoy oil\b|\bsoybeans\b|\bsoy\b/i;
// Grain-market signal words: an item is relevant if it hits any of these (or a
// crop name). Tuned to avoid letting generic "farm"/"market" noise through.
const MARKET_RE =
  /\bgrain\b|\bbushel|\bbasis\b|\bwasde\b|\bethanol\b|\bcrush\b|\bcbot\b|\bcme\b|\bexport|\bfutures\b|\byield\b|\bharvest|\bplant(?:ing|ed)\b|\bacreage\b|\bcrop (?:progress|condition|tour)\b|\bcommodit|\bcorn belt\b|\bnew crop\b|\bold crop\b|\bcarryout\b|\bstocks\b/i;

/** Returns the crop tags for an item, or null if it isn't grain-relevant. */
export function classifyNews(title: string, summary: string): string[] | null {
  const text = `${title} ${summary}`;
  const tags: string[] = [];
  if (CORN_RE.test(text)) tags.push("corn");
  if (SOY_RE.test(text)) tags.push("soybean");
  const marketRelevant = MARKET_RE.test(text);
  if (tags.length === 0 && !marketRelevant) return null; // drop: not grain news
  if (tags.length === 0) tags.push("grain"); // relevant but crop-agnostic
  return tags;
}

/**
 * ── USDA NASS QUERIES ────────────────────────────────────────────────────────
 * Corn + soybean, Illinois + national, for the report types that move the
 * market. Condition/progress are the in-season weekly reads; yield/production
 * are the recent estimates. Edit this list to pull more series.
 */
export type NassQuery = {
  reportType: ReportType;
  crop: Crop;
  geography: Geography;
  /** NASS statisticcat_desc */
  statCat: string;
  /** how to scope the year(s): a single current year, or a recent window */
  yearParam: string; // e.g. "year=2026" or "year__GE=2024"
  period: string; // the cache period label, e.g. "2026"
};

const NASS_COMMODITY: Record<Crop, string> = {
  corn: "CORN",
  soybean: "SOYBEANS",
};

const CURRENT_YEAR = "2026";

function buildQueries(): NassQuery[] {
  const out: NassQuery[] = [];
  const crops: Crop[] = ["corn", "soybean"];
  const geos: Geography[] = ["IL", "US"];
  for (const crop of crops) {
    for (const geography of geos) {
      // in-season weekly reads — current marketing year
      out.push({
        reportType: "condition",
        crop,
        geography,
        statCat: "CONDITION",
        yearParam: `year=${CURRENT_YEAR}`,
        period: CURRENT_YEAR,
      });
      out.push({
        reportType: "progress",
        crop,
        geography,
        statCat: "PROGRESS",
        yearParam: `year=${CURRENT_YEAR}`,
        period: CURRENT_YEAR,
      });
      // recent estimates — last couple of years
      out.push({
        reportType: "yield",
        crop,
        geography,
        statCat: "YIELD",
        yearParam: "year__GE=2024",
        period: "2024+",
      });
    }
  }
  return out;
}

export const NASS_QUERIES: NassQuery[] = buildQueries();

export const NASS_ATTRIBUTION =
  "This product uses the NASS API but is not endorsed or certified by NASS.";

export { NASS_COMMODITY };
