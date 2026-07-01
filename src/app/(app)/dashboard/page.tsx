import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Polygon } from "geojson";

import { PageHeader } from "@/components/common/page-header";
import { MarketReadPulse } from "@/components/dashboard/market-read-pulse";
import { NewsFeed } from "@/components/dashboard/news-feed";
import { NextMover, type NextMoverInfo } from "@/components/dashboard/next-mover";
import { PricePulseCard } from "@/components/dashboard/price-pulse-card";
import { WeatherSnapshot } from "@/components/dashboard/weather-snapshot";
import { HoldingsSummary, type CropHolding } from "@/components/dashboard/holdings-summary";
import { PositionVsMarketCompact } from "@/components/fusion/position-vs-market";
import { fusePosition, type PositionFusion } from "@/lib/fusion/position-fusion";
import { currentCropYear, type Position } from "@/lib/inputs/ledger";
import { getHoldings } from "@/lib/inputs/queries";
import { freshnessLabel } from "@/components/terminal/lib";
import { getBreakevenTarget } from "@/lib/alerts/queries";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { cashProvider } from "@/lib/markets/manual-basis";
import { deltaFromHistory, getFuturesHistory } from "@/lib/markets/service";
import { CROP_LABEL, CROP_TO_SYMBOL } from "@/lib/markets/symbols";
import { readLatestEconBundles, readReportCalendar } from "@/lib/outlook/econ-cache";
import { upcomingReports } from "@/lib/outlook/econ-ingest";
import { readLatestOutlookV2, readNewsItems } from "@/lib/outlook/cache";
import type { OutlookV2 } from "@/lib/outlook/synthesis";
import { getTechnicalsSnapshot } from "@/lib/outlook/technicals-ingest";
import { createClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";
import { resolveLocation, type WeatherField } from "@/lib/weather/location";
import { getWeatherDashboard } from "@/lib/weather/service";

import type { CropPulse, NewsView } from "@/components/dashboard/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const CROPS: Crop[] = ["corn", "soybean"];

/** Real per-field weather for the active farm (mirrors the /weather page seam). */
async function loadWeather(farmId: string, now: Date) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fields")
    .select("id, name, geom")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: true });
  const fields: WeatherField[] = (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    geom: f.geom as unknown as Polygon,
  }));
  const location = resolveLocation(fields, "all");
  return getWeatherDashboard(location, now);
}

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

  // One parallel pass over the SAME real seams the terminal/markets use. The
  // market read is READ-ONLY (readLatestOutlookV2) — the home shows the latest
  // computed read instantly and never triggers a generation. allSettled means a
  // single failing source degrades one card, never the page.
  const [cornHist, soyHist, cornCash, soyCash, cornTgt, soyTgt, techR, cornRead, soyRead, newsR, weatherR, holdingsR, calR, bundR] =
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
      readNewsItems(8),
      loadWeather(farmId, now),
      getHoldings(farmId, currentCropYear()),
      readReportCalendar(),
      readLatestEconBundles(),
    ]);

  const ok = <T,>(r: PromiseSettledResult<T>, fb: T): T => (r.status === "fulfilled" ? r.value : fb);
  const tech = ok(techR, { bundles: [], basedOnSample: false });

  // Soonest scheduled market-mover — read-only from the report calendar (the same
  // release-aware upcomingReports the events tracker uses); never refreshes here.
  const upcoming = upcomingReports(ok(calR, []), now, ok(bundR, []));
  const nextMover: NextMoverInfo = upcoming[0]
    ? { description: upcoming[0].description, daysUntil: upcoming[0].daysUntil }
    : null;

  const histByCrop = { corn: ok(cornHist, null), soybean: ok(soyHist, null) };
  const cashByCrop = { corn: ok(cornCash, null), soybean: ok(soyCash, null) };
  const tgtByCrop = { corn: ok(cornTgt, null), soybean: ok(soyTgt, null) };
  const readByCrop = { corn: ok(cornRead, null), soybean: ok(soyRead, null) };

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

  const news: NewsView[] = ok(newsR, []).map((n) => ({
    link: n.link,
    source: n.source,
    title: n.title,
    publishedLabel: n.publishedAt ? freshnessLabel(n.publishedAt, nowMs) : null,
  }));

  const weather = ok(weatherR, null);

  // Holdings: bushels on hand (from the Inputs ledgers) × today's cash, vs break-even.
  const emptyPos: Position = {
    produced: 0, sold: 0, remaining: 0, pctSold: null, avgPrice: null, revenue: 0,
    ownedRemaining: 0, commercialRemaining: 0, unassignedRemaining: 0,
  };
  const holdings = ok(holdingsR, { corn: emptyPos, soybean: emptyPos } as Record<Crop, Position>);
  const cropHoldings: CropHolding[] = pulses.map((p) => {
    const pos = holdings[p.crop] ?? emptyPos;
    const cash = p.cashPrice;
    return {
      crop: p.crop,
      label: p.label,
      onHand: pos.remaining,
      cashPrice: cash,
      breakeven: p.breakeven.effective,
      pctSold: pos.pctSold,
      holdingsValue: cash != null ? Math.round(pos.remaining * cash * 100) / 100 : null,
    };
  });

  // Compact personal-position fusion — his numbers tied to the read, per crop.
  // The light per-farmer layer (design §5) over the shared cached read.
  const fusions: PositionFusion[] = pulses.map((p) =>
    fusePosition({
      crop: p.crop,
      cropLabel: p.label,
      position: holdings[p.crop] ?? emptyPos,
      breakeven: p.breakeven.effective,
      cashPrice: p.cashPrice,
      profitTargetPrice: p.breakeven.profitTargetPrice,
      signal: p.read?.signal ?? null,
      tension: p.read?.dominantTension ?? null,
    }),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        subtitle="Where the market is, where you stand, and what's coming — at a glance."
      />

      <div className="space-y-6">
        {/* ── 1 · THE MARKET READ — the anchor, the #1 thing he came for ── */}
        <section className="space-y-2">
          <SectionLabel>The market read · where the market is</SectionLabel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pulses.map((p) => (
              <MarketReadPulse key={p.crop} pulse={p} />
            ))}
          </div>
        </section>

        {/* ── 2 · YOUR POSITION VS THE MARKET — where you stand ──────── */}
        <PositionVsMarketCompact items={fusions} />

        {/* ── 3 · HOLDINGS VALUE + PRICE PULSE — what your grain's worth ─ */}
        <HoldingsSummary holdings={cropHoldings} />
        <section className="space-y-2">
          <SectionLabel>Price pulse · the trend</SectionLabel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pulses.map((p) => (
              <PricePulseCard key={p.crop} pulse={p} nowMs={nowMs} />
            ))}
          </div>
        </section>

        {/* ── 4 · WHAT'S COMING — is anything about to move it ──────── */}
        <section className="space-y-2">
          <SectionLabel>What&apos;s coming · next market-mover</SectionLabel>
          <NextMover mover={nextMover} />
        </section>

        {/* ── 5 · SUPPORTING CONTEXT — nice to know, goes last ──────── */}
        {/* items-start so each section sizes to its content and can't overflow
            into the next. */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <SectionLabel>Weather</SectionLabel>
            <WeatherSnapshot weather={weather} nowMs={nowMs} />
          </section>
          <section className="space-y-2">
            <SectionLabel>Today&apos;s ag news</SectionLabel>
            <NewsFeed news={news} />
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-text-tertiary px-1 text-[11px] font-medium tracking-wide uppercase">
      {children}
    </h2>
  );
}
