import { Droplets, Wind } from "lucide-react";

import { Card } from "@/components/ui/card";
import { weatherInfo } from "@/lib/weather/weather-codes";
import type { CurrentConditions as Current } from "@/lib/weather/types";

import { RainRadar } from "./rain-radar";

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function compass(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8];
}

export function CurrentConditionsCard({
  current,
  lat,
  lon,
}: {
  current: Current | null;
  lat: number;
  lon: number;
}) {
  const info = current ? weatherInfo(current.weatherCode) : null;

  return (
    <Card className="p-5 md:col-span-3">
      <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
        Current Conditions
      </span>

      <div className="mt-3 flex flex-col gap-5 md:flex-row">
        {/* conditions + metrics */}
        <div className="md:w-[360px] md:shrink-0">
          {current && info ? (
            <>
              <div className="flex items-center gap-4">
                <info.Icon
                  className="size-12 text-[var(--text-secondary)]"
                  strokeWidth={1.5}
                />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="tnum text-5xl font-semibold tracking-tight">
                      {Math.round(current.tempF)}°
                    </span>
                    <span className="text-text-secondary text-sm">
                      {info.label}
                    </span>
                  </div>
                  <div className="text-text-secondary tnum mt-1 text-xs">
                    Feels like {Math.round(current.feelsF)}°
                  </div>
                </div>
              </div>

              <div className="border-border/70 mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 text-sm">
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
                  label="Feels like"
                  value={`${Math.round(current.feelsF)}`}
                  unit="°F"
                />
              </div>
            </>
          ) : (
            <p className="text-text-secondary text-sm">
              No live conditions for this field right now.
            </p>
          )}
        </div>

        {/* live rain radar — fills the panel */}
        <RainRadar lat={lat} lon={lon} />
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
        {unit && (
          <span className="text-text-tertiary ml-0.5 text-xs">{unit}</span>
        )}
      </div>
    </div>
  );
}
