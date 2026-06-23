"use client";

import { useState } from "react";
import { Loader2, PencilRuler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TENURE_META, TENURE_OPTIONS } from "@/lib/fields";
import { formatAcres } from "@/lib/geo";
import type { Tenure } from "@/lib/types/database";

export type FieldFormValues = {
  name: string;
  acreage: number | null;
  tenure: Tenure;
  rent_per_acre: number | null;
};

export function FieldForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  onEditGeometry,
  pending,
}: {
  mode: "create" | "edit";
  initial: FieldFormValues;
  onSubmit: (v: FieldFormValues) => void;
  onCancel: () => void;
  onEditGeometry?: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [acreage, setAcreage] = useState(
    initial.acreage != null ? String(initial.acreage.toFixed(1)) : "",
  );
  const [tenure, setTenure] = useState<Tenure>(initial.tenure);
  const [rent, setRent] = useState(
    initial.rent_per_acre != null ? String(initial.rent_per_acre) : "",
  );

  const rented = TENURE_META[tenure].rented;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      acreage: acreage === "" ? null : Number(acreage),
      tenure,
      rent_per_acre: rented && rent !== "" ? Number(rent) : null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="field-name">Field name</Label>
        <Input
          id="field-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="North 80"
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="field-acreage">
          Acreage{" "}
          {mode === "create" && initial.acreage != null && (
            <span className="text-text-tertiary font-normal">
              · measured {formatAcres(initial.acreage)} ac
            </span>
          )}
        </Label>
        <div className="relative">
          <Input
            id="field-acreage"
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            value={acreage}
            onChange={(e) => setAcreage(e.target.value)}
            className="tnum pr-10"
          />
          <span className="text-text-tertiary absolute top-1/2 right-3 -translate-y-1/2 text-xs">
            ac
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="field-tenure">Tenure</Label>
        <Select value={tenure} onValueChange={(v) => setTenure(v as Tenure)}>
          <SelectTrigger id="field-tenure" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TENURE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {TENURE_META[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rented && (
        <div className="space-y-1.5">
          <Label htmlFor="field-rent">Rent / acre</Label>
          <div className="relative">
            <span className="text-text-tertiary absolute top-1/2 left-3 -translate-y-1/2 text-xs">
              $
            </span>
            <Input
              id="field-rent"
              type="number"
              step="1"
              min="0"
              inputMode="decimal"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="0"
              className="tnum pl-7"
            />
          </div>
        </div>
      )}

      {mode === "edit" && onEditGeometry && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onEditGeometry}
          disabled={pending}
        >
          <PencilRuler className="size-4" />
          Edit shape on map
        </Button>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Save field" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
