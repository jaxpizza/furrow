import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { HoldingsSummary, type CropHolding } from "@/components/dashboard/holdings-summary";
import { MarketReadPulse, type MarketReadView } from "@/components/dashboard/market-read-pulse";
import { NextMover, type NextMoverInfo } from "@/components/dashboard/next-mover";
import { freshnessLabel } from "@/components/terminal/lib";
import { getBreakevenTarget } from "@/lib/alerts/queries";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { currentCropYear, type Position } from "@/lib/inputs/ledger";
import { getHoldings } from "@/lib/inputs/queries";
import { cashProvider } from "@/lib/markets/manual-basis";
import { CROP_LABEL } from "@/lib/markets/symbols";
import { readLatestEconBundles, readReportCalendar } from "@/lib/outlook/econ-cache";
import { upcomingReports } from "@/lib/outlook/econ-ingest";
import { readLatestOutlookV2 } from "@/lib/outlook/cache";
import type { OutlookV2 } from "@/lib/outlook/synthesis";
import type { Crop } from "@/lib/types/database";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const CROPS: Crop[] = ["corn", "soybean"];

/**
 * The calm, at-a-glance home. Three things a farmer can read in 5 seconds: the
 * market read (essence only), where he stands (value + break-even), and whether
 * anything's about to move it. The charts, news, and weather live in their own
 * tabs — this page stays minimal. All reads are cached/instant (no generation).
 */
export default async function DashboardPage() {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0];
  const farmId = activeFarm.id;
  const now = new Date();
  const nowMs = now.getTime();

  const [cornCash, soyCash, cornTgt, soyTgt, cornRead, soyRead, holdingsR, calR, bundR] =
    await Promise.allSettled([
      cashProvider.getCashPrice("corn", farmId),
      cashProvider.getCashPrice("soybean", farmId),
      getBreakevenTarget(farmId, "corn"),
      getBreakevenTarget(farmId, "soybean"),
      readLatestOutlookV2("corn"),
      readLatestOutlookV2("soybean"),
      getHoldings(farmId, currentCropYear()),
      readReportCalendar(),
      readLatestEconBundles(),
    ]);
  const ok = <T,>(r: PromiseSettledResult<T>, fb: T): T => (r.status === "fulfilled" ? r.value : fb);

  const cashByCrop = { corn: ok(cornCash, null), soybean: ok(soyCash, null) };
  const tgtByCrop = { corn: ok(cornTgt, null), soybean: ok(soyTgt, null) };
  const readByCrop = { corn: ok(cornRead, null), soybean: ok(soyRead, null) };

  const reads: MarketReadView[] = CROPS.map((crop) => ({
    crop,
    label: CROP_LABEL[crop],
    read: (readByCrop[crop]?.payload as OutlookV2 | undefined) ?? null,
    readUpdatedLabel: readByCrop[crop]?.generated_at ? freshnessLabel(readByCrop[crop]!.generated_at, nowMs) : null,
  }));

  const emptyPos: Position = {
    produced: 0, sold: 0, remaining: 0, pctSold: null, avgPrice: null, revenue: 0,
    ownedRemaining: 0, commercialRemaining: 0, unassignedRemaining: 0,
  };
  const holdings = ok(holdingsR, { corn: emptyPos, soybean: emptyPos } as Record<Crop, Position>);
  const cropHoldings: CropHolding[] = CROPS.map((crop) => {
    const pos = holdings[crop] ?? emptyPos;
    const cash = cashByCrop[crop]?.cashPrice ?? cashByCrop[crop]?.futuresRef?.price ?? null;
    return {
      crop,
      label: CROP_LABEL[crop],
      onHand: pos.remaining,
      cashPrice: cash,
      breakeven: tgtByCrop[crop]?.effectiveBreakeven ?? null,
      pctSold: pos.pctSold,
      holdingsValue: cash != null ? Math.round(pos.remaining * cash * 100) / 100 : null,
    };
  });

  // Next scheduled market-mover — shown ONLY when it's near (~within a week).
  const soonest = upcomingReports(ok(calR, []), now, ok(bundR, []))[0];
  const nextMover: NextMoverInfo =
    soonest && soonest.daysUntil <= 7 ? { description: soonest.description, daysUntil: soonest.daysUntil } : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Dashboard" subtitle="Where the market is and where you stand — at a glance." />

      <div className="space-y-6">
        {/* 1 · THE MARKET READ — essence only */}
        <section className="space-y-2">
          <h2 className="text-text-tertiary px-1 text-[11px] font-medium tracking-wide uppercase">
            The market read
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {reads.map((r) => (
              <MarketReadPulse key={r.crop} pulse={r} />
            ))}
          </div>
        </section>

        {/* 2 · YOUR POSITION — value + break-even */}
        <HoldingsSummary holdings={cropHoldings} />

        {/* 3 · NEXT REPORT — one line, only if soon */}
        {nextMover && <NextMover mover={nextMover} />}
      </div>
    </div>
  );
}
