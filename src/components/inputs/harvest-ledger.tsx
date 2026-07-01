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
import { CROPS, productionTotal, type HarvestEntry, type StorageLocation } from "@/lib/inputs/ledger";
import { CROP_LABEL } from "@/lib/markets/symbols";
import type { Crop } from "@/lib/types/database";

import { addHarvest, deleteHarvest } from "@/app/(app)/inputs/actions";
import { CropBadge, CropSelect, DeleteButton, MoneyField, TextField, toNum, todayIso } from "./field";

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
  const [pending, setPending] = useState(false);
  const [crop, setCrop] = useState<Crop>("corn");
  const [bushels, setBushels] = useState("");
  const [loc, setLoc] = useState<string>(locations[0]?.id ?? "none");
  // Field is OPTIONAL — defaults to "none" (farm-level). Picking one builds that
  // field's per-year yield history on the Fields tab.
  const [field, setField] = useState<string>("none");
  const [moisture, setMoisture] = useState("");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState(todayIso());

  async function submit() {
    if (toNum(bushels) == null) return toast.error("Enter bushels.");
    setPending(true);
    const r = await addHarvest({
      farmId,
      crop,
      cropYear,
      bushels: toNum(bushels) ?? 0,
      storageLocationId: loc === "none" ? null : loc,
      moisture: toNum(moisture),
      notes,
      entryDate,
      fieldId: field === "none" ? null : field,
    });
    setPending(false);
    if (!r.ok) return toast.error(r.error ?? "Could not add.");
    toast.success("Harvest logged");
    setOpen(false);
    setBushels("");
    setMoisture("");
    setNotes("");
    setField("none");
  }

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
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CropSelect value={crop} onChange={setCrop} />
            <MoneyField id="ah-bu" label="Bushels" unit="bu" value={bushels} onChange={setBushels} placeholder="2400" step="1" />
          </div>
          <div className="space-y-1">
            <Label>Stored in</Label>
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
          {fields.length > 0 && (
            <div className="space-y-1">
              <Label>
                Field <span className="text-text-tertiary font-normal">· optional — builds this field&apos;s yield history</span>
              </Label>
              <Select value={field} onValueChange={setField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No field</SelectItem>
                  {fields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <MoneyField id="ah-moist" label="Moisture" hint="optional" unit="%" value={moisture} onChange={setMoisture} placeholder="15.5" />
            <TextField id="ah-date" label="Date" type="date" value={entryDate} onChange={setEntryDate} />
          </div>
          <TextField id="ah-notes" label="Notes" hint="optional" value={notes} onChange={setNotes} placeholder="North 80" />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Add harvest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
