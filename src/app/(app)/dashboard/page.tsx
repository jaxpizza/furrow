import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { HoldingsSummary, type CropHolding } from "@/components/dashboard/holdings-summary";
import { MarketReadPulse, type MarketReadView } from "@/components/dashboard/market-read-pulse";
import { NextMover, type NextMoverInfo } from "@/components/dashboard/next-mover";
import { PricePulseCard } from "@/components/dashboard/price-pulse-card";
import type { CropPulse } from "@/components/dashboard/types";
import { freshnessLabel } from "@/components/terminal/lib";
import { getBreakevenTarget } from "@/lib/alerts/queries";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { currentCropYear, type Position } from "@/lib/inputs/ledger";
import { getHoldings } from "@/lib/inputs/queries";
import { cashProvider } from "@/lib/markets/manual-basis";
import { deltaFromHistory, getFuturesHistory } from "@/lib/markets/service";
import { CROP_LABEL, CROP_TO_SYMBOL } from "@/lib/markets/symbols";
import { readLatestEconBundles, readReportCalendar } from "@/lib/outlook/econ-cache";
import { upcomingReports } from "@/lib/outlook/econ-ingest";
import { readLatestOutlookV2 } from "@/lib/outlook/cache";
import type { OutlookV2 } from "@/lib/outlook/synthesis";
import { getTechnicalsSnapshot } from "@/lib/outlook/technicals-ingest";
import type { Crop } from "@/lib/types/database";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const CROPS: Crop[] = ["corn", "soybean"];

/**
 * The calm, at-a-glance home. What a farmer can take in quickly: the market read
 * (essence only), the price trend per crop (the real close-price charts with the
 * engine's overlays), where he stands (value + break-even), and — only when it's
 * near — the next market-mover. News and weather live in their own tabs. Every
 * read is cached/instant (no generation); allSettled degrades one card, never
 * the page.
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

  const [cornHist, soyHist, cornCash, soyCash, cornTgt, soyTgt, techR, cornRead, soyRead, holdingsR, calR, bundR] =
    await Promise.allSettled([
      getFuturesHistory(CROP_TO_SYMBOL.corn, now),
      getFuturesHistory(CROP_TO_SYMBOL.soybean, now),
      cashProvider.getCashPrice("corn", farmId),
      cashProvider.getCashPrice("soybean", farmId),
      getBreakevenTarget(farmId, "corn"),
      getBreakevenTarget(farmId, "soybean"),
      getTechnicalsSnapshot(now),
      readLatestOutlookV2("corn"),
      readLatestOutlookV2("soybean"),
      getHoldings(farmId, currentCropYear()),
      readReportCalendar(),
      readLatestEconBundles(),
    ]);
  const ok = <T,>(r: PromiseSettledResult<T>, fb: T): T => (r.status === "fulfilled" ? r.value : fb);
  const tech = ok(techR, { bundles: [], basedOnSample: false });

  const histByCrop = { corn: ok(cornHist, null), soybean: ok(soyHist, null) };
  const cashByCrop = { corn: ok(cornCash, null), soybean: ok(soyCash, null) };
  const tgtByCrop = { corn: ok(cornTgt, null), soybean: ok(soyTgt, null) };
  const readByCrop = { corn: ok(cornRead, null), soybean: ok(soyRead, null) };

  // Assemble each crop's pulse from the SAME real seams the terminal/markets use:
  // the close-price series + engine technicals overlay, cash/basis/futures, and
  // the read-only cached market read. Feeds both the price charts and holdings.
  const pulses: CropPulse[] = CROPS.map((crop) => {
    const hist = histByCrop[crop];
    const cash = cashByCrop[crop];
    const tgt = tgtByCrop[crop];
    const read = (readByCrop[crop]?.payload as OutlookV2 | undefined) ?? null;
    const fr = cash?.futuresRef ?? null;
    const delta =
      fr?.changePercent != null
        ? {
            change: fr.change ?? 0,
            pct: fr.changePercent,
            direction:
              (fr.change ?? 0) > 0.0001
                ? ("up" as const)
                : (fr.change ?? 0) < -0.0001
                  ? ("down" as const)
                  : ("flat" as const),
          }
        : hist
          ? deltaFromHistory(hist)
          : { change: 0, pct: 0, direction: "flat" as const };
    return {
      crop,
      label: CROP_LABEL[crop],
      points: hist?.points ?? [],
      tech: tech.bundles.find((b) => b.crop === crop) ?? null,
      priceSample: hist?.source === "sample",
      cashPrice: cash?.cashPrice ?? fr?.price ?? null,
      hasBasis: cash?.hasBasis ?? false,
      basisCents: cash?.basisCents ?? null,
      futuresPrice: fr?.price ?? null,
      contractMonth: fr?.contractMonth ?? null,
      futuresStale: fr?.stale ?? false,
      priceAsOf: fr?.asOf ?? null,
      delta,
      breakeven: {
        effective: tgt?.effectiveBreakeven ?? null,
        profitTargetPrice:
          tgt?.effectiveBreakeven != null && tgt.profitTargetPerBushel != null && tgt.profitTargetPerBushel > 0
            ? Math.round((tgt.effectiveBreakeven + tgt.profitTargetPerBushel) * 100) / 100
            : null,
      },
      read,
      readUpdatedLabel: readByCrop[crop]?.generated_at ? freshnessLabel(readByCrop[crop]!.generated_at, nowMs) : null,
    };
  });

  const reads: MarketReadView[] = pulses.map((p) => ({
    crop: p.crop,
    label: p.label,
    read: p.read,
    readUpdatedLabel: p.readUpdatedLabel,
  }));

  const emptyPos: Position = {
    produced: 0, sold: 0, remaining: 0, pctSold: null, avgPrice: null, revenue: 0,
    ownedRemaining: 0, commercialRemaining: 0, unassignedRemaining: 0,
  };
  const holdings = ok(holdingsR, { corn: emptyPos, soybean: emptyPos } as Record<Crop, Position>);
  const cropHoldings: CropHolding[] = pulses.map((p) => {
    const pos = holdings[p.crop] ?? emptyPos;
    return {
      crop: p.crop,
      label: p.label,
      onHand: pos.remaining,
      cashPrice: p.cashPrice,
      breakeven: p.breakeven.effective,
      pctSold: pos.pctSold,
      holdingsValue: p.cashPrice != null ? Math.round(pos.remaining * p.cashPrice * 100) / 100 : null,
    };
  });

  // Next scheduled market-mover — shown ONLY when it's near (~within a week).
  const soonest = upcomingReports(ok(calR, []), now, ok(bundR, []))[0];
  const nextMover: NextMoverInfo =
    soonest && soonest.daysUntil <= 7 ? { description: soonest.description, daysUntil: soonest.daysUntil } : null;

  return (
    <div className="mx-auto max-w-6xl">
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

        {/* 2 · PRICE TREND — the real close-price charts with the engine overlays */}
        <section className="space-y-2">
          <h2 className="text-text-tertiary px-1 text-[11px] font-medium tracking-wide uppercase">
            Price trend
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pulses.map((p) => (
              <PricePulseCard key={p.crop} pulse={p} nowMs={nowMs} />
            ))}
          </div>
        </section>

        {/* 3 · YOUR POSITION — value + break-even */}
        <HoldingsSummary holdings={cropHoldings} />

        {/* 4 · NEXT REPORT — one line, only if soon */}
        {nextMover && <NextMover mover={nextMover} />}
      </div>
    </div>
  );
}
