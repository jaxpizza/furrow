import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { BreakevenVsCash } from "@/components/markets/breakeven-vs-cash";
import { Card } from "@/components/ui/card";

import type { CropPulse } from "./types";

/** Where each crop's live cash sits vs the farmer's break-even — reuses the
 *  markets BreakevenVsCash. Honest empty-state when a break-even isn't set. */
export function BreakevenStatus({ pulses }: { pulses: CropPulse[] }) {
  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      {pulses.map((p) => (
        <div key={p.crop} className="space-y-1.5">
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
            {p.label}
          </span>
          {p.cashPrice != null ? (
            <BreakevenVsCash
              breakeven={p.breakeven.effective}
              profitTargetPrice={p.breakeven.profitTargetPrice}
              cashPrice={p.cashPrice}
            />
          ) : (
            <div className="border-border text-text-tertiary rounded-md border border-dashed px-4 py-3 text-sm">
              Cash price unavailable.
            </div>
          )}
        </div>
      ))}
      <Link
        href="/markets"
        className="text-text-tertiary hover:text-[var(--accent)] mt-auto inline-flex items-center gap-1 self-end text-[11px] transition-colors"
      >
        Manage break-even targets
        <ArrowUpRight className="size-3" />
      </Link>
    </Card>
  );
}
