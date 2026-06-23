import { Card } from "@/components/ui/card";

import { PriceChart, type ChartPoint } from "./price-chart";

export function ChartCard({
  cropLabel,
  points,
  sampleData,
}: {
  cropLabel: string;
  points: ChartPoint[];
  sampleData: boolean;
}) {
  return (
    <Card className="p-5 md:col-span-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Futures Price · {cropLabel}
        </span>
        {sampleData && (
          <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
            SAMPLE
          </span>
        )}
      </div>
      <PriceChart points={points} />
    </Card>
  );
}
