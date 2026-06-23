import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { CashPriceCard } from "@/components/markets/cash-price-card";
import { ChartCard } from "@/components/markets/chart-card";
import { CropToggle } from "@/components/markets/crop-toggle";
import { FuturesStrip } from "@/components/markets/futures-strip";
import { OutlookCard } from "@/components/markets/outlook-card";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { cashProvider } from "@/lib/markets/manual-basis";
import { getOutlook } from "@/lib/markets/outlook";
import {
  deltaFromHistory,
  getFuturesHistory,
} from "@/lib/markets/service";
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

  // Everything below consumes the two provider seams, never the raw API.
  const [history, cash, outlook] = await Promise.all([
    getFuturesHistory(symbol, now),
    cashProvider.getCashPrice(crop, activeFarm.id),
    getOutlook(crop, now),
  ]);
  const delta = deltaFromHistory(history);
  const sampleData = history.source === "sample";

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
          stale={cash.futuresRef!.stale}
          sampleData={sampleData}
          delta={delta}
        />

        <FuturesStrip
          frontMonth={cash.futuresRef!.contractMonth}
          frontPrice={cash.futuresRef!.price}
          change={delta.change}
          pct={delta.pct}
          direction={delta.direction}
          nextMonths={nextMonths}
          sampleData={sampleData}
        />

        <ChartCard
          cropLabel={CROP_LABEL[crop]}
          points={history.points}
          sampleData={sampleData}
        />

        <OutlookCard outlook={outlook} />
      </div>
    </div>
  );
}
