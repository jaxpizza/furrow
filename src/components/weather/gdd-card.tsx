import { Card } from "@/components/ui/card";
import { Delta } from "@/components/common/delta";
import type { GddRead } from "@/lib/weather/types";

import { Explainer } from "./explainer";

const CORN_MATURITY = 2700;

export function GddCard({ gdd }: { gdd: GddRead | null }) {
  if (!gdd) {
    return (
      <Card className="p-5">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Growing Degree Days
        </span>
        <p className="text-text-secondary mt-3 text-sm">
          GDD history unavailable for this location.
        </p>
      </Card>
    );
  }

  const pct = gdd.normal > 0 ? Math.min(140, (gdd.accumulated / gdd.normal) * 100) : 100;

  return (
    <Card className="flex flex-col p-5">
      <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
        Growing Degree Days
      </span>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="tnum text-4xl font-semibold">
          {gdd.accumulated.toLocaleString()}
        </span>
        <span className="text-text-secondary text-xs">GDD₅₀</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Delta
          direction={
            gdd.aheadBehind === "ahead"
              ? "up"
              : gdd.aheadBehind === "behind"
                ? "down"
                : "flat"
          }
        >
          {gdd.delta >= 0 ? "+" : ""}
          {gdd.delta} ({gdd.aheadBehind})
        </Delta>
      </div>

      {/* accumulated vs normal */}
      <div className="bg-bg-elevated relative mt-4 h-1.5 rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
          style={{ width: `${pct}%` }}
        />
        {/* normal marker at 100% of normal */}
        <div
          className="absolute inset-y-[-2px] w-px bg-[var(--text-secondary)]"
          style={{ left: `${Math.min(140, 100) * (100 / 140)}%` }}
        />
      </div>
      <div className="text-text-tertiary mt-1 flex justify-between text-[10px]">
        <span>Since {gdd.seasonStart} · corn, base 50°F</span>
        <span className="tnum">normal {gdd.normal.toLocaleString()}</span>
      </div>

      {/* plain-language, always visible */}
      <p className="text-text-secondary mt-3 text-xs leading-relaxed">
        Heat units the crop has banked since {gdd.seasonStart}. Corn needs about{" "}
        <span className="tnum text-foreground">
          {CORN_MATURITY.toLocaleString()}
        </span>{" "}
        to reach maturity — roughly{" "}
        <span className="tnum text-foreground">
          {Math.round((gdd.accumulated / CORN_MATURITY) * 100)}%
        </span>{" "}
        of the way.
      </p>

      <Explainer>
        Crops develop on accumulated heat, not the calendar. Each day adds GDD =
        the day&apos;s average temperature minus 50°F, using the corn method that
        caps highs at 86°F and floors lows at 50°F (corn barely grows outside
        that range). Rough milestones: emergence ~100–120 GDD, knee-high ~600,
        tasseling ~1,200–1,400, and black-layer (physiological maturity) near{" "}
        {CORN_MATURITY.toLocaleString()}. &quot;Ahead&quot; or &quot;behind&quot;
        compares this year&apos;s pace to the 1991–2020 normal for the same dates.
      </Explainer>
    </Card>
  );
}
