"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  BaselineSeries,
  ColorType,
  CrosshairMode,
  createChart,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import { cn } from "@/lib/utils";

import type { ChartPoint } from "../types";

type Range = "3M" | "6M" | "1Y";
const RANGE_DAYS: Record<Range, number> = { "3M": 93, "6M": 186, "1Y": 372 };
const RANGES: Range[] = ["3M", "6M", "1Y"];

const ts = (t: string) => (new Date(t).getTime() / 1000) as UTCTimestamp;

/** Cash (futures + the farmer's basis) over time with THEIR break-even as the
 *  baseline — above it is mint (a window to sell at a profit), below is coral.
 *  The most personal chart in the product. */
export function CashBreakevenChart({
  points,
  basisCents,
  breakeven,
  profitTarget,
  height = 300,
}: {
  points: ChartPoint[];
  basisCents: number | null;
  breakeven: number | null;
  profitTarget: number | null;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Baseline"> | ISeriesApi<"Area"> | null>(null);
  const [range, setRange] = useState<Range>("1Y");
  const [hover, setHover] = useState<{ value: number; time: string } | null>(null);

  const basis = (basisCents ?? 0) / 100;

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9BA29E",
        fontFamily: "var(--font-geist-mono), monospace",
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "#5E6663", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#1A1E1C" },
        horzLine: { color: "#5E6663", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#1A1E1C" },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series =
      breakeven != null
        ? chart.addSeries(BaselineSeries, {
            baseValue: { type: "price", price: breakeven },
            topLineColor: "#5BBF8A",
            topFillColor1: "rgba(91,191,138,0.28)",
            topFillColor2: "rgba(91,191,138,0.02)",
            bottomLineColor: "#E5705B",
            bottomFillColor1: "rgba(229,112,91,0.02)",
            bottomFillColor2: "rgba(229,112,91,0.28)",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: { type: "price", precision: 2, minMove: 0.01 },
          })
        : chart.addSeries(AreaSeries, {
            lineColor: "#EFB23E",
            topColor: "rgba(239,178,62,0.20)",
            bottomColor: "rgba(239,178,62,0.00)",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: { type: "price", precision: 2, minMove: 0.01 },
          });

    if (breakeven != null) {
      series.createPriceLine({
        price: breakeven,
        color: "#EFB23E",
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "Break-even",
      });
    }
    if (profitTarget != null) {
      series.createPriceLine({
        price: profitTarget,
        color: "#5BBF8A",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Target",
      });
    }

    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData.get(series) as { value?: number } | undefined;
      if (!param.time || d?.value == null) return setHover(null);
      setHover({ value: d.value, time: new Date((param.time as number) * 1000).toISOString().slice(0, 10) });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // breakeven/profitTarget chosen at init; changes are rare (re-mount on nav)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    series.setData(
      points
        .filter((p) => new Date(p.time).getTime() >= cutoff)
        .map((p) => ({ time: ts(p.time), value: Math.round((p.value + basis) * 100) / 100 })),
    );
    chart.timeScale().fitContent();
  }, [points, range, basis]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="h-5">
          {hover && (
            <span className="text-xs">
              <span className="text-text-tertiary tnum">{hover.time}</span>{" "}
              <span className="tnum text-foreground font-semibold">${hover.value.toFixed(2)} cash</span>
            </span>
          )}
        </div>
        <div className="border-border bg-bg-elevated/60 flex items-center gap-0.5 rounded-md border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "tnum rounded px-2 py-0.5 text-xs font-medium transition-colors",
                range === r ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-text-tertiary hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} style={{ height }} className="w-full" />
      {breakeven != null ? (
        <p className="text-text-tertiary text-[11px] leading-relaxed">
          <span className="text-[var(--pos)]">Mint</span> = cash above your break-even of $
          {breakeven.toFixed(2)} (a window to sell at a profit); <span className="text-[var(--neg)]">coral</span> = below.
          Historical cash applies your <span className="tnum">current</span> basis ({basisCents ?? 0}¢) across the
          series — basis history isn&apos;t stored, so older points are approximate.
        </p>
      ) : (
        <p className="text-text-tertiary text-[11px]">
          Set your break-even on the Markets page to see every profitable selling window shaded here.
        </p>
      )}
    </div>
  );
}
