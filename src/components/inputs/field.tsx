"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CROP_SHORT } from "@/lib/inputs/ledger";
import type { Crop } from "@/lib/types/database";
import { cn } from "@/lib/utils";

/** Per-entry crop picker — the crop is a property of each logged entry. */
export function CropSelect({ value, onChange }: { value: Crop; onChange: (c: Crop) => void }) {
  return (
    <div className="space-y-1">
      <Label>Crop</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Crop)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="corn">Corn</SelectItem>
          <SelectItem value="soybean">Soybeans</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** "whole" = a whole-farm expense (crop = null) — not tied to one crop. */
export type ExpenseCrop = Crop | "whole";

/** Expense crop picker — like CropSelect but with a "Whole farm" option for costs
 *  (fuel, parts, maintenance) that aren't tied to one crop. Whole-farm costs are
 *  allocated across crops by acreage in the break-even, never dropped. */
export function ExpenseCropSelect({ value, onChange }: { value: ExpenseCrop; onChange: (c: ExpenseCrop) => void }) {
  return (
    <div className="space-y-1">
      <Label>Crop</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ExpenseCrop)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="corn">Corn</SelectItem>
          <SelectItem value="soybean">Soybeans</SelectItem>
          <SelectItem value="whole">Whole farm</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Per-row crop tag — colorblind-safe (distinct label + hue). null = whole farm. */
export function CropBadge({ crop }: { crop: Crop | null }) {
  if (crop == null) {
    return (
      <span className="text-text-secondary bg-bg-elevated shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
        Farm
      </span>
    );
  }
  const corn = crop === "corn";
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        corn ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-[var(--pos)]/15 text-[var(--pos)]",
      )}
    >
      {CROP_SHORT[crop]}
    </span>
  );
}

/** Labeled numeric field with a trailing unit — the Furrow money-input pattern. */
export function MoneyField({
  id,
  label,
  hint,
  unit,
  value,
  onChange,
  placeholder,
  step = "0.01",
}: {
  id: string;
  label: string;
  hint?: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="flex items-baseline gap-1.5">
        {label}
        {hint && <span className="text-text-tertiary text-[10px] font-normal normal-case">{hint}</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="tnum pr-12"
        />
        <span className="text-text-tertiary absolute top-1/2 right-3 -translate-y-1/2 text-xs">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="flex items-baseline gap-1.5">
        {label}
        {hint && <span className="text-text-tertiary text-[10px] font-normal normal-case">{hint}</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(type === "date" && "tnum")}
      />
    </div>
  );
}

/** Inline delete button that runs a server action and toasts on failure. */
export function DeleteButton({
  onDelete,
  label = "Delete entry",
}: {
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const r = await onDelete();
        setPending(false);
        if (!r.ok) toast.error(r.error ?? "Could not delete.");
      }}
      className="text-text-tertiary hover:text-[var(--neg)] shrink-0 rounded p-1 transition-colors disabled:opacity-40"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}

export function numStr(n: number | null | undefined): string {
  return n != null ? String(n) : "";
}
export function toNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
