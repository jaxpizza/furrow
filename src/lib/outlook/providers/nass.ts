import "server-only";

import { normalize, type NassRow } from "../nass-normalize";
import {
  NASS_COMMODITY,
  NASS_QUERIES,
  type NassQuery,
} from "../sources";
import type { ReportBundle, ReportProvider } from "../types";

const BASE = "https://quickstats.nass.usda.gov/api";
const RECORD_LIMIT = 50_000; // NASS hard cap per request
const FETCH_TIMEOUT_MS = 20_000;

/**
 * USDA NASS Quick Stats implementation of ReportProvider. FAULT-TOLERANT: each
 * configured query runs independently (get_counts → fetch → normalize); a hiccup
 * on one query is logged and skipped, the rest still return. Calls get_counts
 * first to stay under the 50k-record cap. Swap/extend queries in sources.ts.
 */
export class NassReportProvider implements ReportProvider {
  readonly name = "usda-nass";
  private readonly key: string | undefined;

  constructor(key = process.env.USDA_NASS_KEY) {
    this.key = key;
  }

  async getReports(): Promise<ReportBundle[]> {
    if (!this.key) {
      console.warn("[outlook] USDA_NASS_KEY not set — skipping USDA reports");
      return [];
    }
    const fetchedAt = new Date().toISOString();
    const results = await Promise.allSettled(
      NASS_QUERIES.map((q) => this.runQuery(q, fetchedAt)),
    );
    const bundles: ReportBundle[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const q = NASS_QUERIES[i];
        console.warn(
          `[outlook] NASS query failed: ${q.reportType} ${q.crop} ${q.geography}`,
          r.reason,
        );
      } else if (r.value) {
        bundles.push(r.value);
      }
    });
    return bundles;
  }

  /** Query params (no key) — also the keyless, reproducible grounding URL. */
  private params(q: NassQuery): string {
    const geo =
      q.geography === "IL"
        ? "agg_level_desc=STATE&state_alpha=IL"
        : "agg_level_desc=NATIONAL";
    return (
      `commodity_desc=${NASS_COMMODITY[q.crop]}` +
      `&statisticcat_desc=${q.statCat}` +
      `&${geo}&${q.yearParam}&format=JSON`
    );
  }

  private async getJson(url: string): Promise<unknown | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async runQuery(
    q: NassQuery,
    fetchedAt: string,
  ): Promise<ReportBundle | null> {
    const params = this.params(q);

    // 1. count guard — never blow past the 50k cap
    const counts = (await this.getJson(
      `${BASE}/get_counts/?key=${this.key}&${params}`,
    )) as { count?: number } | null;
    const count = counts?.count ?? 0;
    if (count === 0) return null; // nothing published yet for this scope
    if (count > RECORD_LIMIT) {
      console.warn(`[outlook] NASS count ${count} > cap for ${q.reportType} ${q.crop} ${q.geography}`);
      return null;
    }

    // 2. fetch
    const data = (await this.getJson(
      `${BASE}/api_GET/?key=${this.key}&${params}`,
    )) as { data?: NassRow[] } | null;
    const rows = data?.data ?? [];
    if (rows.length === 0) return null;

    // 3. normalize
    const points = normalize(rows, q.reportType);
    if (points.length === 0) return null;

    return {
      reportType: q.reportType,
      crop: q.crop,
      geography: q.geography,
      period: q.period,
      sourceUrl: `${BASE}/api_GET/?${params}`, // keyless — reproducible grounding
      fetchedAt,
      points,
    };
  }
}

export const reportProvider: ReportProvider = new NassReportProvider();
