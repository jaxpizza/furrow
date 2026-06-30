import "server-only";

import {
  econLastFetched,
  readLatestEconBundles,
  readReportCalendar,
  writeEconBundle,
} from "./econ-cache";
import { bucketStale, supplyComplete } from "./manifest";
import { econProvider } from "./providers/usda-econ";
import type { EconBundle, ReportCalendarEntry } from "./econ-types";

const ECON_TTL_MS = 12 * 60 * 60 * 1000; // USDA reports don't change intraday

/** Fetch + frame + store the supply data when stale — or sooner if an expected
 *  sub-report (WASDE / Grain Stocks / Acreage) is missing. Never throws. */
export async function refreshEcon(force = false): Promise<number> {
  try {
    if (!force) {
      const [last, cached] = await Promise.all([
        econLastFetched(),
        readLatestEconBundles(),
      ]);
      if (!bucketStale(last, supplyComplete(cached), ECON_TTL_MS)) return 0;
    }
    const bundles = await econProvider.getBundles();
    let n = 0;
    for (const b of bundles) if (await writeEconBundle(b)) n++;
    return n;
  } catch (e) {
    console.warn("[econ] refresh failed", e);
    return 0;
  }
}

export type UpcomingReport = ReportCalendarEntry & { daysUntil: number };

export type EconSnapshot = {
  bundles: EconBundle[];
  upcoming: UpcomingReport[];
  fetchedAt: number | null;
};

export async function getEconSnapshot(force = false): Promise<EconSnapshot> {
  await refreshEcon(force);
  const [bundles, calendar, fetchedAt] = await Promise.all([
    readLatestEconBundles(),
    readReportCalendar(),
    econLastFetched(),
  ]);
  return {
    bundles,
    upcoming: upcomingReports(calendar, new Date(), bundles),
    fetchedAt,
  };
}

/**
 * Upcoming releases, soonest first — the seeded dated reports plus the recurring
 * weekly Export Sales (next Thursday, computed not stored). Drives the UI
 * countdown and the synthesis watch_items.
 *
 * Release-aware: a report whose data has already LANDED is dropped from
 * "upcoming" the moment its numbers ingest — not at midnight. Without this, a
 * report dated today (daysUntil 0) lingers as "today" all afternoon after it
 * released, so the read could still say "watch for today's Acreage report" about
 * an event whose results are already in the supply data. We detect the release
 * from the ingested bundles (a bundle with releasedAt on/after the calendar
 * date), so the watch-item resolves cleanly as soon as the data flows in.
 */
export function upcomingReports(
  calendar: ReportCalendarEntry[],
  now: Date,
  bundles: EconBundle[] = [],
  limit = 6,
): UpcomingReport[] {
  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const dayUntil = (iso: string) =>
    Math.round((Date.parse(iso + "T00:00:00Z") - todayMs) / 86_400_000);

  // Latest release date we actually hold per report type, from the ingested data.
  const releasedAtByType = new Map<string, number>();
  for (const b of bundles) {
    if (!b.releasedAt) continue;
    const t = Date.parse(b.releasedAt);
    if (!Number.isFinite(t)) continue;
    const prev = releasedAtByType.get(b.reportType);
    if (prev == null || t > prev) releasedAtByType.set(b.reportType, t);
  }
  // A calendar event is resolved once we hold data released on/after its date.
  const isReleased = (e: ReportCalendarEntry) => {
    const latest = releasedAtByType.get(e.reportType);
    return latest != null && latest >= Date.parse(e.releaseDate + "T00:00:00Z");
  };

  const dated: UpcomingReport[] = calendar
    .map((e) => ({ ...e, daysUntil: dayUntil(e.releaseDate) }))
    .filter((e) => e.daysUntil >= 0 && !isReleased(e));

  // recurring: next Thursday (export sales release day)
  const thu = new Date(todayMs);
  const add = (4 - thu.getUTCDay() + 7) % 7; // 4 = Thursday
  thu.setUTCDate(thu.getUTCDate() + add);
  const thuIso = thu.toISOString().slice(0, 10);
  dated.push({
    reportType: "export_sales",
    releaseDate: thuIso,
    description: "Weekly Export Sales — demand signal (esp. China)",
    daysUntil: dayUntil(thuIso),
  });

  return dated.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, limit);
}
