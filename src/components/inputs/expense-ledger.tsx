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
import { CATEGORY_LABEL, CROPS, EXPENSE_CATEGORIES, expenseTotals, type ExpenseEntry } from "@/lib/inputs/ledger";
import { CROP_LABEL } from "@/lib/markets/symbols";
import type { Crop } from "@/lib/types/database";
import { cn } from "@/lib/utils";

import { addExpense, deleteExpense } from "@/app/(app)/inputs/actions";
import { CropBreakeven } from "./crop-breakeven";
import { CropBadge, CropSelect, DeleteButton, MoneyField, TextField, toNum, todayIso } from "./field";

export function ExpenseLedger({
  farmId,
  cropYear,
  expenses,
  settingsByCrop,
}: {
  farmId: string;
  cropYear: number;
  expenses: ExpenseEntry[];
  settingsByCrop: Record<Crop, { acres: number | null; expectedYield: number | null } | null>;
}) {
  const [filter, setFilter] = useState<Crop | "all">("all");
  const shown = filter === "all" ? expenses : expenses.filter((e) => e.crop === filter);
  const shownTotal = expenseTotals(shown).total;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">Your costs</span>
          <p className="text-text-tertiary mt-0.5 text-[11px] leading-relaxed">
            Every expense you log feeds the break-even above.
          </p>
        </div>
        <AddExpenseDialog farmId={farmId} cropYear={cropYear} />
      </div>

      {/* unified, crop-tagged expense list */}
      <div className="border-border/70 mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">All expenses</span>
        <CropFilter value={filter} onChange={setFilter} />
      </div>
      {shown.length === 0 ? (
        <p className="text-text-secondary py-4 text-center text-sm">
          No expenses logged{filter !== "all" ? ` for ${CROP_LABEL[filter]}` : ""} yet. Add each purchase as it
          happens — the app tallies the total and your per-crop break-even.
        </p>
      ) : (
        <ul className="divide-border/50 mt-1 divide-y">
          {shown.map((e) => (
            <li key={e.id} className="flex items-center gap-2.5 py-2 text-sm">
              <span className="text-text-tertiary tnum w-12 shrink-0 text-[11px]">{e.entryDate.slice(5)}</span>
              <CropBadge crop={e.crop} />
              <span className="text-foreground w-24 shrink-0 font-medium">{CATEGORY_LABEL[e.category] ?? e.category}</span>
              <span className="text-text-secondary min-w-0 flex-1 truncate text-xs">
                {e.description}
                {e.quantity !== 1 && <span className="text-text-tertiary tnum"> · ${e.unitCost} × {e.quantity}</span>}
              </span>
              <span className="tnum text-foreground shrink-0 font-medium">${e.lineTotal.toLocaleString()}</span>
              <DeleteButton onDelete={() => deleteExpense({ id: e.id, farmId, crop: e.crop, cropYear })} />
            </li>
          ))}
          <li className="flex items-center justify-between py-2">
            <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
              {filter === "all" ? "Total" : `${CROP_LABEL[filter]} total`}
            </span>
            <span className="tnum text-foreground pr-7 font-semibold">${shownTotal.toLocaleString()}</span>
          </li>
        </ul>
      )}

      {/* the yield side of the break-even — acres × bu/acre */}
      <div className="border-border/70 mt-4 border-t pt-4">
        <span className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">
          Your expected yield (acres × bu/acre)
        </span>
        <p className="text-text-tertiary mt-0.5 mb-3 text-[11px] leading-relaxed">
          Acres and expected yield turn your total cost into a cost per bushel — the break-even above.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CROPS.map((crop) => (
            <CropBreakeven
              key={crop}
              farmId={farmId}
              crop={crop}
              cropLabel={CROP_LABEL[crop]}
              cropYear={cropYear}
              total={expenseTotals(expenses.filter((e) => e.crop === crop)).total}
              settings={settingsByCrop[crop]}
            />
          ))}
        </div>
      </div>

      <Explainer>
        Log every purchase as a line, picking the crop — buy $100 of corn seed, then $10 more, and that&apos;s
        two entries that sum to $110 automatically. One unified log; corn and soybean numbers stay distinct.
      </Explainer>
    </Card>
  );
}

function CropFilter({ value, onChange }: { value: Crop | "all"; onChange: (v: Crop | "all") => void }) {
  const opts: (Crop | "all")[] = ["all", "corn", "soybean"];
  return (
    <div className="border-border bg-bg-elevated/60 inline-flex gap-0.5 rounded-md border p-0.5">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded px-2 py-0.5 text-[11px] font-medium capitalize transition-colors",
            value === o ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-text-tertiary hover:text-foreground",
          )}
        >
          {o === "all" ? "All" : o === "soybean" ? "Soy" : "Corn"}
        </button>
      ))}
    </div>
  );
}

function AddExpenseDialog({ farmId, cropYear }: { farmId: string; cropYear: number }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [crop, setCrop] = useState<Crop>("corn");
  const [category, setCategory] = useState("seed");
  const [description, setDescription] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [entryDate, setEntryDate] = useState(todayIso());
  const lineTotal = (toNum(unitCost) ?? 0) * (toNum(quantity) ?? 0);

  async function submit() {
    if (toNum(unitCost) == null) return toast.error("Enter the cost.");
    setPending(true);
    const r = await addExpense({
      farmId,
      crop,
      cropYear,
      category,
      description,
      unitCost: toNum(unitCost) ?? 0,
      quantity: toNum(quantity) ?? 1,
      entryDate,
    });
    setPending(false);
    if (!r.ok) return toast.error(r.error ?? "Could not add.");
    toast.success("Expense added");
    setOpen(false);
    setDescription("");
    setUnitCost("");
    setQuantity("1");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Add expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
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
          <TextField id="ae-desc" label="Brand / description" hint="optional" value={description} onChange={setDescription} placeholder="DeKalb DKC62-08" />
          <div className="grid grid-cols-2 gap-3">
            <MoneyField id="ae-unit" label="Cost per unit" unit="$" value={unitCost} onChange={setUnitCost} placeholder="100" />
            <MoneyField id="ae-qty" label="Quantity" unit="×" value={quantity} onChange={setQuantity} placeholder="1" />
          </div>
          <TextField id="ae-date" label="Date" type="date" value={entryDate} onChange={setEntryDate} />
          <div className="text-text-tertiary flex justify-between text-xs">
            <span>Line total</span>
            <span className="tnum text-foreground font-medium">${(Math.round(lineTotal * 100) / 100).toLocaleString()}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Add expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
