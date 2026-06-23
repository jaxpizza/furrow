"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PricePoint = { label: string; value: number };

function FurrowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-popover rounded-md border px-2.5 py-1.5 shadow-xs">
      <div className="text-text-tertiary text-[10px] tracking-wide uppercase">
        {label}
      </div>
      <div className="tnum text-foreground text-sm font-semibold">
        ${payload[0].value.toFixed(2)}
      </div>
    </div>
  );
}

export function PriceChart({
  data,
  color = "var(--accent)",
  height = 200,
}: {
  data: PricePoint[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="furrow-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="var(--furrow-border)"
          strokeDasharray="0"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          minTickGap={28}
          dy={6}
        />
        <YAxis
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          domain={["dataMin - 0.2", "dataMax + 0.2"]}
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
        />
        <Tooltip
          content={<FurrowTooltip />}
          cursor={{
            stroke: "var(--text-secondary)",
            strokeWidth: 1,
            strokeDasharray: "3 3",
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.75}
          fill="url(#furrow-area)"
          dot={false}
          activeDot={{
            r: 3,
            fill: color,
            stroke: "var(--bg-base)",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
