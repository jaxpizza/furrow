"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ledgerBreakeven } from "@/lib/inputs/ledger";
import type { Crop } from "@/lib/types/database";

import { saveCropSettings } from "@/app/(app)/inputs/actions";
import { MoneyField, numStr, toNum } from "./field";

/** Per-crop break-even: acres + expected yield for THIS crop, divided into its
 *  summed expenses. Saving flows to breakeven_targets (the same number markets/
 *  terminal/alerts read). */
export function CropBreakeven({
  farmId,
  crop,
  cropLabel,
  cropYear,
  total,
  settings,
}: {
  farmId: string;
  crop: Crop;
  cropLabel: string;
  cropYear: number;
  total: number;
  settings: { acres: number | null; expectedYield: number | null } | null;
}) {
  const [acres, setAcres] = useState(numStr(settings?.acres));
  const [yield_, setYield] = useState(numStr(settings?.expectedYield));
  const [saving, setSaving] = useState(false);
  const be = ledgerBreakeven(total, toNum(acres), toNum(yield_));

  async function save() {
    setSaving(true);
    const r = await saveCropSettings({ farmId, crop, cropYear, acres: toNum(acres), expectedYield: toNum(yield_) });
    setSaving(false);
    if (!r.ok) return toast.error(r.error ?? "Could not save.");
    toast.success(`${cropLabel} acres & yield saved — break-even updated`);
  }

  return (
    <div className="border-border/70 bg-bg-elevated/30 rounded-lg border p-4">
      <div className="text-text-secondary text-xs font-medium tracking-wide uppercase">{cropLabel}</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <MoneyField id={`be-acres-${crop}`} label="Acres" unit="ac" value={acres} onChange={setAcres} placeholder="640" step="1" />
        <MoneyField id={`be-yield-${crop}`} label="Yield" unit="bu/ac" value={yield_} onChange={setYield} placeholder="205" step="1" />
      </div>
      <dl className="text-text-tertiary mt-2 space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <dt>Logged cost ÷ acres</dt>
          <dd className="tnum text-text-secondary">
            ${total.toLocaleString()} {be.costPerAcre != null ? `÷ ${toNum(acres)} = $${be.costPerAcre.toFixed(0)}/ac` : ""}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>÷ yield = break-even</dt>
          <dd className="tnum text-[var(--accent)] font-medium">
            {be.effective != null ? `$${be.effective.toFixed(2)}/bu` : "set acres + yield"}
          </dd>
        </div>
      </dl>
      <Button onClick={save} size="sm" variant="secondary" disabled={saving} className="mt-2 w-full">
        {saving && <Loader2 className="size-4 animate-spin" />}
        Save {cropLabel} acres & yield
      </Button>
    </div>
  );
}
