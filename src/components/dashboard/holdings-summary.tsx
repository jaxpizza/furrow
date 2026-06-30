import Link from "next/link";
import { ArrowUpRight, Wallet } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CropHolding = {
  crop: string;
  label: string;
  onHand: number; // bushels remaining (unsold)
  cashPrice: number | null;
  breakeven: number | null;
  pctSold: number | null;
  holdingsValue: number | null; // onHand × cash
};

/** Top-of-dashboard holdings: what's on hand, what it's worth at today's cash,
 *  and where it sits vs break-even — the operation's value at a glance. */
export function HoldingsSummary({ holdings }: { holdings: CropHolding[] }) {
  const withGrain = holdings.filter((h) => h.onHand > 0);
  const totalValue = withGrain.reduce((s, h) => s + (h.holdingsValue ?? 0), 0);
  const totalBu = withGrain.reduce((s, h) => s + h.onHand, 0);

  if (withGrain.length === 0) {
    return (
      <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Wallet className="text-text-tertiary size-4" />
          <span className="text-text-secondary text-sm">
            No grain on hand yet — log your harvest in{" "}
            <Link href="/inputs" className="text-[var(--accent)] hover:underline">
              Inputs
            </Link>{" "}
            to see your holdings value and break-even position here.
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-text-tertiary flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
            <Wallet className="size-3.5" /> Current holdings value
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="tnum text-3xl font-semibold tracking-tight">
              ${fmt(Math.round(totalValue))}
            </span>
            <span className="text-text-tertiary text-xs">
              <span className="tnum">{fmt(totalBu)}</span> bu on hand
            </span>
          </div>
        </div>
        <Link
          href="/inputs"
          className="text-text-tertiary hover:text-[var(--accent)] inline-flex items-center gap-1 text-[11px] transition-colors"
        >
          Manage in Inputs <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
        {withGrain.map((h) => {
          const diff =
            h.cashPrice != null && h.breakeven != null
              ? Math.round((h.cashPrice - h.breakeven) * 100) / 100
              : null;
          const above = diff != null && diff >= 0;
          return (
            <div key={h.crop} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-foreground text-sm font-medium">{h.label}</div>
                <div className="text-text-tertiary text-[11px]">
                  <span className="tnum">{fmt(h.onHand)}</span> bu
                  {h.pctSold != null && <span className="tnum"> · {h.pctSold}% sold</span>}
                  {h.cashPrice != null && <span className="tnum"> · cash ${h.cashPrice.toFixed(2)}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="tnum text-foreground text-sm font-semibold">
                  ${fmt(Math.round(h.holdingsValue ?? 0))}
                </div>
                {diff != null ? (
                  <div className={cn("tnum text-[11px]", above ? "text-[var(--pos)]" : "text-[var(--neg)]")}>
                    {above ? "+" : ""}
                    ${Math.abs(diff).toFixed(2)} {above ? "above" : "below"} break-even
                  </div>
                ) : (
                  <div className="text-text-tertiary text-[11px]">set break-even</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
