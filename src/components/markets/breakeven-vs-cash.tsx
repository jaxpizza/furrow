import { ArrowDownRight, ArrowUpRight, Target } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The at-a-glance moneymaker: where the live cash price sits relative to the
 * farmer's break-even. Direction is colorblind-safe — caret + word + color,
 * never hue alone. Strictly factual; never "sell now".
 */
export function BreakevenVsCash({
  breakeven,
  profitTargetPrice,
  cashPrice,
}: {
  breakeven: number | null;
  profitTargetPrice: number | null;
  cashPrice: number;
}) {
  if (breakeven == null) {
    return (
      <div className="border-border/70 text-text-secondary rounded-md border border-dashed bg-bg-elevated/30 px-4 py-3 text-sm">
        <span className="text-foreground font-medium">Set your break-even</span>{" "}
        below to track this cash price against it.
      </div>
    );
  }

  const diff = Math.round((cashPrice - breakeven) * 100) / 100;
  const above = diff >= 0;
  const atProfit = profitTargetPrice != null && cashPrice >= profitTargetPrice;
  const Icon = above ? ArrowUpRight : ArrowDownRight;

  const tone = atProfit
    ? "text-[var(--pos)]"
    : above
      ? "text-[var(--pos)]"
      : "text-[var(--neg)]";
  const box = atProfit
    ? "border-[var(--pos)]/30 bg-[var(--pos)]/10"
    : above
      ? "border-[var(--pos)]/25 bg-[var(--pos)]/8"
      : "border-[var(--neg)]/25 bg-[var(--neg)]/8";

  const headline = above
    ? `$${Math.abs(diff).toFixed(2)} above break-even`
    : `$${Math.abs(diff).toFixed(2)} below break-even`;

  const sub = atProfit
    ? `Cash is at or above your profit target of $${profitTargetPrice!.toFixed(2)}.`
    : above
      ? "Cash is at or above your break-even."
      : `Cash needs to rise $${Math.abs(diff).toFixed(2)} to reach your break-even of $${breakeven.toFixed(2)}.`;

  return (
    <div className={cn("rounded-md border px-4 py-3", box)}>
      <div className="flex items-center gap-2">
        {atProfit ? (
          <Target className={cn("size-4", tone)} strokeWidth={2.5} />
        ) : (
          <Icon className={cn("size-4", tone)} strokeWidth={2.5} />
        )}
        <span className={cn("tnum text-base font-semibold", tone)}>
          {headline}
        </span>
        <span className="text-text-tertiary tnum ml-auto text-xs">
          break-even ${breakeven.toFixed(2)}
          {profitTargetPrice != null && (
            <> · target ${profitTargetPrice.toFixed(2)}</>
          )}
        </span>
      </div>
      <p className="text-text-secondary mt-1.5 text-xs leading-relaxed">
        {sub} Informational, not financial advice.
      </p>
    </div>
  );
}
