"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RainPoint } from "@/lib/weather/types";

const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MONTHS = "JFMAMJJASOND";
function ordToMonth(ord: number): string {
  let m = 0;
  for (let i = 0; i < 12; i++) if (ord >= MONTH_STARTS[i]) m = i;
  return MONTHS[m];
}

function RainTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
}) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p) => p.dataKey === "actual")?.value;
  const normal = payload.find((p) => p.dataKey === "normal")?.value;
  return (
    <div className="border-border bg-popover rounded-md border px-2.5 py-1.5 shadow-xs">
      <div className="tnum text-foreground text-xs">
        This year:{" "}
        <span className="font-semibold">{actual?.toFixed(1) ?? "—"}″</span>
      </div>
      <div className="tnum text-text-secondary text-xs">
        Normal: {normal?.toFixed(1)}″
      </div>
    </div>
  );
}

export function RainChart({ series }: { series: RainPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <ComposedChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="rain-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--furrow-border)" />
        <XAxis
          dataKey="ord"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          tickFormatter={ordToMonth}
          ticks={MONTH_STARTS}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          tickFormatter={(v: number) => `${v}″`}
        />
        <Tooltip
          content={<RainTooltip />}
          cursor={{ stroke: "var(--text-secondary)", strokeDasharray: "3 3" }}
        />
        <Line
          type="monotone"
          dataKey="normal"
          stroke="var(--text-secondary)"
          strokeWidth={1.25}
          strokeDasharray="4 3"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="actual"
          stroke="var(--accent)"
          strokeWidth={1.75}
          fill="url(#rain-fill)"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
