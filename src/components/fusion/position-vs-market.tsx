import Link from "next/link";
import { CircleCheck, CircleDot, Sprout, TrendingDown, TrendingUp, UserCheck } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import { BreakevenVsCash } from "@/components/markets/breakeven-vs-cash";
import { Card } from "@/components/ui/card";
import type { Signal } from "@/lib/outlook/synthesis";
import type { PositionFusion } from "@/lib/fusion/position-fusion";
import { cn } from "@/lib/utils";

const fmtBu = (n: number) => Math.round(n).toLocaleString();

// A directive-FREE signal chip for the personal panel. The generic read badge
// (SignalBadge) labels mixed as "Mixed / Hold" — fine as a market lean, but next
// to his position "Hold" reads as advice, so here we show only the neutral state.
const SIGNAL_CFG: Record<Signal, { word: string; Icon: typeof TrendingUp; cls: string }> = {
  favorable: { word: "Favorable", Icon: TrendingUp, cls: "text-[var(--pos)] bg-[var(--pos)]/12 border-[var(--pos)]/25" },
  mixed: { word: "Mixed", Icon: CircleDot, cls: "text-[var(--neutral)] bg-[var(--neutral)]/12 border-[var(--neutral)]/25" },
  unfavorable: { word: "Unfavorable", Icon: TrendingDown, cls: "text-[var(--neg)] bg-[var(--neg)]/12 border-[var(--neg)]/25" },
};

function SignalChip({ signal, className }: { signal: Signal; className?: string }) {
  const c = SIGNAL_CFG[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        c.cls,
        className,
      )}
    >
      <c.Icon className="size-3.5" strokeWidth={2.5} />
      {c.word}
    </span>
  );
}

/**
 * "Your position vs the market" — the dedicated fusion panel. It places his real
 * numbers (cash vs break-even, exposure) right beside a brief echo of the shared
 * market read, joined by a neutral situation line. Everything here is fact +
 * relevance; nothing tells him what to do. The decision stays his.
 */
export function PositionVsMarket({ fusion }: { fusion: PositionFusion }) {
  const f = fusion;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCheck className="size-4 text-[var(--accent)]" />
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
            Your position vs the market · {f.cropLabel}
          </span>
        </div>
        {f.signal && <SignalChip signal={f.signal} />}
      </div>

      {/* The factual tie-together — leads the panel when he has a position,
          never a directive. */}
      {f.hasPosition && (
        <>
          <p className="text-foreground mt-4 text-[15px] leading-relaxed">{f.situationLine}</p>
          {f.profitableNote && (
            <div className="mt-2 flex items-start gap-1.5">
              <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--pos)]" />
              <p className="text-text-secondary text-xs leading-relaxed">{f.profitableNote}</p>
            </div>
          )}
        </>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* HIS NUMBERS */}
        <div className="space-y-3">
          <Label>Your numbers</Label>
          {f.hasCash ? (
            <BreakevenVsCash breakeven={f.breakeven} profitTargetPrice={null} cashPrice={f.cashPrice as number} />
          ) : (
            <Dashed>Cash price unavailable right now.</Dashed>
          )}
          {f.hasPosition ? <Exposure f={f} /> : <EmptyPosition cropLabel={f.cropLabel} />}
        </div>

        {/* THE MARKET */}
        <div className="space-y-3">
          <Label>The market read</Label>
          {f.signal ? (
            <div className="border-border/70 bg-bg-elevated/40 rounded-md border px-4 py-3">
              <SignalChip signal={f.signal} />
              {f.tensionLine && (
                <p className="text-text-secondary mt-2 text-xs leading-relaxed">{f.tensionLine}</p>
              )}
              {f.relevanceLine && (
                <p className="text-text-tertiary border-border/60 mt-2 border-t pt-2 text-[11px] leading-relaxed">
                  <span className="text-[var(--accent)] font-medium">For your position: </span>
                  {f.relevanceLine}
                </p>
              )}
            </div>
          ) : (
            <Dashed>The market read isn&apos;t available right now.</Dashed>
          )}
        </div>
      </div>

      <Disclaimer />

      <Explainer label="What is this?">
        This ties your own numbers — cash vs. your break-even and how much you still have to price — to the
        current market read, so you can see them in one place. It states the facts and how they relate;{" "}
        <span className="text-foreground">it never tells you to buy, sell, hold, or wait</span>, and it never
        predicts where the price goes. That call is yours.
      </Explainer>
    </Card>
  );
}

