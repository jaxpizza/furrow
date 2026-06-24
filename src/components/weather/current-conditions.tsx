import { Droplets, Wind } from "lucide-react";

import { Card } from "@/components/ui/card";
import { weatherInfo } from "@/lib/weather/weather-codes";
import type { CurrentConditions as Current } from "@/lib/weather/types";

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function compass(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8];
}

export function CurrentConditionsCard({ current }: { current: Current | null }) {
  if (!current) {
    return (
      <Card className="p-5 md:col-span-2">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Current Conditions
        </span>
        <p className="text-text-secondary mt-3 text-sm">
          No live conditions for this field right now.
        </p>
      </Card>
    );
  }

  const { label, Icon } = weatherInfo(current.weatherCode);

  return (
    <Card className="p-5 md:col-span-2">
      <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
        Current Conditions
      </span>
      <div className="mt-3 flex items-center gap-5">
        <Icon className="size-12 text-[var(--text-secondary)]" strokeWidth={1.5} />
        <div>
          <div className="flex items-baseline gap-2">
            <span className="tnum text-5xl font-semibold tracking-tight">
              {Math.round(current.tempF)}°
            </span>
            <span className="text-text-secondary text-sm">{label}</span>
          </div>
          <div className="text-text-secondary tnum mt-1 text-xs">
            Feels like {Math.round(current.feelsF)}°
          </div>
        </div>

        <div className="border-border/70 ml-auto grid grid-cols-2 gap-x-6 gap-y-2 border-l pl-5 text-sm">
          <Metric
            icon={<Wind className="size-3.5" />}
            label="Wind"
            value={`${Math.round(current.windMph)}`}
            unit={`mph ${compass(current.windDir)}`}
          />
          <Metric
            icon={<Droplets className="size-3.5" />}
            label="Humidity"
            value={`${Math.round(current.humidity)}`}
            unit="%"
          />
          <Metric
            label="Precip now"
            value={current.precipIn.toFixed(2)}
            unit="in"
          />
          <Metric
            label="Dewpoint feel"
            value={`${Math.round(current.feelsF)}`}
            unit="°F"
          />
        </div>
      </div>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  unit,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <div className="text-text-tertiary flex items-center gap-1 text-[11px]">
        {icon}
        {label}
      </div>
      <div className="tnum text-foreground">
        {value}
        {unit && <span className="text-text-tertiary ml-0.5 text-xs">{unit}</span>}
      </div>
    </div>
  );
}
