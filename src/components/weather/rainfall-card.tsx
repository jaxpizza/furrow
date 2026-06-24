import { Card } from "@/components/ui/card";
import { Delta } from "@/components/common/delta";
import type { RainSeverity } from "@/lib/weather/calc";
import type { RainfallRead } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

import { RainChart } from "./rain-chart";

const SCALE: { key: RainSeverity; label: string }[] = [
  { key: "well_below", label: "Well below" },
  { key: "below", label: "Below" },
  { key: "near", label: "Near" },
  { key: "above", label: "Above" },
  { key: "well_above", label: "Well above" },
];

function segColor(key: RainSeverity, active: boolean): string {
  if (!active) return "bg-bg-elevated";
  if (key === "well_below" || key === "below") return "bg-[var(--neg)]";
  if (key === "near") return "bg-[var(--neutral)]";
  return "bg-[var(--pos)]";
}

export function RainfallCard({ rainfall }: { rainfall: RainfallRead | null }) {
  if (!rainfall) {
    return (
      <Card className="p-5 md:col-span-2">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Rainfall vs Normal
        </span>
        <p className="text-text-secondary mt-3 text-sm">
          Rainfall history is unavailable for this location right now.
        </p>
      </Card>
    );
  }

  const dry = rainfall.deltaIn < 0;

  return (
    <Card className="p-5 md:col-span-2">
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Rainfall vs Normal · Year-to-date
        </span>
        <span className="tnum text-text-tertiary text-[11px]">
          {Math.round(rainfall.percentile * 100)}th pctl · 1991–2020
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="tnum text-3xl font-semibold">
              {rainfall.ytdIn.toFixed(1)}
            </span>
            <span className="text-text-secondary text-xs">in this year</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Delta direction={dry ? "down" : "up"}>
              {dry ? "−" : "+"}
              {Math.abs(rainfall.deltaIn).toFixed(1)} in
            </Delta>
            <span className="text-text-secondary text-xs">
              vs {rainfall.normalIn.toFixed(1)} in normal
            </span>
          </div>
        </div>
      </div>

      {/* severity scale — position + label, not color alone */}
      <div className="mt-4">
        <div className="flex gap-1">
          {SCALE.map((s) => (
            <div key={s.key} className="flex-1">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  segColor(s.key, s.key === rainfall.severity),
                )}
              />
              <div
                className={cn(
                  "mt-1 text-center text-[9px]",
                  s.key === rainfall.severity
                    ? "text-foreground font-semibold"
                    : "text-text-tertiary",
                )}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-foreground mt-3 text-sm">
        <span className="font-medium">{rainfall.headline}.</span>
      </p>

      <div className="mt-2">
        <RainChart series={rainfall.series} />
      </div>
    </Card>
  );
}
