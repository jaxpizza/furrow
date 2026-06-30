"use client";

import { useState } from "react";
import { Building2, Home, Loader2, Plus } from "lucide-react";
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
import {
  accruedStorageCost,
  CROPS,
  locationBalance,
  type HarvestEntry,
  type SaleEntry,
  type StorageKind,
  type StorageLocation,
} from "@/lib/inputs/ledger";
import { CROP_SHORT } from "@/lib/inputs/ledger";

import { addStorageLocation, deleteStorageLocation } from "@/app/(app)/inputs/actions";
import { DeleteButton, MoneyField, TextField, toNum } from "./field";

export function StorageManager({
  farmId,
  locations,
  harvests,
  sales,
}: {
  farmId: string;
  locations: StorageLocation[];
  harvests: HarvestEntry[];
  sales: SaleEntry[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Storage locations
        </span>
        <AddStorageDialog farmId={farmId} />
      </div>

      {locations.length === 0 ? (
        <p className="text-text-secondary py-4 text-center text-sm">
          Add a bin or elevator first — then harvests log grain into it and sales out of it (a location can
          hold either crop).
        </p>
      ) : (
        <ul className="divide-border/50 mt-3 divide-y">
          {locations.map((l) => {
            const accrued = accruedStorageCost(l, harvests, sales);
            const Icon = l.kind === "owned" ? Home : Building2;
            const byCrop = CROPS.map((c) => ({
              c,
              bal: locationBalance(l.id, harvests.filter((h) => h.crop === c), sales.filter((s) => s.crop === c)),
            })).filter((x) => x.bal !== 0);
            return (
              <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Icon className="text-text-tertiary size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground font-medium">{l.name}</div>
                  <div className="text-text-tertiary text-[11px]">
                    {l.kind === "owned" ? "On-farm" : "Commercial"}
                    {l.capacityBu != null && <span className="tnum"> · {l.capacityBu.toLocaleString()} bu cap</span>}
                    {l.kind === "commercial" && l.storageCostCentsPerBuMonth != null && (
                      <span className="tnum"> · {l.storageCostCentsPerBuMonth}¢/bu/mo</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tnum text-foreground text-xs font-medium">
                    {byCrop.length === 0 ? (
                      <span className="text-text-tertiary">empty</span>
                    ) : (
                      byCrop.map((x) => (
                        <span key={x.c} className="ml-2">
                          {x.bal.toLocaleString()} <span className="text-text-tertiary">{CROP_SHORT[x.c]}</span>
                        </span>
                      ))
                    )}
                  </div>
                  {accrued != null && accrued > 0 && (
                    <div className="tnum text-[var(--neg)] text-[11px]">−${accrued.toLocaleString()} storage so far</div>
                  )}
                </div>
                <DeleteButton onDelete={() => deleteStorageLocation({ id: l.id })} label="Delete location" />
              </li>
            );
          })}
        </ul>
      )}

      <Explainer label="Owned vs commercial — why it matters">
        Grain in your own bins is essentially free to hold, so you can be patient. Grain at a commercial
        elevator <span className="text-foreground">costs money every month</span> — we surface that accrued
        cost so it factors into when you sell. (No bin transfers or shrink modeling; drying cost is a normal
        expense in the cost ledger.)
      </Explainer>
    </Card>
  );
}

function AddStorageDialog({ farmId }: { farmId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<StorageKind>("owned");
  const [capacity, setCapacity] = useState("");
  const [cost, setCost] = useState("");

  async function submit() {
    if (!name.trim()) return toast.error("Name the location.");
    setPending(true);
    const r = await addStorageLocation({
      farmId,
      name: name.trim(),
      kind,
      capacityBu: toNum(capacity),
      storageCostCentsPerBuMonth: toNum(cost),
    });
    setPending(false);
    if (!r.ok) return toast.error(r.error ?? "Could not add.");
    toast.success("Storage location added");
    setOpen(false);
    setName("");
    setCapacity("");
    setCost("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-4" /> Add location
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add storage location</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <TextField id="sl-name" label="Name" value={name} onChange={setName} placeholder="Home bins / Smith Co-op" />
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as StorageKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owned">Owned (on-farm bins)</SelectItem>
                <SelectItem value="commercial">Commercial (elevator / co-op)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField id="sl-cap" label="Capacity" hint="optional" unit="bu" value={capacity} onChange={setCapacity} placeholder="30000" step="1" />
            {kind === "commercial" && (
              <MoneyField id="sl-cost" label="Storage cost" hint="optional" unit="¢/bu/mo" value={cost} onChange={setCost} placeholder="4" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Add location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
