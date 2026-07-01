"use client";

import { useState } from "react";
import { Loader2, Sprout, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fieldHistory, type FieldHarvest, type FieldPlanting } from "@/lib/fields";
import { formatAcres } from "@/lib/geo";
import { currentCropYear } from "@/lib/inputs/ledger";
import { CROP_LABEL } from "@/lib/markets/symbols";
import type { Crop } from "@/lib/types/database";

const CROPS: Crop[] = ["corn", "soybean"];

/** A field's year-over-year record: what was planted each year and what it
 *  yielded (bushels, and bu/acre when the field's acreage is known). Recording a
 *  planting writes to public.plantings; yield comes from harvests OPTIONALLY
 *  tagged to this field when logged. */
export function FieldRecords({
  field,
  plantings,
  harvests,
  onRecordPlanting,
  onDeletePlanting,
  pending,
}: {
  field: { id: string; name: string; acreage: number | null };
  plantings: FieldPlanting[];
  harvests: FieldHarvest[];
  onRecordPlanting: (crop: Crop, cropYear: number) => void;
  onDeletePlanting: (cropYear: number) => void;
  pending: boolean;
}) {
  const history = fieldHistory(field, plantings, harvests);
  const thisYear = currentCropYear();
  const years = [0, 1, 2, 3, 4].map((n) => thisYear - n);
  const [crop, setCrop] = useState<Crop>("corn");
  const [year, setYear] = useState(thisYear);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-text-tertiary text-[11px] tracking-wide uppercase">Field record</div>
        <div className="text-sm font-medium">{field.name}</div>
        <div className="text-text-tertiary tnum text-xs">
          {formatAcres(field.acreage)} ac
          {field.acreage == null && " · add acreage to see bu/ac"}
        </div>
      </div>

      {/* per-year history */}
      {history.length === 0 ? (
        <p className="text-text-secondary text-xs leading-relaxed">
          No records yet. Record what&apos;s planted below; when you log a harvest you can tag it to this field,
          and it shows here as yield.
        </p>
      ) : (
        <ul className="divide-border/60 divide-y">
          {history.map((r) => (
            <li key={r.year} className="flex items-center gap-2 py-2 text-sm">
              <span className="tnum text-text-tertiary w-10 shrink-0 text-xs">{r.year}</span>
              <span className="text-foreground w-16 shrink-0 font-medium">{r.crop ? CROP_LABEL[r.crop] : "—"}</span>
              <span className="text-text-secondary min-w-0 flex-1 truncate text-xs">
                {r.harvestedBu > 0 ? (
                  <>
                    <span className="tnum text-foreground font-medium">{r.harvestedBu.toLocaleString()}</span> bu
                    {r.buPerAcre != null && (
                      <span className="tnum text-[var(--accent)]"> · {r.buPerAcre} bu/ac</span>
                    )}
                  </>
                ) : (
                  <span className="text-text-tertiary">planted · no harvest tagged yet</span>
                )}
              </span>
              {r.crop && (
                <button
                  onClick={() => onDeletePlanting(r.year)}
                  disabled={pending}
                  className="text-text-tertiary rounded p-1 transition-colors hover:text-[var(--neg)] disabled:opacity-50"
                  aria-label={`Remove ${r.year} planting`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* record a planting */}
      <div className="border-border/70 space-y-2 rounded-md border bg-bg-elevated/40 p-3">
        <Label className="text-text-tertiary text-[11px] tracking-wide uppercase">Record planting</Label>
        <div className="grid grid-cols-2 gap-2">
          <Select value={crop} onValueChange={(v) => setCrop(v as Crop)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CROPS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CROP_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={pending}
          onClick={() => onRecordPlanting(crop, year)}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sprout className="size-4" />}
          Save {CROP_LABEL[crop]} · {year}
        </Button>
      </div>
    </div>
  );
}
