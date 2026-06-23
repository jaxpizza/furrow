import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { MOCK_FIELDS_SUMMARY } from "@/lib/mock-data";

export function FieldsCard() {
  const f = MOCK_FIELDS_SUMMARY;
  const cornPct = Math.round((f.cornAcres / f.totalAcres) * 100);
  const soyPct = 100 - cornPct;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Fields
        </span>
        <Link
          href="/fields"
          className="text-text-tertiary hover:text-foreground flex items-center gap-1 text-[11px] transition-colors"
        >
          View <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="tnum text-3xl font-semibold">
          {f.totalAcres.toLocaleString()}
        </span>
        <span className="text-text-secondary text-xs">acres</span>
        <span className="tnum text-text-tertiary ml-auto text-xs">
          {f.fieldCount} fields
        </span>
      </div>

      {/* Crop-mix bar */}
      <div className="bg-bg-elevated mt-4 flex h-2 overflow-hidden rounded-full">
        <div className="bg-[var(--accent)]" style={{ width: `${cornPct}%` }} />
        <div className="bg-[var(--pos)]" style={{ width: `${soyPct}%` }} />
      </div>
      <div className="text-text-secondary mt-2 flex justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--accent)]" />
          Corn <span className="tnum text-foreground">{cornPct}%</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--pos)]" />
          Soybean <span className="tnum text-foreground">{soyPct}%</span>
        </span>
      </div>
    </Card>
  );
}
