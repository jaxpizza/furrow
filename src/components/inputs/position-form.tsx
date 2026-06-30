"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Warehouse } from "lucide-react";
import { toast } from "sonner";

import { Explainer } from "@/components/common/explainer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Crop } from "@/lib/types/database";

import { numStr, toNum } from "./cost-categories";
import { MoneyField } from "./field";

export type CropPosition = {
  totalProductionBu: number | null;
  bushelsSold: number | null;
  avgSoldPrice: number | null;
};

export function PositionForm({
  farmId,
  crop,
  cropLabel,
  position,
}: {
  farmId: string;
  crop: Crop;
  cropLabel: string;
  position: CropPosition | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [produced, setProduced] = useState(numStr(position?.totalProductionBu));
  const [sold, setSold] = useState(numStr(position?.bushelsSold));
  const [avg, setAvg] = useState(numStr(position?.avgSoldPrice));

  const producedNum = toNum(produced);
  const soldNum = toNum(sold) ?? 0;
  const remaining =
    producedNum != null ? Math.max(0, Math.round((producedNum - soldNum) * 10) / 10) : null;
  const pctSold =
    producedNum != null && producedNum > 0
      ? Math.min(100, Math.max(0, Math.round((soldNum / producedNum) * 100)))
      : null;

  async function onSave() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.from("crop_positions").upsert(
      {
        farm_id: farmId,
        crop,
        total_production_bu: producedNum,
        bushels_sold: toNum(sold),
        avg_sold_price: toNum(avg),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "farm_id,crop" },
    );
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not save your position.");
      return;
    }
    toast.success(`Position saved for ${cropLabel}`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Warehouse className="size-4 text-[var(--accent)]" />
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Position · {cropLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <MoneyField
            id="p-prod"
            label="Total production"
            hint="bushels this crop year"
            unit="bu"
            value={produced}
            onChange={setProduced}
            placeholder="48000"
          />
          <div className="grid grid-cols-2 gap-3">
            <MoneyField
              id="p-sold"
              label="Bushels sold"
              unit="bu"
              value={sold}
              onChange={setSold}
              placeholder="0"
            />
            <MoneyField
              id="p-avg"
              label="Avg price sold"
              hint="optional"
              unit="$/bu"
              value={avg}
              onChange={setAvg}
              placeholder="4.40"
            />
          </div>
        </div>

        {/* computed position */}
        <div className="border-border/70 bg-bg-elevated/40 flex h-fit flex-col rounded-lg border p-4">
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
            Your marketing position
          </span>
          {producedNum != null && producedNum > 0 ? (
            <>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="tnum text-3xl font-semibold tracking-tight">{pctSold}%</span>
                <span className="text-text-tertiary text-sm">sold</span>
              </div>
              {/* progress bar — labeled, so the read never rests on color alone */}
              <div className="bg-bg-elevated mt-2 h-2 overflow-hidden rounded-full">
                <div className="h-full bg-[var(--accent)]" style={{ width: `${pctSold}%` }} />
              </div>
              <dl className="border-border/60 mt-3 space-y-1.5 border-t pt-3 text-xs">
                <Row label="Produced" value={`${fmt(producedNum)} bu`} />
                <Row label="Sold" value={`${fmt(soldNum)} bu`} />
                <Row label="Still exposed" value={`${fmt(remaining)} bu`} accent />
                {toNum(avg) != null && (
                  <Row label="Realized" value={`$${fmt(Math.round(soldNum * (toNum(avg) ?? 0)))}`} />
                )}
              </dl>
              <p className="text-text-tertiary mt-3 text-[11px] leading-relaxed">
                {fmt(remaining)} bu still unpriced — that&apos;s your exposure to where the
                market goes from here.
              </p>
            </>
          ) : (
            <p className="text-text-secondary mt-2 text-sm">
              Enter your production to see % sold and how many bushels are still exposed.
            </p>
          )}
        </div>
      </div>

      <Explainer label="Why track this?">
        The same market read means different things depending on your position — a
        favorable signal matters more when you&apos;re 60% unsold than 90% sold. Tracking
        % sold and bushels still exposed makes the read personal to{" "}
        <span className="text-foreground">your</span> grain, not the market in the abstract.
        Bushels remaining is computed as produced − sold.
      </Explainer>

      <Button onClick={onSave} size="sm" disabled={pending} className="mt-4">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {position ? "Update position" : "Save position"}
      </Button>
    </Card>
  );
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd className={accent ? "tnum text-[var(--accent)] font-semibold" : "tnum text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
