"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { addExpense, addHarvest, addSale } from "@/app/(app)/inputs/actions";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/inputs/ledger";
import type { Crop } from "@/lib/types/database";

import {
  CropSelect,
  ExpenseCropSelect,
  MoneyField,
  TextField,
  toNum,
  todayIso,
  type ExpenseCrop,
} from "./field";

/**
 * The ONE definition of each log form. Both the dashboard "+" quick-add and the
 * Inputs-tab dialogs render these, so the fields are identical field-for-field
 * and can't drift. Each is self-contained: renders its fields + submit, writes to
 * the same ledger action, refreshes the current page, and calls onDone() to close
 * whatever chrome (bottom sheet or dialog) wraps it.
 */

export type EntryLocation = { id: string; name: string; kind: string };
export type EntryField = { id: string; name: string };

function SubmitButton({ pending, onClick, label }: { pending: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-[#1b1403] transition-opacity disabled:opacity-60"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </button>
  );
}

function LocationSelect({
  label,
  locations,
  value,
  onChange,
}: {
  label: string;
  locations: EntryLocation[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
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
  );
}

/** Optional per-field tag for a harvest — defaults to "No field". */
function FieldSelect({
  fields,
  value,
  onChange,
}: {
  fields: EntryField[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-text-tertiary">
        Field <span className="font-normal">· optional — builds this field&apos;s yield history</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
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
  );
}

// ── Expense ──────────────────────────────────────────────────────────────────
export function ExpenseForm({
  farmId,
  cropYear,
  onDone,
  idPrefix,
}: {
  farmId: string;
  cropYear: number;
  onDone: () => void;
  idPrefix: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [crop, setCrop] = useState<ExpenseCrop>("corn");
  const [category, setCategory] = useState("seed");
  const [description, setDescription] = useState("");
  const [units, setUnits] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [date, setDate] = useState(todayIso());
  const lineTotal = (toNum(unitCost) ?? 0) * (toNum(units) ?? 0);

  function submit() {
    if (toNum(unitCost) == null) return toast.error("Enter the cost.");
    start(async () => {
      const r = await addExpense({
        farmId,
        crop: crop === "whole" ? null : crop,
        cropYear,
        category,
        description,
        unitCost: toNum(unitCost) ?? 0,
        quantity: toNum(units) ?? 1,
        entryDate: date,
      });
      if (!r.ok) return void toast.error(r.error ?? "Could not save.");
      toast.success("Expense logged");
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <ExpenseCropSelect value={crop} onChange={setCrop} />
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <TextField id={`${idPrefix}-desc`} label="Brand / description" hint="optional" value={description} onChange={setDescription} placeholder="DeKalb DKC62-08" />
      <div className="grid grid-cols-2 gap-3">
        <MoneyField id={`${idPrefix}-units`} label="# of units" unit="×" value={units} onChange={setUnits} placeholder="1" step="1" />
        <MoneyField id={`${idPrefix}-cost`} label="Cost per unit" unit="$" value={unitCost} onChange={setUnitCost} placeholder="100" />
      </div>
      <div className="text-text-tertiary flex justify-between text-xs">
        <span>Line total</span>
        <span className="tnum text-foreground font-medium">${(Math.round(lineTotal * 100) / 100).toLocaleString()}</span>
      </div>
      <TextField id={`${idPrefix}-date`} label="Date" type="date" value={date} onChange={setDate} />
      {crop === "whole" && (
        <p className="text-text-tertiary text-[11px] leading-relaxed">
          Whole-farm cost — split across corn &amp; soybeans by acreage in each crop&apos;s break-even.
        </p>
      )}
      <SubmitButton pending={pending} onClick={submit} label="Log expense" />
    </div>
  );
}

// ── Sale ─────────────────────────────────────────────────────────────────────
export function SaleForm({
  farmId,
  cropYear,
  locations,
  onDone,
  idPrefix,
}: {
  farmId: string;
  cropYear: number;
  locations: EntryLocation[];
  onDone: () => void;
  idPrefix: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [crop, setCrop] = useState<Crop>("corn");
  const [bushels, setBushels] = useState("");
  const [price, setPrice] = useState("");
  const [loc, setLoc] = useState<string>(locations[0]?.id ?? "none");
  const [buyer, setBuyer] = useState("");
  const [date, setDate] = useState(todayIso());

  function submit() {
    if (toNum(bushels) == null || toNum(price) == null) return toast.error("Enter bushels and price.");
    start(async () => {
      const r = await addSale({
        farmId,
        crop,
        cropYear,
        bushels: toNum(bushels) ?? 0,
        price: toNum(price) ?? 0,
        storageLocationId: loc === "none" ? null : loc,
        buyer,
        entryDate: date,
      });
      if (!r.ok) return void toast.error(r.error ?? "Could not save.");
      toast.success("Sale logged");
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <CropSelect value={crop} onChange={setCrop} />
        <MoneyField id={`${idPrefix}-bu`} label="Bushels" unit="bu" value={bushels} onChange={setBushels} placeholder="5000" step="1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MoneyField id={`${idPrefix}-price`} label="Price per bushel" unit="$/bu" value={price} onChange={setPrice} placeholder="4.40" />
        <LocationSelect label="Sold from" locations={locations} value={loc} onChange={setLoc} />
      </div>
      <TextField id={`${idPrefix}-buyer`} label="Buyer" hint="optional" value={buyer} onChange={setBuyer} placeholder="Smith Co-op" />
      <TextField id={`${idPrefix}-date`} label="Date" type="date" value={date} onChange={setDate} />
      <SubmitButton pending={pending} onClick={submit} label="Log sale" />
    </div>
  );
}

// ── Harvest ──────────────────────────────────────────────────────────────────
export function HarvestForm({
  farmId,
  cropYear,
  locations,
  fields,
  onDone,
  idPrefix,
}: {
  farmId: string;
  cropYear: number;
  locations: EntryLocation[];
  fields: EntryField[];
  onDone: () => void;
  idPrefix: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [crop, setCrop] = useState<Crop>("corn");
  const [bushels, setBushels] = useState("");
  const [loc, setLoc] = useState<string>(locations[0]?.id ?? "none");
  const [moisture, setMoisture] = useState("");
  const [field, setField] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayIso());

  function submit() {
    if (toNum(bushels) == null) return toast.error("Enter bushels.");
    start(async () => {
      const r = await addHarvest({
        farmId,
        crop,
        cropYear,
        bushels: toNum(bushels) ?? 0,
        storageLocationId: loc === "none" ? null : loc,
        moisture: toNum(moisture),
        notes,
        entryDate: date,
        fieldId: field === "none" ? null : field,
      });
      if (!r.ok) return void toast.error(r.error ?? "Could not save.");
      toast.success("Harvest logged");
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <CropSelect value={crop} onChange={setCrop} />
        <MoneyField id={`${idPrefix}-bu`} label="Bushels" unit="bu" value={bushels} onChange={setBushels} placeholder="2400" step="1" />
      </div>
      <LocationSelect label="Stored in" locations={locations} value={loc} onChange={setLoc} />
      <div className="grid grid-cols-2 gap-3">
        <MoneyField id={`${idPrefix}-moist`} label="Moisture" hint="optional" unit="%" value={moisture} onChange={setMoisture} placeholder="15.5" />
        <TextField id={`${idPrefix}-date`} label="Date" type="date" value={date} onChange={setDate} />
      </div>
      {fields.length > 0 && <FieldSelect fields={fields} value={field} onChange={setField} />}
      <TextField id={`${idPrefix}-notes`} label="Notes" hint="optional" value={notes} onChange={setNotes} placeholder="North 80" />
      <SubmitButton pending={pending} onClick={submit} label="Log harvest" />
    </div>
  );
}
