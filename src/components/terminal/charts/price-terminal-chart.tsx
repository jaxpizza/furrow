"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import { cn } from "@/lib/utils";
import type { TechnicalsBundle } from "@/lib/outlook/technicals-types";

import type { ChartPoint } from "../types";

type Range = "1M" | "3M" | "6M" | "1Y";
const RANGE_DAYS: Record<Range, number> = { "1M": 31, "3M": 93, "6M": 186, "1Y": 372 };
const RANGES: Range[] = ["1M", "3M", "6M", "1Y"];

const AMBER = "#EFB23E";
const MA_COLOR: Record<number, string> = { 20: "#9BA29E", 50: "#C9A24B", 200: "#5E6663" };

const ts = (t: string) => (new Date(t).getTime() / 1000) as UTCTimestamp;

/** Simple moving average series computed over the FULL close series (so the MA
 *  at the left edge of a zoomed window still reflects prior bars). */
function sma(points: ChartPoint[], period: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    sum += points[i].value;
    if (i >= period) sum -= points[i - period].value;
    if (i >= period - 1) out.push({ time: ts(points[i].time), value: sum / period });
  }
  return out;
}

export function PriceTerminalChart({
  points,
  tech,
  height = 340,
}: {
  points: ChartPoint[];
  tech: TechnicalsBundle | null;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceRef = useRef<ISeriesApi<"Area"> | null>(null);
  const maRefs = useRef<ISeriesApi<"Line">[]>([]);
  const lineRefs = useRef<IPriceLine[]>([]);
  const [range, setRange] = useState<Range>("6M");
  const [showMA, setShowMA] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [hover, setHover] = useState<{ value: number; time: string } | null>(null);

  // init once
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
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
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
    const price = chart.addSeries(AreaSeries, {
      lineColor: AMBER,
      topColor: "rgba(239,178,62,0.20)",
      bottomColor: "rgba(239,178,62,0.00)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    maRefs.current = [20, 50, 200].map((p) =>
      chart.addSeries(LineSeries, {
        color: MA_COLOR[p],
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      }),
    );
    chartRef.current = chart;
    priceRef.current = price;

    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData.get(price) as { value?: number } | undefined;
      if (!param.time || d?.value == null) return setHover(null);
      setHover({ value: d.value, time: new Date((param.time as number) * 1000).toISOString().slice(0, 10) });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      priceRef.current = null;
      maRefs.current = [];
      lineRefs.current = [];
    };
  }, [height]);

  // data + range + MA visibility
  useEffect(() => {
    const price = priceRef.current;
    const chart = chartRef.current;
    if (!price || !chart) return;
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    const inRange = (t: UTCTimestamp) => (t as number) * 1000 >= cutoff;

    price.setData(
      points.filter((p) => new Date(p.time).getTime() >= cutoff).map((p) => ({ time: ts(p.time), value: p.value })),
    );
    [20, 50, 200].forEach((period, i) => {
      const s = maRefs.current[i];
      if (!s) return;
      s.setData(showMA ? sma(points, period).filter((d) => inRange(d.time)) : []);
    });
    chart.timeScale().fitContent();
  }, [points, range, showMA]);

  // support / resistance price lines
  useEffect(() => {
    const price = priceRef.current;
    if (!price) return;
    for (const l of lineRefs.current) price.removePriceLine(l);
    lineRefs.current = [];
    if (!showLevels || !tech) return;
    if (tech.resistance) {
      lineRefs.current.push(
        price.createPriceLine({
          price: tech.resistance.value,
          color: "#E5705B",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "Resistance",
        }),
      );
    }
    if (tech.support) {
      lineRefs.current.push(
        price.createPriceLine({
          price: tech.support.value,
          color: "#5BBF8A",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "Support",
        }),
      );
    }
  }, [tech, showLevels]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="h-5">
          {hover && (
            <span className="text-xs">
              <span className="text-text-tertiary tnum">{hover.time}</span>{" "}
              <span className="tnum text-foreground font-semibold">${hover.value.toFixed(2)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="border-border bg-bg-elevated/60 flex items-center gap-0.5 rounded-md border p-0.5">
            <ToggleChip on={showMA} set={setShowMA}>MA</ToggleChip>
            <ToggleChip on={showLevels} set={setShowLevels}>S/R</ToggleChip>
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
      </div>

      <div ref={containerRef} style={{ height }} className="w-full" />

      {/* legend — engine-computed levels */}
      <div className="text-text-tertiary flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <LegendDot color={AMBER} label="Price (daily close)" />
        {showMA && [20, 50, 200].map((p) => {
          const ma = tech?.movingAverages.find((m) => m.period === p);
          return <LegendDot key={p} color={MA_COLOR[p]} label={`MA${p}${ma ? ` $${ma.value.toFixed(2)}` : ""}`} />;
        })}
        {showLevels && tech?.support && <LegendDot color="#5BBF8A" label={`Support $${tech.support.value.toFixed(2)}`} dashed />}
        {showLevels && tech?.resistance && <LegendDot color="#E5705B" label={`Resistance $${tech.resistance.value.toFixed(2)}`} dashed />}
      </div>
    </div>
  );
}

function ToggleChip({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      onClick={() => set(!on)}
      className={cn(
        "rounded px-2 py-0.5 text-xs font-medium transition-colors",
        on ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-text-tertiary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-0 w-3 align-middle"
        style={{ borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}` }}
      />
      <span className="tnum">{label}</span>
    </span>
  );
}
