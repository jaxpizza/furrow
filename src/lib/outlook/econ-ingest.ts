import "server-only";

import {
  econLastFetched,
  readLatestEconBundles,
  readReportCalendar,
  writeEconBundle,
} from "./econ-cache";
import { econProvider } from "./providers/usda-econ";
import type { EconBundle, ReportCalendarEntry } from "./econ-types";

const ECON_TTL_MS = 12 * 60 * 60 * 1000; // USDA reports don't change intraday

function isStale(last: number | null): boolean {
  return last == null || Date.now() - last >= ECON_TTL_MS;
}

/** Fetch + frame + store the supply data when stale. Never throws. */
export async function refreshEcon(force = false): Promise<number> {
  try {
    if (!force && !isStale(await econLastFetched())) return 0;
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
  return { bundles, upcoming: upcomingReports(calendar, new Date()), fetchedAt };
}

/**
 * Upcoming releases, soonest first — the seeded dated reports plus the recurring
 * weekly Export Sales (next Thursday, computed not stored). Drives the UI
 * countdown and the synthesis watch_items.
 */
export function upcomingReports(
  calendar: ReportCalendarEntry[],
  now: Date,
  limit = 6,
): UpcomingReport[] {
  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const dayUntil = (iso: string) =>
    Math.round((Date.parse(iso + "T00:00:00Z") - todayMs) / 86_400_000);

  const dated: UpcomingReport[] = calendar
    .map((e) => ({ ...e, daysUntil: dayUntil(e.releaseDate) }))
    .filter((e) => e.daysUntil >= 0);

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
