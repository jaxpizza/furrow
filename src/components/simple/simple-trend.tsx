"use client";

import { useState } from "react";

import { PriceChart, type ChartPoint } from "@/components/markets/price-chart";
import { cn } from "@/lib/utils";

export type TrendCrop = { crop: "corn" | "soybean"; label: string; points: ChartPoint[] };

/**
 * THE TREND — reuses the app's calm amber price chart (with its own range toggles
 * and hover), fronted by a simple Corn / Soybeans switch so the screen only ever
 * shows one chart at a time. "See the trend," nothing more.
 */
export function SimpleTrend({ crops }: { crops: TrendCrop[] }) {
  const [active, setActive] = useState<"corn" | "soybean">("corn");
  const current = crops.find((c) => c.crop === active) ?? crops[0];

  return (
    <section aria-label="Price trend" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-text-secondary text-sm font-medium">The trend</h2>
        <div className="border-border bg-bg-elevated/60 inline-flex items-center gap-0.5 rounded-md border p-0.5">
          {crops.map((c) => (
            <button
              key={c.crop}
              type="button"
              onClick={() => setActive(c.crop)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                active === c.crop
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-text-secondary hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-border bg-bg-surface/40 rounded-2xl border p-3">
        {current && current.points.length > 1 ? (
          <PriceChart points={current.points} height={240} />
        ) : (
          <div className="text-text-tertiary flex h-[240px] items-center justify-center text-sm">
            Price history is refreshing.
          </div>
        )}
      </div>
    </section>
  );
}
