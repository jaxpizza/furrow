"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { allocateWholeFarm, CATEGORY_LABEL, CROPS, expenseTotals, type ExpenseEntry } from "@/lib/inputs/ledger";
import { CROP_LABEL } from "@/lib/markets/symbols";
import type { Crop } from "@/lib/types/database";
import { cn } from "@/lib/utils";

import { deleteExpense } from "@/app/(app)/inputs/actions";
import { CropBreakeven } from "./crop-breakeven";
import { ExpenseForm } from "./entry-forms";
import { CropBadge, DeleteButton } from "./field";

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

  // Whole-farm (crop = null) costs allocated across crops by acreage — the SAME
  // math syncBreakeven writes to breakeven_targets, surfaced here for transparency.
  const acresByCrop = {
    corn: settingsByCrop.corn?.acres ?? null,
    soybean: settingsByCrop.soybean?.acres ?? null,
  } as Record<Crop, number | null>;
  const alloc = allocateWholeFarm(
    expenses.map((e) => ({ crop: e.crop, lineTotal: e.lineTotal })),
    acresByCrop,
  );

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">Your costs</span>
          <p className="text-text-tertiary mt-0.5 text-[11px] leading-relaxed">
            Every expense you log feeds the break-even above. Not tied to one crop? Pick{" "}
            <span className="text-foreground">Whole farm</span> — it&apos;s split across crops by acreage.
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
              <DeleteButton onDelete={() => deleteExpense({ id: e.id, farmId, cropYear })} />
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
              allocation={alloc[crop]}
              settings={settingsByCrop[crop]}
            />
          ))}
        </div>
      </div>

      <Explainer>
        Log every purchase as a line, picking the crop — buy $100 of corn seed, then $10 more, and that&apos;s
        two entries that sum to $110 automatically. Whole-farm costs (fuel, parts) split across crops by acreage.
        One unified log; corn and soybean numbers stay distinct.
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

/** Trigger + dialog chrome around the SHARED ExpenseForm (same fields as the "+"). */
function AddExpenseDialog({ farmId, cropYear }: { farmId: string; cropYear: number }) {
  const [open, setOpen] = useState(false);
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
        <ExpenseForm farmId={farmId} cropYear={cropYear} onDone={() => setOpen(false)} idPrefix="in-exp" />
      </DialogContent>
    </Dialog>
  );
}
