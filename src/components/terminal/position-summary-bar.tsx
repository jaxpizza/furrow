import { cn } from "@/lib/utils";

import type { TerminalData } from "./types";

const money = (n: number) => `$${n.toFixed(2)}`;
const fmtBu = (n: number) => Math.round(n).toLocaleString();

/**
 * A calm, factual snapshot of the farmer's break-even position for the selected
 * crop — the hard numbers behind the cash-vs-break-even chart directly above it.
 *
 * Pure presentation: every value is READ from data already on the page, nothing
 * is recomputed and no new source is added. Cash is derived the SAME way the
 * chart derives its line (latest futures close + current basis, rounded to
 * cents), and the gap is cash − break-even off that same cash, so the strip and
 * the chart can never disagree. It always reflects the terminal's current crop
 * because `data` is already crop-specific.
 */
export function PositionSummaryBar({ data }: { data: TerminalData }) {
  // Cash = the chart's right-edge point (see cash-breakeven-chart.tsx).
  const basis = (data.cash?.basisCents ?? 0) / 100;
  const lastFutures = data.pricePoints.length
    ? data.pricePoints[data.pricePoints.length - 1].value
    : null;
  const cash = lastFutures != null ? Math.round((lastFutures + basis) * 100) / 100 : null;

  const breakeven = data.breakeven.effective;
  const gap = cash != null && breakeven != null ? Math.round((cash - breakeven) * 100) / 100 : null;
  const above = gap != null ? gap >= 0 : null;

  // Position facts come from the fusion layer already on the page. `fusion` is
  // null only when no ledger data exists — the cash/gap cells stay valid either
  // way, and the on-hand/%-sold cells degrade to honest hints.
  const hasPosition = data.fusion?.hasPosition ?? false;
  const remaining = data.fusion?.remaining ?? null;
  const pctSold = data.fusion?.pctSold ?? null;

  return (
    <section
      className="border-border overflow-hidden rounded-xl border"
      aria-label={`Break-even position for ${data.crop === "soybean" ? "soybeans" : "corn"}`}
    >
      <div className="bg-border grid grid-cols-2 gap-px md:grid-cols-5">
        {/* CASH PRICE */}
        <Cell label="Cash price">
          {cash != null ? <Val>{money(cash)}</Val> : <Dash />}
        </Cell>

        {/* BREAK-EVEN */}
        <Cell label="Break-even">
          {breakeven != null ? <Val>{money(breakeven)}</Val> : <Dash />}
        </Cell>

        {/* THE GAP — the hero cell: "am I making money right now?" */}
        <Cell
          label="The gap"
          className="col-span-2 md:col-span-1"
          style={
            gap != null
              ? {
                  backgroundColor: `color-mix(in oklab, var(--${above ? "pos" : "neg"}) 11%, var(--bg-surface))`,
                }
              : undefined
          }
        >
          {gap == null ? (
            breakeven == null ? (
              <Hint>Set your break-even</Hint>
            ) : (
              <Dash />
            )
          ) : (
            <div
              className={cn(
                "flex items-baseline gap-1.5",
                above ? "text-[var(--pos)]" : "text-[var(--neg)]",
              )}
            >
              <span className="tnum text-xl leading-none font-bold md:text-2xl">
                {above ? "+" : "−"}
                {money(Math.abs(gap))}
              </span>
              <span className="text-xs font-semibold">{above ? "above" : "below"}</span>
            </div>
          )}
        </Cell>

        {/* ON HAND — unsold bushels this applies to */}
        <Cell label="On hand">
          {hasPosition && remaining != null ? (
            <Val>
              {fmtBu(remaining)}{" "}
              <span className="text-text-tertiary text-xs font-normal">bu</span>
            </Val>
          ) : (
            <Hint>No grain logged</Hint>
          )}
        </Cell>

        {/* % SOLD */}
        <Cell label="% Sold">
          {pctSold != null ? <Val>{pctSold}%</Val> : <Dash />}
        </Cell>
      </div>
    </section>
  );
}

function Cell({
  label,
  className,
  style,
  children,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-[var(--bg-surface)] px-4 py-3", className)} style={style}>
      <div className="text-text-tertiary font-mono text-[10px] font-medium tracking-[0.12em] uppercase">
        {label}
      </div>
      <div className="mt-1.5 flex min-h-7 items-center">{children}</div>
    </div>
  );
}

function Val({ children }: { children: React.ReactNode }) {
  return <span className="tnum text-foreground text-[15px] font-semibold">{children}</span>;
}

function Dash() {
  return <span className="text-text-tertiary text-base">—</span>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-text-tertiary text-xs leading-snug">{children}</span>;
}
