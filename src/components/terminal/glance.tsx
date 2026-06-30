import { CalendarClock } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import { SignalBadge } from "@/components/common/signal-badge";
import { PositionVsMarket } from "@/components/fusion/position-vs-market";
import { BreakevenVsCash } from "@/components/markets/breakeven-vs-cash";

import { SignalRow } from "./signal-row";
import type { NextMover, TerminalData } from "./types";

const LEANS_LABEL: Record<string, string> = {
  up: "Leans supportive",
  down: "Leans pressuring",
  balanced: "Balanced — no clear lean",
};

function countdown(d: number): string {
  if (d <= 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

function NextMoverStrip({ mover }: { mover: NextMover | null }) {
  return (
    <div className="border-border bg-bg-surface/40 flex items-center gap-3 rounded-lg border px-4 py-3">
      <CalendarClock className="text-[var(--accent)] size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Next market-mover
        </div>
        <div className="truncate text-sm">
          {mover ? mover.description : "No scheduled USDA report on the calendar."}
        </div>
      </div>
      {mover && (
        <span className="tnum text-[var(--accent)] shrink-0 text-sm font-semibold">
          {countdown(mover.daysUntil)}
        </span>
      )}
    </div>
  );
}

/** GLANCE — the calm 30-second read. The signal + plain summary lead; the
 *  farmer's own cash-vs-break-even sits right under it; the six engine signals
 *  read quietly beside. This is your dad's view. */
export function Glance({ data }: { data: TerminalData }) {
  const { outlook, cash, breakeven } = data;
  const cashPrice = cash?.cashPrice ?? cash?.futuresRef?.price ?? null;

  if (!outlook) {
    return (
      <div className="border-border text-text-secondary rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        The market read is temporarily unavailable.
        {data.apiKeyMissing && " (No model key configured.)"} Your cash and break-even still show below.
        {cashPrice != null && (
          <div className="mx-auto mt-4 max-w-md">
            <BreakevenVsCash
              breakeven={breakeven.effective}
              profitTargetPrice={breakeven.profitTargetPrice}
              cashPrice={cashPrice}
            />
          </div>
        )}
      </div>
    );
  }

  const tension = outlook.dominantTension;

  return (
    <div className="space-y-4">
      {/* ── THE READ ─────────────────────────────────────────────── */}
      <section className="border-border bg-bg-surface/50 rounded-xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <SignalBadge signal={outlook.signal} className="text-sm" />
          {outlook.seasonalContext?.line && (
            <span className="text-text-tertiary hidden max-w-xs text-right text-[11px] leading-snug sm:block">
              {outlook.seasonalContext.monthLabel ?? outlook.seasonalContext.season}
            </span>
          )}
        </div>

        <p className="text-foreground mt-4 text-[15px] leading-relaxed">{outlook.summary}</p>

        {tension && (
          <div className="border-border/70 mt-4 space-y-1.5 border-t pt-4">
            <div className="flex gap-2 text-sm">
              <span className="text-[var(--pos)] mt-0.5 shrink-0 font-semibold">▲</span>
              <span className="text-text-secondary">{tension.forceUp}</span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-[var(--neg)] mt-0.5 shrink-0 font-semibold">▼</span>
              <span className="text-text-secondary">{tension.forceDown}</span>
            </div>
            <div className="text-foreground pt-1 text-sm font-medium">
              {LEANS_LABEL[tension.leans] ?? "Mixed"}
              {tension.why && (
                <span className="text-text-tertiary font-normal"> — {tension.why}</span>
              )}
            </div>
          </div>
        )}

        <Explainer label="How to read this">
          The signal is a relative sell-or-hold lean from the current balance of supply,
          demand, money flow, macro, technicals, and weather — never a price prediction. ▲
          shows what is supporting price, ▼ what is pressuring it, and which is leading right now.
        </Explainer>
      </section>

      {/* ── YOUR POSITION VS THE MARKET ──────────────────────────── */}
      {data.fusion ? (
        <PositionVsMarket fusion={data.fusion} />
      ) : (
        <section className="space-y-2">
          <h2 className="text-text-tertiary px-1 text-[11px] font-medium tracking-wide uppercase">
            Your position
          </h2>
          {cashPrice != null ? (
            <BreakevenVsCash
              breakeven={breakeven.effective}
              profitTargetPrice={breakeven.profitTargetPrice}
              cashPrice={cashPrice}
            />
          ) : (
            <div className="border-border text-text-secondary rounded-md border border-dashed px-4 py-3 text-sm">
              Cash price unavailable right now.
            </div>
          )}
        </section>
      )}

      {/* ── THE SIX SIGNALS ──────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-text-tertiary px-1 text-[11px] font-medium tracking-wide uppercase">
          The six signals · tap to dig in
        </h2>
        <SignalRow watched={outlook.watchedContext ?? []} />
      </section>

      {/* ── NEXT MARKET-MOVER ────────────────────────────────────── */}
      <NextMoverStrip mover={data.nextMover} />
    </div>
  );
}
