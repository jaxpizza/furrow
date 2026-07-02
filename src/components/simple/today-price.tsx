import { cn } from "@/lib/utils";

export type PriceCell = {
  crop: "corn" | "soybean";
  label: string;
  cashPrice: number | null;
  change: number | null;
  pct: number | null;
  direction: "up" | "down" | "flat";
  contractMonth: string | null;
  isSample: boolean;
  isStale: boolean;
};

const TONE = {
  up: "text-[var(--pos)]",
  down: "text-[var(--neg)]",
  flat: "text-text-tertiary",
} as const;

const ARROW = { up: "▲", down: "▼", flat: "•" } as const;

/**
 * TODAY'S PRICE — corn and soybeans side by side, big and glanceable. The cash
 * bid (futures + the farm's basis) is the number a farmer actually gets paid, so
 * it leads. Honest about the feed: a small note flags sample or stale data.
 */
export function TodayPrice({ cells }: { cells: PriceCell[] }) {
  return (
    <section aria-label="Today's price">
      <div className="grid grid-cols-2 gap-3">
        {cells.map((c) => (
          <div key={c.crop} className="border-border bg-bg-surface/60 rounded-2xl border p-4">
            <div className="text-text-tertiary font-mono text-[11px] font-medium tracking-[0.12em] uppercase">
              {c.label}
            </div>
            <div className="tnum mt-1.5 text-[2rem] leading-none font-semibold tracking-tight sm:text-4xl">
              {c.cashPrice != null ? `$${c.cashPrice.toFixed(2)}` : "—"}
            </div>
            <div className={cn("tnum mt-2 flex items-center gap-1.5 text-sm font-medium", TONE[c.direction])}>
              <span>{ARROW[c.direction]}</span>
              {c.change != null && c.pct != null ? (
                <span>
                  {c.change >= 0 ? "+" : "−"}
                  {Math.abs(c.change).toFixed(2)}
                  <span className="text-text-tertiary ml-1.5 font-normal">
                    ({c.pct >= 0 ? "+" : "−"}
                    {Math.abs(c.pct).toFixed(1)}%)
                  </span>
                </span>
              ) : (
                <span className="text-text-tertiary font-normal">today</span>
              )}
            </div>
            <div className="text-text-tertiary mt-2 text-[11px]">
              {c.isSample
                ? "sample data"
                : c.isStale
                  ? "last known"
                  : `cash bid${c.contractMonth ? ` · ${c.contractMonth}` : ""}`}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
