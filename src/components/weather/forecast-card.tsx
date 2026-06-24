import { CalendarCheck, Droplets } from "lucide-react";

import { Card } from "@/components/ui/card";
import { weatherInfo } from "@/lib/weather/weather-codes";
import type {
  FieldworkWindow,
  ForecastDay,
  HourPoint,
} from "@/lib/weather/types";

export function ForecastCard({
  daily,
  hourly,
  fieldwork,
}: {
  daily: ForecastDay[];
  hourly: HourPoint[];
  fieldwork: FieldworkWindow;
}) {
  return (
    <Card className="p-5 md:col-span-3">
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          7-Day Forecast
        </span>
        {fieldwork && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--pos)]/25 bg-[var(--pos)]/12 px-2 py-1 text-xs font-medium text-[var(--pos)]">
            <CalendarCheck className="size-3.5" />
            {fieldwork.label} — good fieldwork window
          </span>
        )}
      </div>

      {/* 7-day */}
      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {daily.map((day, i) => {
          const { Icon, label } = weatherInfo(day.weatherCode);
          return (
            <div
              key={day.date}
              className="border-border/70 flex flex-col items-center gap-1 rounded-md border bg-bg-elevated/30 py-3"
              title={label}
            >
              <span className="text-text-secondary text-[11px] font-medium">
                {i === 0 ? "Today" : day.weekday}
              </span>
              <Icon
                className="my-0.5 size-6 text-[var(--text-secondary)]"
                strokeWidth={1.5}
              />
              <span className="tnum text-sm">
                <span className="text-foreground font-medium">
                  {Math.round(day.tmaxF)}°
                </span>{" "}
                <span className="text-text-tertiary">{Math.round(day.tminF)}°</span>
              </span>
              <span className="tnum flex items-center gap-0.5 text-[10px] text-[var(--pos)]">
                <Droplets className="size-2.5" />
                {day.precipProb}%
              </span>
              {day.precipIn >= 0.01 && (
                <span className="tnum text-text-tertiary text-[10px]">
                  {day.precipIn.toFixed(2)}″
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* hourly strip */}
      {hourly.length > 0 && (
        <>
          <div className="text-text-tertiary mt-5 mb-2 text-[11px] font-medium tracking-wide uppercase">
            Next 24 hours
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {hourly.map((hr) => {
              const { Icon } = weatherInfo(hr.weatherCode);
              return (
                <div
                  key={hr.iso}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <span className="text-text-tertiary text-[10px]">
                    {hr.hourLabel}
                  </span>
                  <Icon
                    className="size-4 text-[var(--text-secondary)]"
                    strokeWidth={1.5}
                  />
                  <span className="tnum text-foreground text-xs">
                    {Math.round(hr.tempF)}°
                  </span>
                  <span className="tnum text-[9px] text-[var(--pos)]">
                    {hr.precipProb}%
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