function Exposure({ f }: { f: PositionFusion }) {
  return (
    <div className="border-border/70 bg-bg-elevated/40 rounded-md border px-4 py-3">
      <div className="text-foreground text-sm font-medium">{f.exposureLine}</div>
      {(f.ownedRemaining > 0 || f.commercialRemaining > 0) && (
        <div className="text-text-tertiary mt-1 text-[11px]">
          {f.ownedRemaining > 0 && <span className="tnum">{fmtBu(f.ownedRemaining)} bu on-farm</span>}
          {f.ownedRemaining > 0 && f.commercialRemaining > 0 && <span> · </span>}
          {f.commercialRemaining > 0 && (
            <span className="tnum text-[var(--neg)]">{fmtBu(f.commercialRemaining)} bu commercial</span>
          )}
        </div>
      )}
      {f.commercialNote && (
        <p className="text-text-secondary mt-1.5 text-[11px] leading-relaxed">{f.commercialNote}</p>
      )}
    </div>
  );
}

function EmptyPosition({ cropLabel }: { cropLabel: string }) {
  return (
    <div className="border-border/70 flex items-start gap-2 rounded-md border border-dashed bg-bg-elevated/30 px-4 py-3">
      <Sprout className="text-text-tertiary mt-0.5 size-4 shrink-0" />
      <p className="text-text-secondary text-xs leading-relaxed">
        No {cropLabel.toLowerCase()} harvest or sales logged yet. Add them in{" "}
        <Link href="/inputs" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Inputs
        </Link>{" "}
        to see what&apos;s still unsold and how your exposure lines up with the read.
      </p>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="border-border/70 bg-bg-elevated/40 mt-3 rounded-md border px-3 py-2">
      <p className="text-text-tertiary text-[11px] leading-relaxed">
        Your numbers and the market situation — informational, not financial advice. You decide.
      </p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">{children}</div>
  );
}

function Dashed({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border/70 text-text-secondary rounded-md border border-dashed bg-bg-elevated/30 px-4 py-3 text-sm">
      {children}
    </div>
  );
}

/**
 * Compact dashboard version — per-crop, one situation line each. Same facts, no
 * directive. Sits under the holdings summary so his position and the read meet
 * at a glance.
 */
export function PositionVsMarketCompact({ items }: { items: PositionFusion[] }) {
  const withPos = items.filter((f) => f.hasPosition);
  if (withPos.length === 0) {
    return (
      <Card className="p-5">
        <Header />
        <p className="text-text-secondary mt-3 text-sm leading-relaxed">
          Log your harvest and sales in{" "}
          <Link href="/inputs" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Inputs
          </Link>{" "}
          to see how your position lines up with the market read.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <Header />
      <ul className="divide-border/50 mt-2 divide-y">
        {withPos.map((f) => (
          <li key={f.crop} className="py-3">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium">{f.cropLabel}</span>
              {f.signal && <SignalChip signal={f.signal} className="px-1.5 py-0.5 text-[10px]" />}
            </div>
            <p className="text-text-secondary mt-1 text-xs leading-relaxed">
              {f.situationLine}
              {f.relevanceLine && <span className="text-text-tertiary"> {f.relevanceLine}</span>}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-text-tertiary mt-3 text-[11px] leading-relaxed">
        Informational, not financial advice. You decide.
      </p>
    </Card>
  );

  function Header() {
    return (
      <div className="flex items-center gap-2">
        <UserCheck className="size-4 text-[var(--accent)]" />
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Your position vs the market
        </span>
      </div>
    );
  }
}
