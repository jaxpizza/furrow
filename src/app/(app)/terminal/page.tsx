import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TerminalChrome } from "@/components/terminal/terminal-chrome";
import { Glance } from "@/components/terminal/glance";
import { Deep } from "@/components/terminal/deep";
import { freshnessLabel } from "@/components/terminal/lib";
import { getBreakevenTarget } from "@/lib/alerts/queries";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { cashProvider } from "@/lib/markets/manual-basis";
import { getFuturesHistory } from "@/lib/markets/service";
import { CROP_TO_SYMBOL } from "@/lib/markets/symbols";
import { getCotSnapshot } from "@/lib/outlook/cot-ingest";
import { getDemandSnapshot } from "@/lib/outlook/demand-ingest";
import { getEconSnapshot } from "@/lib/outlook/econ-ingest";
import { getMacroSnapshot } from "@/lib/outlook/macro-ingest";
import { readReportBundles } from "@/lib/outlook/cache";
import { getMarketOutlook } from "@/lib/outlook/synthesis";
import { getTechnicalsSnapshot } from "@/lib/outlook/technicals-ingest";
import type { Crop } from "@/lib/types/database";

export const metadata: Metadata = { title: "Terminal" };
export const dynamic = "force-dynamic";

export default async function TerminalPage({
  searchParams,
}: {
  searchParams: Promise<{ crop?: string; mode?: string }>;
}) {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0];

  const sp = await searchParams;
  const crop: Crop = sp.crop === "soybean" ? "soybean" : "corn";
  const mode = sp.mode === "deep" ? "deep" : "glance";
  const symbol = CROP_TO_SYMBOL[crop];
  const now = new Date();

  // Everything below goes through the cached provider seams; allSettled so a
  // single hiccup degrades one panel rather than 500-ing the page. The outlook
  // call is the SAME getMarketOutlook the markets page uses — so terminal-driven
  // reads still flow through synthesis and log to telemetry automatically.
  const [outlookR, cashR, targetR, historyR, econR, demandR, cotR, macroR, techR, reportsR] =
    await Promise.allSettled([
      getMarketOutlook(crop, activeFarm.id, now),
      cashProvider.getCashPrice(crop, activeFarm.id),
      getBreakevenTarget(activeFarm.id, crop),
      getFuturesHistory(symbol, now),
      getEconSnapshot(),
      getDemandSnapshot(),
      getCotSnapshot(),
      getMacroSnapshot(),
      getTechnicalsSnapshot(now),
      readReportBundles(),
    ]);

  const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const outlook = val(outlookR, null);
  const cash = val(cashR, null);
  const target = val(targetR, null);
  const history = val(historyR, null);
  const econ = val(econR, { bundles: [], upcoming: [], fetchedAt: null });
  const demand = val(demandR, { bundles: [], fetchedAt: null });
  const cot = val(cotR, { bundles: [], fetchedAt: null });
  const macro = val(macroR, { bundles: [], fetchedAt: null });
  const tech = val(techR, { bundles: [], basedOnSample: false });
  const reports = val(reportsR, []);

  // Per-crop slices for the deep-mode buckets.
  const data = {
    crop,
    nowMs: now.getTime(),
    apiKeyMissing: !process.env.ANTHROPIC_API_KEY,
    outlook,
    cash,
    breakeven: {
      effective: target?.effectiveBreakeven ?? null,
      profitTargetPrice:
        target?.effectiveBreakeven != null &&
        target.profitTargetPerBushel != null &&
        target.profitTargetPerBushel > 0
          ? Math.round((target.effectiveBreakeven + target.profitTargetPerBushel) * 100) / 100
          : null,
    },
    pricePoints: history?.points ?? [],
    priceSample: history?.source === "sample",
    nextMover: econ.upcoming[0] ?? null,
    buckets: {
      supply: econ.bundles.filter((b) => b.crop === crop),
      supplyFetched: econ.fetchedAt,
      demand: demand.bundles.filter((b) => b.crop === crop),
      demandFetched: demand.fetchedAt,
      moneyflow: cot.bundles.find((b) => b.crop === crop) ?? null,
      moneyflowFetched: cot.fetchedAt,
      macro: macro.bundles,
      macroFetched: macro.fetchedAt,
      technicals: tech.bundles.find((b) => b.crop === crop) ?? null,
      conditions: reports.filter((b) => b.crop === crop),
    },
  };

  return (
    <TerminalChrome
      crop={crop}
      initialMode={mode}
      updatedLabel={
        outlook?.generatedAt ? freshnessLabel(outlook.generatedAt, now.getTime()) : null
      }
      freshness={outlook?.freshness ?? null}
      sampleData={Boolean(outlook?.sampleData || data.priceSample)}
      glance={<Glance data={data} />}
      deep={<Deep data={data} />}
    />
  );
}
