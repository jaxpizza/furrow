import Link from "next/link";
import { ArrowUpRight, Droplets, Tractor, TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { weatherInfo } from "@/lib/weather/weather-codes";
import type { WeatherDashboard } from "@/lib/weather/types";

/** Compact real-weather pulse for the farm's fields — current conditions,
 *  rainfall vs normal, the next fieldwork window. Links into /weather. */
export function WeatherSnapshot({
  weather,
  nowMs,
}: {
  weather: WeatherDashboard | null;
  nowMs: number;
}) {
  void nowMs;
  if (!weather || (!weather.current && !weather.rainfall)) {
    return (
      <Card className="flex h-full flex-col gap-2 p-4">
        <Header location={weather?.location.label ?? "your fields"} degraded />
        <p className="text-text-secondary text-sm">Weather is temporarily unavailable.</p>
      </Card>
    );
  }

  const { current, rainfall, fieldwork, stress } = weather;
  const info = current ? weatherInfo(current.weatherCode) : null;

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <Header location={weather.location.label} degraded={weather.degraded} />

      {current && info && (
        <div className="flex items-center gap-3">
          <info.Icon className="size-9 text-[var(--text-secondary)]" strokeWidth={1.5} />
          <div>
            <div className="tnum text-3xl font-semibold">{Math.round(current.tempF)}°</div>
            <div className="text-text-secondary text-xs">{info.label}</div>
          </div>
          <div className="text-text-tertiary tnum ml-auto text-right text-xs">
            <div>
              feels <span className="text-foreground">{Math.round(current.feelsF)}°</span>
            </div>
            <div>
              wind <span className="text-foreground">{Math.round(current.windMph)}</span> mph
            </div>
          </div>
        </div>
      )}

      {rainfall && (
        <div className="border-border/80 flex items-start gap-2 border-t pt-3 text-sm">
          <Droplets className="mt-0.5 size-4 shrink-0 text-[var(--text-secondary)]" />
          <div>
            <div className="text-foreground">{rainfall.headline}</div>
            <div className="text-text-tertiary tnum text-[11px]">
              {rainfall.ytdIn.toFixed(1)}″ YTD vs {rainfall.normalIn.toFixed(1)}″ normal · {rainfall.past14In.toFixed(1)}″ last 14d
            </div>
          </div>
        </div>
      )}

      {fieldwork && (
        <div className="flex items-center gap-2 text-sm">
          <Tractor className="size-4 shrink-0 text-[var(--pos)]" />
          <span className="text-text-secondary">
            Next fieldwork:{" "}
            <span className="text-foreground font-medium">
              {fieldwork.startsToday ? `${fieldwork.label} starting today` : fieldwork.label}
            </span>
          </span>
        </div>
      )}

      {stress.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-[var(--neutral)]" />
          <span className="text-text-secondary">{stress[0].text}</span>
        </div>
      )}

      <Link
        href="/weather"
        className="text-text-tertiary hover:text-[var(--accent)] mt-auto inline-flex items-center gap-1 self-end text-[11px] transition-colors"
      >
        Full weather
        <ArrowUpRight className="size-3" />
      </Link>
    </Card>
  );
}

function Header({ location, degraded }: { location: string; degraded?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">Weather</span>
      <span className="text-text-tertiary flex items-center gap-1.5 text-[11px]">
        {degraded && <span className="text-[var(--neutral)]">cached</span>}
        {location}
      </span>
    </div>
  );
}
