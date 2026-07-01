import { Card } from "@/components/ui/card";
import type { SpendCategory } from "@/lib/inputs/ledger";

/** A calm, at-a-glance reflection of where the money went this crop year: a total
 *  tally + a horizontal bar breakdown by category (largest-first, share of total).
 *  Whole-operation (all crops); a presentation layer over the same summed expense
 *  data the break-even uses — no new storage, no math change. */
export function SpendingSummary({
  total,
  count,
  cropYear,
  rows,
}: {
  total: number;
  count: number;
  cropYear: number;
  rows: SpendCategory[];
}) {
  if (count === 0) {
    return (
      <Card className="p-5">
        <div className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Spending this crop year
        </div>
        <p className="text-text-secondary mt-2 text-sm leading-relaxed">
          Log your first expense to see where your money&apos;s going.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
        Spending this crop year
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="tnum text-3xl font-semibold tracking-tight">${fmt(total)}</span>
        <span className="text-text-tertiary text-xs">
          across <span className="tnum">{count}</span> {count === 1 ? "expense" : "expenses"} · {cropYear} crop year
        </span>
      </div>

      <div className="border-border/70 mt-4 space-y-2.5 border-t pt-4">
        <div className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">
          By category
        </div>
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground min-w-0 truncate">{r.label}</span>
              <span className="shrink-0 whitespace-nowrap">
                <span className="tnum text-foreground font-medium">${fmt(r.amount)}</span>
                <span className="text-text-tertiary tnum text-xs"> · {r.pct}%</span>
              </span>
            </div>
            <div className="bg-bg-elevated mt-1 h-2 overflow-hidden rounded-full" aria-hidden>
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${Math.max(r.pct, 1.5)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
