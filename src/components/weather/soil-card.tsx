import { Sprout } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Delta } from "@/components/common/delta";
import type { SoilRead } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

import { Explainer } from "@/components/common/explainer";

export function SoilCard({ soil }: { soil: SoilRead | null }) {
  if (!soil) {
    return (
      <Card className="p-5">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Soil Temperature
        </span>
        <p className="text-text-secondary mt-3 text-sm">
          Soil temperature unavailable for this field.
        </p>
      </Card>
    );
  }

  const atWindow = soil.timing.state === "at_window" || soil.timing.state === "above";
  const tone = atWindow
    ? "text-[var(--pos)]"
    : soil.timing.state === "approaching"
      ? "text-[var(--neutral)]"
      : "text-text-secondary";

  return (
    <Card className="flex flex-col p-5">
      <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
        Soil Temperature
      </span>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="tnum text-4xl font-semibold">
          {Math.round(soil.tempF)}°
        </span>
        <Delta
          direction={
            soil.trend === "rising" ? "up" : soil.trend === "falling" ? "down" : "flat"
          }
        >
          {soil.trend}
        </Delta>
      </div>
      <div className="text-text-tertiary mt-1 text-[11px]">
        at {soil.depthLabel} · {soil.changeF >= 0 ? "+" : ""}
        {soil.changeF.toFixed(1)}° over 5 days
      </div>

      {/* threshold marker */}
      <div className="bg-bg-elevated mt-4 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full",
            atWindow ? "bg-[var(--pos)]" : "bg-[var(--neutral)]",
          )}
          style={{
            width: `${Math.max(4, Math.min(100, ((soil.tempF - 32) / (70 - 32)) * 100))}%`,
          }}
        />
      </div>
      <div className="text-text-tertiary mt-1 text-[10px]">
        Corn plant window ≈ 50°F
      </div>

      <div className="mt-3 flex items-start gap-2">
        <Sprout className={cn("mt-0.5 size-4 shrink-0", tone)} />
        <p className="text-text-secondary text-sm leading-snug">
          <span className={cn("font-medium", tone)}>{soil.timing.text}</span>{" "}
          Informational — not planting advice.
        </p>
      </div>

      <Explainer>
        Corn seed needs soil around 50°F to germinate evenly; planted into colder
        ground it sits, swells, and is exposed to disease and chilling injury.
        This reads the temperature ~2.4 in down (planting depth). &quot;Rising&quot;
        means the trend over the last 5 days is warming toward that window —
        many growers watch for soil at 50°F and a warm forecast ahead. It&apos;s
        context, not a signal to plant.
      </Explainer>
    </Card>
  );
}
