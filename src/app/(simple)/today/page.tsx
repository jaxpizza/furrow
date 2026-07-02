import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SimpleBreakeven, type BeCrop } from "@/components/simple/simple-breakeven";
import { TodayPrice, type PriceCell } from "@/components/simple/today-price";
import { SimpleTrend, type TrendCrop } from "@/components/simple/simple-trend";
import { WhatsMoving, type MarketStory } from "@/components/simple/whats-moving";
import { WhereItCouldHead, type HeadRead } from "@/components/simple/where-it-could-head";
import { getBreakevenTarget } from "@/lib/alerts/queries";
import { BREAKEVEN_PREFILL } from "@/lib/app-mode";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { cashProvider } from "@/lib/markets/manual-basis";
import { deltaFromHistory, getFuturesHistory } from "@/lib/markets/service";
import { CROP_LABEL, CROP_TO_SYMBOL } from "@/lib/markets/symbols";
import type { CashPrice } from "@/lib/markets/types";
import { getCachedOutlook } from "@/lib/outlook/synthesis";
import { getTechnicalsSnapshot } from "@/lib/outlook/technicals-ingest";

export const metadata: Metadata = { title: "Today · Furrow" };
export const dynamic = "force-dynamic";
// Renders from the cached read instantly; maxDuration only covers the background
// regen that self-heals a stale cache. Capped at 60 (Vercel Hobby max).
export const maxDuration = 60;

type Delta = { change: number | null; pct: number | null; direction: "up" | "down" | "flat" };

function deltaFor(cash: CashPrice | null, hist: { points: { time: string; value: number }[] } | null): Delta {
  const fr = cash?.futuresRef;
  if (fr && fr.changePercent != null) {
    const change = fr.change ?? 0;
    return {
      change,
      pct: fr.changePercent,
      direction: change > 0.0001 ? "up" : change < -0.0001 ? "down" : "flat",
    };
  }
  if (hist && hist.points.length > 1) {
    const d = deltaFromHistory(hist as never);
    return { change: d.change, pct: d.pct, direction: d.direction };
  }
  return { change: null, pct: null, direction: "flat" };
}

export default async function TodayPage() {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieFarm = (await cookies()).get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0];
  const now = new Date();

  // One round-trip over the SAME seams the full app uses — prices, history, the
  // cached outlook, technicals, and the farmer's break-even. allSettled so any one
  // failure degrades a single section instead of blanking the screen.
  const [cornCashR, soyCashR, cornHistR, soyHistR, cornOutR, soyOutR, techR, cornBeR, soyBeR] =
    await Promise.allSettled([
      cashProvider.getCashPrice("corn", activeFarm.id),
      cashProvider.getCashPrice("soybean", activeFarm.id),
      getFuturesHistory(CROP_TO_SYMBOL.corn, now),
      getFuturesHistory(CROP_TO_SYMBOL.soybean, now),
      getCachedOutlook("corn", activeFarm.id, now),
      getCachedOutlook("soybean", activeFarm.id, now),
      getTechnicalsSnapshot(now),
      getBreakevenTarget(activeFarm.id, "corn"),
      getBreakevenTarget(activeFarm.id, "soybean"),
    ]);

  const ok = <T,>(r: PromiseSettledResult<T>, fb: T): T => (r.status === "fulfilled" ? r.value : fb);

  const cornCash = ok(cornCashR, null);
  const soyCash = ok(soyCashR, null);
  const cornHist = ok(cornHistR, null);
  const soyHist = ok(soyHistR, null);
  const cornOut = ok(cornOutR, null);
  const soyOut = ok(soyOutR, null);
  const tech = ok(techR, { bundles: [], basedOnSample: false });
  const cornBe = ok(cornBeR, null);
  const soyBe = ok(soyBeR, null);

  const cornTech = tech.bundles.find((b) => b.crop === "corn") ?? null;
  const soyTech = tech.bundles.find((b) => b.crop === "soybean") ?? null;

  const cornCashVal = cornCash?.cashPrice ?? cornCash?.futuresRef?.price ?? null;
  const soyCashVal = soyCash?.cashPrice ?? soyCash?.futuresRef?.price ?? null;

  const cornDelta = deltaFor(cornCash, cornHist);
  const soyDelta = deltaFor(soyCash, soyHist);

  const priceCells: PriceCell[] = [
    {
      crop: "corn",
      label: CROP_LABEL.corn,
      cashPrice: cornCashVal,
      change: cornDelta.change,
      pct: cornDelta.pct,
      direction: cornDelta.direction,
      contractMonth: cornCash?.futuresRef?.contractMonth ?? null,
      isSample: cornCash?.source === "sample-basis" || cornHist?.source === "sample",
      isStale: cornCash?.futuresRef?.stale ?? false,
    },
    {
      crop: "soybean",
      label: CROP_LABEL.soybean,
      cashPrice: soyCashVal,
      change: soyDelta.change,
      pct: soyDelta.pct,
      direction: soyDelta.direction,
      contractMonth: soyCash?.futuresRef?.contractMonth ?? null,
      isSample: soyCash?.source === "sample-basis" || soyHist?.source === "sample",
      isStale: soyCash?.futuresRef?.stale ?? false,
    },
  ];

  const trendCrops: TrendCrop[] = [
    { crop: "corn", label: CROP_LABEL.corn, points: cornHist?.points ?? [] },
    { crop: "soybean", label: CROP_LABEL.soybean, points: soyHist?.points ?? [] },
  ];

  const headReads: HeadRead[] = [
    { crop: "corn", label: CROP_LABEL.corn, outlook: cornOut, tech: cornTech },
    { crop: "soybean", label: CROP_LABEL.soybean, outlook: soyOut, tech: soyTech },
  ];

  const stories: MarketStory[] = [
    { crop: "corn", label: CROP_LABEL.corn, outlook: cornOut },
    { crop: "soybean", label: CROP_LABEL.soybean, outlook: soyOut },
  ];

  const beCrops: BeCrop[] = [
    {
      crop: "corn",
      label: CROP_LABEL.corn,
      cashPrice: cornCashVal,
      target: cornBe
        ? { costPerAcre: cornBe.costPerAcre, expectedYield: cornBe.expectedYield, effectiveBreakeven: cornBe.effectiveBreakeven }
        : null,
      prefill: BREAKEVEN_PREFILL.corn,
    },
    {
      crop: "soybean",
      label: CROP_LABEL.soybean,
      cashPrice: soyCashVal,
      target: soyBe
        ? { costPerAcre: soyBe.costPerAcre, expectedYield: soyBe.expectedYield, effectiveBreakeven: soyBe.effectiveBreakeven }
        : null,
      prefill: BREAKEVEN_PREFILL.soybean,
    },
  ];

  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8 pt-1">
      <div>
        <div className="text-text-tertiary text-[12px]">{dateLabel}</div>
        <h1 className="font-serif mt-0.5 text-2xl font-medium tracking-tight">Today&apos;s market</h1>
      </div>

      <TodayPrice cells={priceCells} />
      <SimpleTrend crops={trendCrops} />
      <WhereItCouldHead reads={headReads} />
      <WhatsMoving stories={stories} />
      <SimpleBreakeven farmId={activeFarm.id} crops={beCrops} />
    </div>
  );
}
