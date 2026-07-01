"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CROPS, productionTotal, type HarvestEntry, type StorageLocation } from "@/lib/inputs/ledger";
import { CROP_LABEL } from "@/lib/markets/symbols";

import { deleteHarvest } from "@/app/(app)/inputs/actions";
import { HarvestForm } from "./entry-forms";
import { CropBadge, DeleteButton } from "./field";

export function HarvestLedger({
  farmId,
  cropYear,
  harvests,
  locations,
  fields,
}: {
  farmId: string;
  cropYear: number;
  harvests: HarvestEntry[];
  locations: StorageLocation[];
  fields: { id: string; name: string }[];
}) {
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "—";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">Harvest</span>
          {CROPS.map((c) => {
            const t = productionTotal(harvests.filter((h) => h.crop === c));
            if (t === 0) return null;
            return (
              <span key={c} className="text-text-secondary text-xs">
                {CROP_LABEL[c]} <span className="tnum text-foreground font-semibold">{t.toLocaleString()}</span> bu
              </span>
            );
          })}
        </div>
        <AddHarvestDialog farmId={farmId} cropYear={cropYear} locations={locations} fields={fields} />
      </div>

      {harvests.length === 0 ? (
        <p className="text-text-secondary py-4 text-center text-sm">
          No harvest logged yet. Add loads as they come off the field — pick the crop and the bin or elevator they go to.
        </p>
      ) : (
        <ul className="divide-border/50 mt-3 divide-y">
          {harvests.map((h) => (
            <li key={h.id} className="flex items-center gap-2.5 py-2 text-sm">
              <span className="text-text-tertiary tnum w-12 shrink-0 text-[11px]">{h.entryDate.slice(5)}</span>
              <CropBadge crop={h.crop} />
              <span className="tnum text-foreground w-24 shrink-0 font-medium">{h.bushels.toLocaleString()} bu</span>
              <span className="text-text-secondary min-w-0 flex-1 truncate text-xs">
                → {locName(h.storageLocationId)}
                {h.moisture != null && <span className="text-text-tertiary tnum"> · {h.moisture}% moist</span>}
              </span>
              <DeleteButton onDelete={() => deleteHarvest({ id: h.id })} />
            </li>
          ))}
        </ul>
      )}

      <Explainer label="Why log into a location?">
        Each load goes into a bin or elevator, so we can show what&apos;s where — and flag grain that&apos;s
        costing commercial storage. Production tallies per crop from your loads; no running total to keep.
      </Explainer>
    </Card>
  );
}

/** Trigger + dialog chrome around the SHARED HarvestForm (same fields as the "+"). */
function AddHarvestDialog({
  farmId,
  cropYear,
  locations,
  fields,
}: {
  farmId: string;
  cropYear: number;
  locations: StorageLocation[];
  fields: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Add harvest
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add harvest</DialogTitle>
        </DialogHeader>
        <HarvestForm farmId={farmId} cropYear={cropYear} locations={locations} fields={fields} onDone={() => setOpen(false)} idPrefix="in-harv" />
      </DialogContent>
    </Dialog>
  );
}
