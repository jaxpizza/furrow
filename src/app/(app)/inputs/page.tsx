import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { CostBreakdownForm } from "@/components/inputs/cost-breakdown-form";
import { COST_KEYS, type CostKey } from "@/components/inputs/cost-categories";
import { CropTabs } from "@/components/inputs/crop-tabs";
import { PositionForm, type CropPosition } from "@/components/inputs/position-form";
import { getBreakevenTarget } from "@/lib/alerts/queries";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { CROP_LABEL } from "@/lib/markets/symbols";
import { createClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

export const metadata: Metadata = { title: "Inputs" };
export const dynamic = "force-dynamic";

export default async function InputsPage({
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
  const farmId = activeFarm.id;

  const sp = await searchParams;
  const crop: Crop = sp.crop === "soybean" ? "soybean" : "corn";
  const cropLabel = CROP_LABEL[crop];

  const supabase = await createClient();
  const [{ data: costRow }, { data: posRow }, target] = await Promise.all([
    supabase.from("input_cost_items").select("*").eq("farm_id", farmId).eq("crop", crop).maybeSingle(),
    supabase.from("crop_positions").select("*").eq("farm_id", farmId).eq("crop", crop).maybeSingle(),
    getBreakevenTarget(farmId, crop),
  ]);

  const costRowRec = costRow as unknown as Record<string, number | null> | null;
  const costs = costRowRec
    ? (Object.fromEntries(
        COST_KEYS.map((k) => [k, costRowRec[k] ?? null]),
      ) as Record<CostKey, number | null>)
    : null;

  const position: CropPosition | null = posRow
    ? {
        totalProductionBu: posRow.total_production_bu,
        bushelsSold: posRow.bushels_sold,
        avgSoldPrice: posRow.avg_sold_price,
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Inputs"
        subtitle="Your real cost of production and marketing position — the personal layer behind the read."
        action={<CropTabs active={crop} />}
      />

      <div className="space-y-4">
        <CostBreakdownForm
          farmId={farmId}
          crop={crop}
          cropLabel={cropLabel}
          costs={costs}
          target={target}
        />
        <PositionForm farmId={farmId} crop={crop} cropLabel={cropLabel} position={position} />
      </div>
    </div>
  );
}
