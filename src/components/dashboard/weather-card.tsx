import { Cloud, Droplets, Sprout, Wind } from "lucide-react";

import { Card } from "@/components/ui/card";
import { MOCK_WEATHER } from "@/lib/mock-data";

export function WeatherCard() {
  const w = MOCK_WEATHER;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Weather
        </span>
        <span className="text-text-tertiary text-[11px]">{w.location}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Cloud
          className="size-9 text-[var(--text-secondary)]"
          strokeWidth={1.5}
        />
        <div>
          <div className="tnum text-3xl font-semibold">{w.tempF}°</div>
          <div className="text-text-secondary text-xs">{w.condition}</div>
        </div>
        <div className="tnum text-text-secondary ml-auto text-right text-xs">
          <div>
            H <span className="text-foreground">{w.highF}°</span>
          </div>
          <div>
            L <span className="text-foreground">{w.lowF}°</span>
          </div>
        </div>
      </div>

      <div className="border-border/80 mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-xs">
        <WeatherStat
          icon={Droplets}
          label="Precip"
          value={`${w.precipChance}%`}
        />
        <WeatherStat
          icon={Wind}
          label="Wind"
          value={`${w.windMph}`}
          unit="mph"
        />
        <WeatherStat icon={Sprout} label="GDD" value={`${w.gddToday}`} />
      </div>
    </Card>
  );
}

function WeatherStat({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-text-tertiary flex items-center gap-1">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="tnum text-foreground">
        {value}
        {unit && <span className="text-text-tertiary ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}
