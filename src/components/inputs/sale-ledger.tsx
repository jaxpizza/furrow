"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Explainer } from "@/components/common/explainer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CROPS, salesTotals, type SaleEntry, type StorageLocation } from "@/lib/inputs/ledger";
import { CROP_LABEL } from "@/lib/markets/symbols";
import type { Crop } from "@/lib/types/database";

import { addSale, deleteSale } from "@/app/(app)/inputs/actions";
import { CropBadge, CropSelect, DeleteButton, MoneyField, TextField, toNum, todayIso } from "./field";

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
  const [pending, setPending] = useState(false);
  const [crop, setCrop] = useState<Crop>("corn");
  const [bushels, setBushels] = useState("");
  const [price, setPrice] = useState("");
  const [loc, setLoc] = useState<string>(locations[0]?.id ?? "none");
  const [buyer, setBuyer] = useState("");
  const [entryDate, setEntryDate] = useState(todayIso());

  async function submit() {
    if (toNum(bushels) == null || toNum(price) == null) return toast.error("Enter bushels and price.");
    setPending(true);
    const r = await addSale({
      farmId,
      crop,
      cropYear,
      bushels: toNum(bushels) ?? 0,
      price: toNum(price) ?? 0,
      storageLocationId: loc === "none" ? null : loc,
      buyer,
      entryDate,
    });
    setPending(false);
    if (!r.ok) return toast.error(r.error ?? "Could not add.");
    toast.success("Sale logged");
    setOpen(false);
    setBushels("");
    setPrice("");
    setBuyer("");
  }

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
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CropSelect value={crop} onChange={setCrop} />
            <MoneyField id="as-bu" label="Bushels" unit="bu" value={bushels} onChange={setBushels} placeholder="5000" step="1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField id="as-price" label="Price" unit="$/bu" value={price} onChange={setPrice} placeholder="4.40" />
            <div className="space-y-1">
              <Label>Sold from</Label>
              <Select value={loc} onValueChange={setLoc}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.kind === "owned" ? "on-farm" : "commercial"})
                    </SelectItem>
                  ))}
                  <SelectItem value="none">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <TextField id="as-buyer" label="Buyer" hint="optional" value={buyer} onChange={setBuyer} placeholder="Smith Co-op" />
          <TextField id="as-date" label="Date" type="date" value={entryDate} onChange={setEntryDate} />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Add sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
