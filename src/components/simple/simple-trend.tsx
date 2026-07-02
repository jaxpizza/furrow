"use client";

import { useState } from "react";

import { PriceChart, type ChartPoint } from "@/components/markets/price-chart";
import type { TechnicalsBundle } from "@/lib/outlook/technicals-types";
import { cn } from "@/lib/utils";

export type TrendCrop = {
  crop: "corn" | "soybean";
  label: string;
  points: ChartPoint[];
  tech: TechnicalsBundle | null;
};

const TREND = {
  uptrend: { word: "Trending up", arrow: "↗", tone: "text-[var(--pos)]" },
  downtrend: { word: "Trending down", arrow: "↘", tone: "text-[var(--neg)]" },
  sideways: { word: "Sideways", arrow: "→", tone: "text-[var(--neutral)]" },
} as const;

const money = (n: number) => `$${n.toFixed(2)}`;

/** A plain, honest read of the key levels — market structure, not a forecast. */
function levelsLine(tech: TechnicalsBundle): string | null {
  const r = tech.resistance?.value ?? null;
  const s = tech.support?.value ?? null;
  if (r != null && s != null)
    return `Resistance ${money(r)} above, support ${money(s)} below — a break above points higher, below points lower.`;
  if (r != null) return `Resistance ${money(r)} above — a break above points higher.`;
  if (s != null) return `Support ${money(s)} below — a break below points lower.`;
  return null;
}

/**
 * THE TREND — the app's calm amber chart with a Corn / Soybeans switch. When live
 * technicals are available it also conveys DIRECTION honestly: a trend badge, the
 * key support/resistance levels drawn on the chart, and a plain if/then line. This
 * is market structure — where price is and the levels that matter — NOT a
 * predicted future-price line.
 */
export function SimpleTrend({ crops }: { crops: TrendCrop[] }) {
  const [active, setActive] = useState<"corn" | "soybean">("corn");
  const current = crops.find((c) => c.crop === active) ?? crops[0];

  // Only speak to direction/levels when the technicals are real (never on sample).
  const tech = current?.tech && !current.tech.basedOnSample ? current.tech : null;
  const trend = tech ? TREND[tech.trend] : null;
  const levels = tech ? levelsLine(tech) : null;

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

      <div className="border-border bg-bg-surface/40 space-y-2 rounded-2xl border p-3">
        {trend && (
          <div className={cn("flex items-center gap-1.5 px-1 text-sm font-semibold", trend.tone)}>
            <span aria-hidden>{trend.arrow}</span>
            {trend.word}
          </div>
        )}
        {current && current.points.length > 1 ? (
          <PriceChart
            points={current.points}
            height={240}
            support={tech?.support?.value ?? null}
            resistance={tech?.resistance?.value ?? null}
          />
        ) : (
          <div className="text-text-tertiary flex h-[240px] items-center justify-center text-sm">
            Price history is refreshing.
          </div>
        )}
        {levels && <p className="text-text-tertiary px-1 text-[13px] leading-relaxed">{levels}</p>}
      </div>
    </section>
  );
}
