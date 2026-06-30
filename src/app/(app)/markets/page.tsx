import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { BreakevenCard } from "@/components/markets/breakeven-card";
import { CashPriceCard } from "@/components/markets/cash-price-card";
import { ChartCard } from "@/components/markets/chart-card";
import { CropToggle } from "@/components/markets/crop-toggle";
import { FuturesStrip } from "@/components/markets/futures-strip";
import { OutlookCard } from "@/components/markets/outlook-card";
import { evaluateFarm } from "@/lib/alerts/evaluate";
import { getBreakevenTarget } from "@/lib/alerts/queries";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { cashProvider } from "@/lib/markets/manual-basis";
import { getMarketOutlook } from "@/lib/outlook/synthesis";
import {
  deltaFromHistory,
  getFuturesHistory,
} from "@/lib/markets/service";
import { SAMPLE_BASIS_CENTS, sampleHistory, sampleQuote } from "@/lib/markets/sample";
import type { CashPrice, Symbol as MktSymbol } from "@/lib/markets/types";
import {
  contractMonths,
  CROP_LABEL,
  CROP_TO_SYMBOL,
  formatContractMonth,
} from "@/lib/markets/symbols";
import type { Crop } from "@/lib/types/database";

export const metadata: Metadata = { title: "Markets" };

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ crop?: string }>;
}) {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0];

  const { crop: cropParam } = await searchParams;
  const crop: Crop = cropParam === "soybean" ? "soybean" : "corn";
  const symbol = CROP_TO_SYMBOL[crop];
  const now = new Date();

  // Run the break-even evaluator for this farm on load (the same evaluator the
  // cron route calls) so alerts fire even before scheduling is wired up. Never let
  // it block the page render.
  try {
    await evaluateFarm(activeFarm.id);
  } catch (e) {
    console.warn("[markets] evaluateFarm failed", e);
  }

  // Everything below consumes the two provider seams, never the raw API. Use
  // allSettled so one provider throwing (e.g. a DB hiccup) can't 500 the page
  // before the graceful per-card fallbacks (incl. the outlook-null state) render.
  const [historyR, cashR, outlookR, targetR] = await Promise.allSettled([
    getFuturesHistory(symbol, now),
    cashProvider.getCashPrice(crop, activeFarm.id),
    getMarketOutlook(crop, activeFarm.id, now),
    getBreakevenTarget(activeFarm.id, crop),
  ]);
  const history = historyR.status === "fulfilled" ? historyR.value : sampleHistory(symbol, now);
  const cash = cashR.status === "fulfilled" ? cashR.value : fallbackCash(crop, symbol, now);
  const outlook = outlookR.status === "fulfilled" ? outlookR.value : null;
  const target = targetR.status === "fulfilled" ? targetR.value : null;

  const effectiveBE = target?.effectiveBreakeven ?? null;
  const profitTargetPrice =
    effectiveBE != null &&
    target?.profitTargetPerBushel != null &&
    target.profitTargetPerBushel > 0
      ? Math.round((effectiveBE + target.profitTargetPerBushel) * 100) / 100
      : null;
  // The futures quote (cash card / strip) and the chart history have separate
  // sources on the free tier: corn quote is live (15-min delayed), corn history
  // is premium → sample. Badge each honestly.
  const futuresSource = cash.futuresRef!.source;
  const chartSample = history.source === "sample";

  // Prefer the live day-change from the quote feed; fall back to history.
  const fr = cash.futuresRef!;
  const delta =
    fr.changePercent != null
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
      : deltaFromHistory(history);

  const nextMonths = contractMonths(symbol, now)
    .slice(1)
    .map(formatContractMonth);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Markets"
        subtitle="Cash price, the trend, and a relative sell-or-hold read — you decide."
        action={<CropToggle active={crop} />}
      />

      <div className="space-y-4">
        {/* Top row: cash, futures strip, break-even editor — unchanged */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CashPriceCard
            crop={crop}
            cropLabel={CROP_LABEL[crop]}
            farmId={activeFarm.id}
            cashPrice={cash.cashPrice ?? cash.futuresRef!.price}
            basisCents={cash.basisCents ?? 0}
            hasBasis={cash.hasBasis}
            elevatorName={cash.elevatorName}
            futuresPrice={cash.futuresRef!.price}
            contractMonth={cash.futuresRef!.contractMonth}
            asOf={cash.futuresRef!.asOf}
            source={futuresSource}
            stale={cash.futuresRef!.stale}
            delta={delta}
            breakeven={{ effective: effectiveBE, profitTargetPrice }}
            basisAge={basisAge(cash.basisUpdatedAt, now)}
          />

          <FuturesStrip
            frontMonth={cash.futuresRef!.contractMonth}
            frontPrice={cash.futuresRef!.price}
            change={delta.change}
            pct={delta.pct}
            direction={delta.direction}
            nextMonths={nextMonths}
            source={futuresSource}
            stale={cash.futuresRef!.stale}
          />

          <BreakevenCard
            farmId={activeFarm.id}
            crop={crop}
            cropLabel={CROP_LABEL[crop]}
            target={target}
          />
        </div>

        {/* Futures chart — full width, its own row */}
        <ChartCard
          cropLabel={CROP_LABEL[crop]}
          points={history.points}
          sampleData={chartSample}
        />

        {/* Market outlook — full width, stacked directly below the chart */}
        <OutlookCard
          outlook={outlook}
          apiKeyMissing={!process.env.ANTHROPIC_API_KEY}
          nowMs={now.getTime()}
        />
      </div>
    </div>
  );
}

// Basis age, computed server-side so the relative label is hydration-safe. A
// manual basis goes stale; we surface how long ago it was set and flag it after
// ~2 weeks so the farmer can refresh it.
const BASIS_STALE_DAYS = 14;

function basisAge(
  updatedAt: string | null,
  now: Date,
): { label: string; stale: boolean } | null {
  if (!updatedAt) return null;
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((now.getTime() - t) / 86_400_000);
  return { label: relDays(days), stale: days >= BASIS_STALE_DAYS };
}

function relDays(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const y = Math.round(days / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

/** Last-ditch cash fallback so a cash-provider failure can't blank the page —
 *  a clearly sample-labeled, stale figure rather than a 500. */
function fallbackCash(crop: Crop, symbol: MktSymbol, now: Date): CashPrice {
  const q = sampleQuote(symbol, now);
  const front = contractMonths(symbol, now)[0];
  const basisCents = SAMPLE_BASIS_CENTS[symbol];
  return {
    crop,
    cashPrice: Math.round((q.price + basisCents / 100) * 10000) / 10000,
    basisCents,
    basisUpdatedAt: null,
    elevatorName: null,
    futuresRef: {
      symbol,
      price: q.price,
      contractMonth: formatContractMonth(front),
      asOf: q.asOf,
      stale: true,
      source: q.source,
      change: q.change,
      changePercent: q.changePercent,
    },
    source: "sample-basis",
    hasBasis: false,
  };
}
