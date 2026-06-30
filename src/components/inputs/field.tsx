"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A labeled numeric field with a trailing unit — the Furrow money-input pattern
 *  (mirrors the break-even card), tabular-mono. */
export function MoneyField({
  id,
  label,
  hint,
  unit,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
          step="0.01"
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
