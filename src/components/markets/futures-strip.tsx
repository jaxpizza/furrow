import { Card } from "@/components/ui/card";
import { Delta, type Direction } from "@/components/common/delta";

export function FuturesStrip({
  frontMonth,
  frontPrice,
  change,
  pct,
  direction,
  nextMonths,
  sampleData,
}: {
  frontMonth: string;
  frontPrice: number;
  change: number;
  pct: number;
  direction: Direction;
  nextMonths: string[];
  sampleData: boolean;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Futures
        </span>
        {sampleData && (
          <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
            SAMPLE
          </span>
        )}
      </div>

      {/* front month — live */}
      <div className="border-border/80 mt-3 flex items-center justify-between border-b pb-3">
        <div>
          <div className="text-foreground text-sm font-medium">
            {frontMonth}
          </div>
          <div className="text-text-tertiary text-[11px]">Front month</div>
        </div>
        <div className="text-right">
          <div className="tnum text-foreground text-lg font-semibold">
            ${frontPrice.toFixed(2)}
          </div>
          <Delta direction={direction} className="text-xs">
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)} ({pct >= 0 ? "+" : ""}
            {pct.toFixed(1)}%)
          </Delta>
        </div>
      </div>

      {/* upcoming contracts — labels only (per-contract prices need a richer feed) */}
      <ul className="mt-1 divide-y divide-border/60">
        {nextMonths.map((m) => (
          <li
            key={m}
            className="flex items-center justify-between py-2.5 text-sm"
          >
            <span className="text-text-secondary">{m}</span>
            <span className="tnum text-text-tertiary">—</span>
          </li>
        ))}
      </ul>
      <p className="text-text-tertiary mt-auto pt-3 text-[11px] leading-relaxed">
        Front month on the delayed feed. Per-contract months populate with a
        full futures-curve provider.
      </p>
    </Card>
  );
}
