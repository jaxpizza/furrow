"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import { cn } from "@/lib/utils";

export type ChartPoint = { time: string; value: number };
type Range = "1M" | "3M" | "6M" | "1Y";

const RANGE_DAYS: Record<Range, number> = {
  "1M": 31,
  "3M": 93,
  "6M": 186,
  "1Y": 372,
};
const RANGES: Range[] = ["1M", "3M", "6M", "1Y"];

const AMBER = "#EFB23E";

export function PriceChart({
  points,
  height = 300,
  support = null,
  resistance = null,
}: {
  points: ChartPoint[];
  height?: number;
  /** Optional key levels drawn as labeled dashed lines (simple-mode trend view). */
  support?: number | null;
  resistance?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);
  const [range, setRange] = useState<Range>("6M");
  const [hover, setHover] = useState<{ value: number; time: string } | null>(
    null,
  );

  // init chart once
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
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: "#5E6663",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1A1E1C",
        },
        horzLine: {
          color: "#5E6663",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1A1E1C",
        },
      },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: AMBER,
      topColor: "rgba(239,178,62,0.22)",
      bottomColor: "rgba(239,178,62,0.00)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData.get(series) as { value?: number } | undefined;
      if (!param.time || d?.value == null) {
        setHover(null);
        return;
      }
      const ts = (param.time as UTCTimestamp) * 1000;
      setHover({ value: d.value, time: new Date(ts).toISOString().slice(0, 10) });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  // update data on range / points change (Date.now() is fine inside an effect)
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    const sliced = points.filter((p) => new Date(p.time).getTime() >= cutoff);
    series.setData(
      sliced.map((p) => ({
        time: (new Date(p.time).getTime() / 1000) as UTCTimestamp,
        value: p.value,
      })),
    );
    chart.timeScale().fitContent();
  }, [points, range]);

  // Optional support/resistance — labeled dashed lines. Recreated when the levels
  // change (e.g. switching crop), so the markets page (no levels) is unaffected.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const l of linesRef.current) series.removePriceLine(l);
    linesRef.current = [];
    const line = (price: number, title: string, color: string) =>
      linesRef.current.push(
        series.createPriceLine({
          price,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title,
        }),
      );
    if (resistance != null) line(resistance, "Resistance", "#EFB23E");
    if (support != null) line(support, "Support", "#9BA29E");
    return () => {
      for (const l of linesRef.current) series.removePriceLine(l);
      linesRef.current = [];
    };
  }, [support, resistance]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-8">
          {hover && (
            <div className="text-xs">
              <span className="text-text-tertiary tnum">{hover.time}</span>{" "}
              <span className="tnum text-foreground font-semibold">
                ${hover.value.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <div className="border-border bg-bg-elevated/60 flex items-center gap-0.5 rounded-md border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "tnum rounded px-2 py-0.5 text-xs font-medium transition-colors",
                range === r
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-text-tertiary hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  );
}
