import { CloudRain, Flame, ShieldCheck, Snowflake } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { StressFlag } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

const ICON = { heat: Flame, freeze: Snowflake, heavy_rain: CloudRain };

export function StressFlagsCard({ stress }: { stress: StressFlag[] }) {
  return (
    <Card className="flex flex-col p-5">
      <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
        Stress Flags · 14-day
      </span>

      {stress.length === 0 ? (
        <div className="mt-3 flex items-center gap-2">
          <ShieldCheck className="size-4 text-[var(--pos)]" />
          <p className="text-text-secondary text-sm">
            No heat, frost, or heavy-rain flags in the forecast.
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {stress.map((f, i) => {
            const Icon = ICON[f.kind];
            const tone =
              f.severity === "alert"
                ? "text-[var(--neg)]"
                : "text-[var(--neutral)]";
            const bg =
              f.severity === "alert"
                ? "border-[var(--neg)]/25 bg-[var(--neg)]/10"
                : "border-[var(--neutral)]/25 bg-[var(--neutral)]/10";
            return (
              <li
                key={i}
                className={cn(
                  "flex min-w-[220px] flex-1 items-start gap-2.5 rounded-md border px-3 py-2",
                  bg,
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} />
                <div>
                  <p className="text-foreground text-sm leading-snug">{f.text}</p>
                  <span
                    className={cn("text-[10px] font-medium uppercase", tone)}
                  >
                    {f.severity}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
