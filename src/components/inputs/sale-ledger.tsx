"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CROPS, salesTotals, type SaleEntry, type StorageLocation } from "@/lib/inputs/ledger";
import { CROP_LABEL } from "@/lib/markets/symbols";

import { deleteSale } from "@/app/(app)/inputs/actions";
import { SaleForm } from "./entry-forms";
import { CropBadge, DeleteButton } from "./field";

export function SaleLedger({
  farmId,
  cropYear,
  sales,
  locations,
}: {
  farmId: string;
  cropYear: number;
  sales: SaleEntry[];
  locations: StorageLocation[];
}) {
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "—";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">Sales</span>
          {CROPS.map((c) => {
            const t = salesTotals(sales.filter((s) => s.crop === c));
            if (t.bushelsSold === 0) return null;
            return (
              <span key={c} className="text-text-secondary text-xs">
                {CROP_LABEL[c]} <span className="tnum text-foreground font-semibold">{t.bushelsSold.toLocaleString()}</span> bu · avg{" "}
                <span className="tnum text-foreground font-semibold">${t.avgPrice?.toFixed(2)}</span>
              </span>
            );
          })}
        </div>
        <AddSaleDialog farmId={farmId} cropYear={cropYear} locations={locations} />
      </div>

      {sales.length === 0 ? (
        <p className="text-text-secondary py-4 text-center text-sm">
          No sales logged yet. Add each sale — the app tallies bushels sold, your weighted average price, and
          realized revenue, per crop.
        </p>
      ) : (
        <ul className="divide-border/50 mt-3 divide-y">
          {sales.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 py-2 text-sm">
              <span className="text-text-tertiary tnum w-12 shrink-0 text-[11px]">{s.entryDate.slice(5)}</span>
              <CropBadge crop={s.crop} />
              <span className="tnum text-foreground w-20 shrink-0 font-medium">{s.bushels.toLocaleString()} bu</span>
              <span className="tnum text-[var(--pos)] w-14 shrink-0">${s.price.toFixed(2)}</span>
              <span className="text-text-secondary min-w-0 flex-1 truncate text-xs">
                {s.buyer ? `${s.buyer} · ` : ""}from {locName(s.storageLocationId)}
              </span>
              <span className="tnum text-foreground shrink-0 font-medium">${Math.round(s.bushels * s.price).toLocaleString()}</span>
              <DeleteButton onDelete={() => deleteSale({ id: s.id })} />
            </li>
          ))}
        </ul>
      )}

      <Explainer label="Weighted average">
        Your average sold price is bushel-weighted per crop — a 10,000-bu sale at $4.50 counts more than a
        1,000-bu sale at $4.20. All tallied from your logged sales.
      </Explainer>
    </Card>
  );
}

/** Trigger + dialog chrome around the SHARED SaleForm (same fields as the "+"). */
function AddSaleDialog({
  farmId,
  cropYear,
  locations,
}: {
  farmId: string;
  cropYear: number;
  locations: StorageLocation[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Add sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add sale</DialogTitle>
        </DialogHeader>
        <SaleForm farmId={farmId} cropYear={cropYear} locations={locations} onDone={() => setOpen(false)} idPrefix="in-sale" />
      </DialogContent>
    </Dialog>
  );
}
