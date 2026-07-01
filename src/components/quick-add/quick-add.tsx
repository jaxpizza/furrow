"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, DollarSign, Loader2, Plus, Receipt, Sprout, X } from "lucide-react";
import { toast } from "sonner";

import { addExpense, addHarvest, addSale } from "@/app/(app)/inputs/actions";
import { CropSelect, MoneyField, TextField, toNum, todayIso } from "@/components/inputs/field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/inputs/ledger";
import type { Crop } from "@/lib/types/database";

export type QuickAddLocation = { id: string; name: string; kind: string };
export type QuickAddField = { id: string; name: string };
type Kind = "expense" | "sale" | "harvest";

/**
 * The app-wide fast path: a thumb-friendly "+" that opens a bottom sheet to log
 * an expense, sale, or harvest in a few taps — writing to the SAME ledger tables
 * (and feeding the SAME break-even) as the full Inputs page, then refreshing the
 * page so the change shows immediately. The Inputs page stays for detailed work.
 */
export function QuickAdd({
  farmId,
  cropYear,
  locations,
  fields,
}: {
  farmId: string;
  cropYear: number;
  locations: QuickAddLocation[];
  fields: QuickAddField[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const close = () => {
    setOpen(false);
    setKind(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick add"
        className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-[#1b1403] shadow-lg shadow-black/40 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="size-7" strokeWidth={2.5} />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              className="bg-bg-elevated border-border absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t px-4 pt-3 pb-8 sm:bottom-4 sm:rounded-2xl sm:border"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            >
              <div className="bg-border mx-auto mb-3 h-1 w-10 rounded-full sm:hidden" />
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {kind && (
                    <button type="button" onClick={() => setKind(null)} aria-label="Back">
                      <ArrowLeft className="text-text-tertiary size-4" />
                    </button>
                  )}
                  <span className="text-foreground text-sm font-semibold">
                    {kind === "expense" ? "Log expense" : kind === "sale" ? "Log sale" : kind === "harvest" ? "Log harvest" : "Quick log"}
                  </span>
                </div>
                <button type="button" onClick={close} aria-label="Close">
                  <X className="text-text-tertiary size-5" />
                </button>
              </div>

              {!kind ? (
                <TypePicker onPick={setKind} />
              ) : kind === "expense" ? (
                <ExpenseForm farmId={farmId} cropYear={cropYear} onDone={close} />
              ) : kind === "sale" ? (
                <SaleForm farmId={farmId} cropYear={cropYear} locations={locations} onDone={close} />
              ) : (
                <HarvestForm farmId={farmId} cropYear={cropYear} locations={locations} fields={fields} onDone={close} />
              )}
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}

function TypePicker({ onPick }: { onPick: (k: Kind) => void }) {
  const opts = [
    { k: "expense" as const, label: "Expense", desc: "A cost you paid", Icon: Receipt },
    { k: "sale" as const, label: "Sale", desc: "Grain you sold", Icon: DollarSign },
    { k: "harvest" as const, label: "Harvest", desc: "Grain off the field", Icon: Sprout },
  ];
  return (
    <div className="space-y-2">
      {opts.map((o) => (
        <button
          key={o.k}
          type="button"
          onClick={() => onPick(o.k)}
          className="border-border bg-bg-surface/40 hover:border-[var(--accent)]/40 hover:bg-accent/40 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
            <o.Icon className="size-5" />
          </span>
          <span>
            <span className="text-foreground block text-sm font-medium">{o.label}</span>
            <span className="text-text-tertiary block text-xs">{o.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

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
  locations,
  value,
  onChange,
}: {
  locations: QuickAddLocation[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{value === "none" ? "Location" : "Location"}</Label>
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

function ExpenseForm({ farmId, cropYear, onDone }: { farmId: string; cropYear: number; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [crop, setCrop] = useState<Crop>("corn");
  const [category, setCategory] = useState("seed");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());

  function submit() {
    if (toNum(amount) == null) return toast.error("Enter the amount.");
    start(async () => {
      const r = await addExpense({
        farmId, crop, cropYear, category, description: "", unitCost: toNum(amount) ?? 0, quantity: 1, entryDate: date,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Could not save.");
        return;
      }
      toast.success("Expense logged");
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <CropSelect value={crop} onChange={setCrop} />
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
      <MoneyField id="qa-exp-amt" label="Amount" unit="$" value={amount} onChange={setAmount} placeholder="1200" />
      <TextField id="qa-exp-date" label="Date" type="date" value={date} onChange={setDate} />
      <SubmitButton pending={pending} onClick={submit} label="Log expense" />
    </div>
  );
}

function SaleForm({
  farmId,
  cropYear,
  locations,
  onDone,
}: {
  farmId: string;
  cropYear: number;
  locations: QuickAddLocation[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [crop, setCrop] = useState<Crop>("corn");
  const [bushels, setBushels] = useState("");
  const [price, setPrice] = useState("");
  const [loc, setLoc] = useState<string>(locations[0]?.id ?? "none");
  const [date, setDate] = useState(todayIso());

  function submit() {
    if (toNum(bushels) == null || toNum(price) == null) return toast.error("Enter bushels and price.");
    start(async () => {
      const r = await addSale({
        farmId, crop, cropYear, bushels: toNum(bushels) ?? 0, price: toNum(price) ?? 0,
        storageLocationId: loc === "none" ? null : loc, buyer: "", entryDate: date,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Could not save.");
        return;
      }
      toast.success("Sale logged");
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <CropSelect value={crop} onChange={setCrop} />
        <MoneyField id="qa-sale-bu" label="Bushels" unit="bu" value={bushels} onChange={setBushels} placeholder="5000" step="1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MoneyField id="qa-sale-price" label="Price" unit="$/bu" value={price} onChange={setPrice} placeholder="4.40" />
        <LocationSelect locations={locations} value={loc} onChange={setLoc} />
      </div>
      <TextField id="qa-sale-date" label="Date" type="date" value={date} onChange={setDate} />
      <SubmitButton pending={pending} onClick={submit} label="Log sale" />
    </div>
  );
}

function HarvestForm({
  farmId,
  cropYear,
  locations,
  fields,
  onDone,
}: {
  farmId: string;
  cropYear: number;
  locations: QuickAddLocation[];
  fields: QuickAddField[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [crop, setCrop] = useState<Crop>("corn");
  const [bushels, setBushels] = useState("");
  const [loc, setLoc] = useState<string>(locations[0]?.id ?? "none");
  // Field is OPTIONAL — defaults to "none" so the simple flow stays a few taps.
  const [field, setField] = useState<string>("none");
  const [date, setDate] = useState(todayIso());

  function submit() {
    if (toNum(bushels) == null) return toast.error("Enter bushels.");
    start(async () => {
      const r = await addHarvest({
        farmId, crop, cropYear, bushels: toNum(bushels) ?? 0,
        storageLocationId: loc === "none" ? null : loc, moisture: null, notes: "", entryDate: date,
        fieldId: field === "none" ? null : field,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Could not save.");
        return;
      }
      toast.success("Harvest logged");
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <CropSelect value={crop} onChange={setCrop} />
        <MoneyField id="qa-harv-bu" label="Bushels" unit="bu" value={bushels} onChange={setBushels} placeholder="2400" step="1" />
      </div>
      <LocationSelect locations={locations} value={loc} onChange={setLoc} />
      {fields.length > 0 && <FieldSelect fields={fields} value={field} onChange={setField} />}
      <TextField id="qa-harv-date" label="Date" type="date" value={date} onChange={setDate} />
      <SubmitButton pending={pending} onClick={submit} label="Log harvest" />
    </div>
  );
}

/** Optional per-field tag for a harvest — defaults to "No field" so farm-level
 *  logging stays a few taps; picking one builds that field's yield history. */
function FieldSelect({
  fields,
  value,
  onChange,
}: {
  fields: QuickAddField[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-text-tertiary">
        Field <span className="font-normal">· optional</span>
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
