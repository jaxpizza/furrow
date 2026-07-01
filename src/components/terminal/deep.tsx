import { ArrowDownRight, ArrowUpRight, CalendarClock, ExternalLink, Minus } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import { SignalBadge } from "@/components/common/signal-badge";
import { cn } from "@/lib/utils";

import { CashBreakevenChart } from "./charts/cash-breakeven-chart";
import { PriceTerminalChart } from "./charts/price-terminal-chart";
import {
  BucketSection,
  ConditionsDetail,
  DemandDetail,
  MacroDetail,
  MoneyFlowDetail,
  SupplyDetail,
  TechnicalsDetail,
} from "./buckets";
import {
  BUCKET_LABEL,
  BUCKET_ORDER,
  bucketKey,
  CROP_LABEL,
  type BucketKey,
  type Lean,
} from "./lib";
import { PositionSummaryBar } from "./position-summary-bar";
import type { NextMover, TerminalData } from "./types";

const DIR_ICON = { up: ArrowUpRight, down: ArrowDownRight, neutral: Minus };
const DIR_CLS = {
  up: "text-[var(--pos)]",
  down: "text-[var(--neg)]",
  neutral: "text-text-tertiary",
};

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-bg-surface/50 rounded-xl border p-4 md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
        {hint && <span className="text-text-tertiary text-[11px]">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function FullRead({ data }: { data: TerminalData }) {
  const o = data.outlook;
  if (!o) {
    return (
      <Panel title="The read">
        <p className="text-text-secondary text-sm">
          Temporarily unavailable.{data.apiKeyMissing && " No model key configured."}
        </p>
      </Panel>
    );
  }
  return (
    <Panel
      title="The read"
      hint={o.seasonalContext?.line ? undefined : undefined}
    >
      <div className="flex flex-wrap items-center gap-3">
        <SignalBadge signal={o.signal} />
        {o.seasonalContext?.line && (
          <span className="text-text-tertiary text-[11px] leading-snug">{o.seasonalContext.line}</span>
        )}
      </div>

      <p className="text-foreground mt-3 text-sm leading-relaxed">{o.summary}</p>

      {o.dominantTension && (
        <div className="border-border/70 mt-3 space-y-1 border-y py-3 text-sm">
          <div className="flex gap-2">
            <span className="text-[var(--pos)] shrink-0 font-semibold">▲</span>
            <span className="text-text-secondary">{o.dominantTension.forceUp}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[var(--neg)] shrink-0 font-semibold">▼</span>
            <span className="text-text-secondary">{o.dominantTension.forceDown}</span>
          </div>
        </div>
      )}

      {/* factors — the drivers, each with a clickable source */}
      <ul className="mt-3 space-y-2.5">
        {o.factors.map((f, i) => {
          const Icon = DIR_ICON[f.direction];
          return (
            <li key={i} className="flex gap-2.5 text-sm">
              <Icon className={cn("mt-0.5 size-4 shrink-0", DIR_CLS[f.direction])} strokeWidth={2.5} />
              <div className="min-w-0">
                <span className="text-foreground leading-relaxed">{f.text}</span>{" "}
                {f.source &&
                  (f.source.url ? (
                    <a
                      href={f.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-tertiary hover:text-[var(--accent)] inline-flex items-center gap-0.5 text-[11px] whitespace-nowrap transition-colors"
                    >
                      {f.source.label}
                      <ExternalLink className="size-2.5" />
                    </a>
                  ) : (
                    <span className="text-text-tertiary text-[11px]">{f.source.label}</span>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>

      {o.watchItems.length > 0 && (
        <div className="border-border/70 mt-3 border-t pt-3">
          <h3 className="text-text-tertiary mb-1.5 text-[11px] font-medium tracking-wide uppercase">
            Watch next
          </h3>
          <ul className="space-y-1">
            {o.watchItems.map((w, i) => (
              <li key={i} className="text-text-secondary flex gap-2 text-xs">
                <span className="text-[var(--accent)]">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Explainer label="How the read is weighted">
        Drivers (highlighted) are what is actively shaping the read right now; the rest are watched
        quietly so you can see they were considered, not overlooked.{" "}
        {o.seasonalContext?.line ? o.seasonalContext.line : ""}
      </Explainer>
    </Panel>
  );
}

function countdown(d: number): string {
  if (d <= 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

/** The next scheduled market-mover on the USDA calendar — a forward-looking
 *  closer so the farmer sees what's coming while they're deep in the read. */
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

/** DEEP — the full trading terminal. Information-rich but organized: the price
 *  chart with engine levels, the personal cash-vs-break-even chart, the full
 *  sourced read, and the six buckets each expandable into framed detail. */
export function Deep({ data }: { data: TerminalData }) {
  const { outlook, buckets, cash, nowMs } = data;

  const watchedByKey = new Map<BucketKey, { lean: Lean; isDriver: boolean; state: string }>();
  for (const w of outlook?.watchedContext ?? []) {
    watchedByKey.set(bucketKey(w.bucket), {
      lean: (w.lean as Lean) ?? "neutral",
      isDriver: w.isDriver,
      state: w.state,
    });
  }
  const lean = (k: BucketKey) => watchedByKey.get(k) ?? { lean: "neutral" as Lean, isDriver: false, state: "" };

  const detail = (k: BucketKey) => {
    switch (k) {
      case "supply":
        return <SupplyDetail bundles={buckets.supply} />;
      case "demand":
        return <DemandDetail bundles={buckets.demand} />;
      case "moneyflow":
        return <MoneyFlowDetail bundle={buckets.moneyflow} />;
      case "macro":
        return <MacroDetail bundles={buckets.macro} />;
      case "technicals":
        return <TechnicalsDetail tech={buckets.technicals} />;
      case "conditions":
        return <ConditionsDetail bundles={buckets.conditions} />;
    }
  };
  const freshAt = (k: BucketKey): string | number | null => {
    switch (k) {
      case "supply":
        return buckets.supplyFetched;
      case "demand":
        return buckets.demandFetched;
      case "moneyflow":
        return buckets.moneyflowFetched;
      case "macro":
        return buckets.macroFetched;
      case "technicals":
        return buckets.technicals?.asOf ?? null;
      case "conditions":
        return buckets.conditions[0]?.fetchedAt ?? null;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── PRICE CHART (centerpiece) ────────────────────────────── */}
      <Panel
        title={`${CROP_LABEL[data.crop]} — price & engine levels`}
        hint={data.priceSample ? "sample price feed" : "daily close · live"}
      >
        <PriceTerminalChart points={data.pricePoints} tech={buckets.technicals} />
        <p className="text-text-tertiary mt-2 text-[11px] leading-relaxed">
          Daily close with the engine&apos;s moving averages and recent support/resistance overlaid. OHLC
          candlesticks + volume arrive when an intraday feed is captured — the current feed is daily close only.
        </p>
      </Panel>

      {/* ── CASH vs BREAK-EVEN (personal) ────────────────────────── */}
      <Panel title="Your cash vs break-even" hint="every profitable selling window">
        <CashBreakevenChart
          points={data.pricePoints}
          basisCents={cash?.basisCents ?? null}
          breakeven={data.breakeven.effective}
          profitTarget={data.breakeven.profitTargetPrice}
        />
      </Panel>

      {/* ── POSITION SNAPSHOT — the hard numbers behind the chart ── */}
      <PositionSummaryBar data={data} />

      {/* ── FULL READ ────────────────────────────────────────────── */}
      <FullRead data={data} />

      {/* ── SIX BUCKETS ──────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-text-tertiary px-1 text-[11px] font-medium tracking-wide uppercase">
          The six buckets
        </h2>
        {BUCKET_ORDER.map((k) => {
          const l = lean(k);
          return (
            <BucketSection
              key={k}
              bucket={k}
              label={BUCKET_LABEL[k]}
              lean={l.lean}
              isDriver={l.isDriver}
              state={l.state}
              freshAt={freshAt(k)}
              nowMs={nowMs}
              sample={k === "technicals" ? buckets.technicals?.basedOnSample : undefined}
            >
              {detail(k)}
            </BucketSection>
          );
        })}
      </section>

      {/* ── NEXT MARKET-MOVER ────────────────────────────────────── */}
      <NextMoverStrip mover={data.nextMover} />
    </div>
  );
}
