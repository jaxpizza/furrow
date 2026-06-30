import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Delta } from "@/components/common/delta";
import { PriceTerminalChart } from "@/components/terminal/charts/price-terminal-chart";
import { freshnessLabel } from "@/components/terminal/lib";
import { Card } from "@/components/ui/card";

import type { CropPulse } from "./types";

/** A crop's price pulse: cash + day change, the real close-price chart with the
 *  engine's MA/support-resistance overlays (reused from the terminal, compact),
 *  and the futures/basis/break-even line. Taps through to the terminal. */
export function PricePulseCard({ pulse, nowMs }: { pulse: CropPulse; nowMs: number }) {
  const {
    crop,
    label,
    points,
    tech,
    priceSample,
    cashPrice,
    hasBasis,
    basisCents,
    futuresPrice,
    contractMonth,
    futuresStale,
    priceAsOf,
    delta,
    breakeven,
  } = pulse;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={`/terminal?crop=${crop}&mode=deep`}
            className="group text-text-tertiary hover:text-[var(--accent)] inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition-colors"
          >
            {label} · cash
            <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          <div className="flex items-baseline gap-2">
            <span className="tnum text-3xl font-semibold tracking-tight">
              {cashPrice != null ? `$${cashPrice.toFixed(2)}` : "—"}
            </span>
            {delta.pct !== 0 && (
              <Delta direction={delta.direction}>
                {delta.change >= 0 ? "+" : ""}
                {delta.change.toFixed(2)} ({delta.pct >= 0 ? "+" : ""}
                {delta.pct.toFixed(1)}%)
              </Delta>
            )}
          </div>
        </div>
        {priceSample && (
          <span className="rounded bg-[var(--neutral)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--neutral)]">
            SAMPLE
          </span>
        )}
      </div>

      {points.length > 1 ? (
        <PriceTerminalChart points={points} tech={tech} height={168} />
      ) : (
        <div className="border-border text-text-tertiary flex h-[168px] items-center justify-center rounded-md border border-dashed text-xs">
          Price history unavailable
        </div>
      )}

      <div className="border-border/80 grid grid-cols-3 gap-3 border-t pt-3">
        <Field label={`${contractMonth ?? "Front"} futures`} value={futuresPrice != null ? `$${futuresPrice.toFixed(2)}` : "—"} />
        <Field
          label="Basis"
          value={basisCents != null ? `${basisCents > 0 ? "+" : ""}${basisCents}¢` : "—"}
          dim={!hasBasis}
        />
        <Field label="Break-even" value={breakeven.effective != null ? `$${breakeven.effective.toFixed(2)}` : "not set"} dim={breakeven.effective == null} />
      </div>

      <div className="text-text-tertiary flex items-center justify-between text-[11px]">
        <span>
          {priceSample
            ? "sample price feed"
            : priceAsOf
              ? `futures updated ${freshnessLabel(priceAsOf, nowMs)}${futuresStale ? " · delayed" : ""}`
              : "—"}
        </span>
        <Link href={`/markets?crop=${crop}`} className="hover:text-foreground transition-colors">
          Markets →
        </Link>
      </div>
    </Card>
  );
}

function Field({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">{label}</div>
      <div className={dim ? "tnum text-text-tertiary text-sm" : "tnum text-foreground text-sm font-medium"}>{value}</div>
    </div>
  );
}
