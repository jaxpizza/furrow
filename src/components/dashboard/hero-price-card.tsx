import { ContourField } from "@/components/brand/contour-field";
import { Delta } from "@/components/common/delta";
import { SignalBadge } from "@/components/common/signal-badge";
import { Stat } from "@/components/common/stat";
import { PriceChart } from "@/components/dashboard/price-chart";
import { Card } from "@/components/ui/card";
import { CORN_PRICE_SERIES } from "@/lib/mock-data";

export function HeroPriceCard() {
  const latest = CORN_PRICE_SERIES[CORN_PRICE_SERIES.length - 1].value;
  const prior = CORN_PRICE_SERIES[CORN_PRICE_SERIES.length - 2].value;
  const change = latest - prior;
  const pct = (change / prior) * 100;

  return (
    <Card className="relative overflow-hidden md:col-span-2">
      <ContourField className="text-[var(--accent)]" opacity={0.05} />
      <div className="relative flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
                Cash Price · Corn · Central IL
              </span>
              <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                SAMPLE
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="tnum text-4xl font-semibold tracking-tight">
                ${latest.toFixed(2)}
              </span>
              <Delta direction={change >= 0 ? "up" : "down"}>
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)} ({pct >= 0 ? "+" : ""}
                {pct.toFixed(1)}%)
              </Delta>
            </div>
          </div>
          <SignalBadge signal="favorable" />
        </div>

        <PriceChart data={CORN_PRICE_SERIES} height={210} />

        <div className="border-border/80 grid grid-cols-3 gap-4 border-t pt-4">
          <Stat label="Dec Futures" value="$4.86" size="sm" />
          <Stat label="Basis" value="−0.05" size="sm" />
          <Stat label="Breakeven" value="$4.12" size="sm" />
        </div>

        <p className="text-text-secondary text-sm leading-relaxed">
          <span className="text-foreground font-medium">Outlook —</span> Cash
          corn has firmed for three straight sessions on a stronger export pace.
          Basis is near seasonal norms. This panel will carry a live
          model-driven sell/hold read once market data is wired in.
        </p>
      </div>
    </Card>
  );
}
