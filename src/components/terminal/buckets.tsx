import { ChevronDown, ExternalLink } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import type { CotBundle } from "@/lib/outlook/cot-types";
import type { DemandBundle } from "@/lib/outlook/demand-types";
import type { EconBundle } from "@/lib/outlook/econ-types";
import type { MacroBundle } from "@/lib/outlook/macro-types";
import type { ReportBundle } from "@/lib/outlook/types";
import type { TechnicalsBundle } from "@/lib/outlook/technicals-types";
import { cn } from "@/lib/utils";

import {
  bucketKey,
  fmtSigned,
  freshnessLabel,
  LEAN_META,
  type BucketKey,
  type Lean,
} from "./lib";

// ── shared scaffold ──────────────────────────────────────────────────────────

function FreshTag({ at, nowMs, sample }: { at: string | number | null; nowMs: number; sample?: boolean }) {
  const label = freshnessLabel(at, nowMs);
  return (
    <span className={cn("tnum text-[11px]", sample ? "text-[var(--neutral)]" : "text-text-tertiary")}>
      {sample ? "sample" : label === "—" ? "no data" : `updated ${label}`}
    </span>
  );
}

function SourceLink({ url, children }: { url: string | null; children: React.ReactNode }) {
  if (!url) return <span className="text-text-tertiary text-[11px]">{children}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-text-tertiary hover:text-[var(--accent)] inline-flex items-center gap-1 text-[11px] transition-colors"
    >
      {children}
      <ExternalLink className="size-2.5" />
    </a>
  );
}

export function BucketSection({
  bucket,
  label,
  lean,
  isDriver,
  state,
  freshAt,
  nowMs,
  sample,
  children,
}: {
  bucket: BucketKey;
  label: string;
  lean: Lean;
  isDriver: boolean;
  state: string | null;
  freshAt: string | number | null;
  nowMs: number;
  sample?: boolean;
  children: React.ReactNode;
}) {
  const meta = LEAN_META[lean];
  return (
    <details
      id={`bucket-${bucket}`}
      className={cn(
        "group rounded-lg border transition-colors",
        isDriver ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.04]" : "border-border bg-bg-surface/40",
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="text-foreground text-sm font-semibold">{label}</span>
          {isDriver && (
            <span className="text-[var(--accent)] text-[9px] font-semibold tracking-wider uppercase">driving</span>
          )}
          <span className={cn("text-xs font-medium", meta.cls)}>· {meta.label}</span>
        </div>
        <FreshTag at={freshAt} nowMs={nowMs} sample={sample} />
        <ChevronDown className="text-text-tertiary size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-border border-t px-4 py-4">
        {state && <p className="text-text-secondary mb-3 text-xs leading-relaxed">{state}</p>}
        {children}
      </div>
    </details>
  );
}

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="border-border/60 flex items-baseline justify-between gap-3 border-b py-1.5 last:border-0">
      <span className="text-text-secondary text-xs">{label}</span>
      <span className="text-right">
        <span className="tnum text-foreground text-sm font-medium">{value}</span>
        {sub && <span className="text-text-tertiary tnum ml-1.5 text-[11px]">{sub}</span>}
      </span>
    </div>
  );
}

// ── SUPPLY ───────────────────────────────────────────────────────────────────

const ECON_LABEL: Record<string, string> = {
  wasde: "WASDE balance sheet",
  grain_stocks: "Quarterly Grain Stocks",
  acreage: "Acreage",
  prospective_plantings: "Prospective Plantings",
};

export function SupplyDetail({ bundles }: { bundles: EconBundle[] }) {
  if (!bundles.length) return <Empty />;
  return (
    <div className="space-y-4">
      {bundles.map((b, i) => (
        <div key={i}>
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-text-secondary text-[11px] font-medium tracking-wide uppercase">
              {ECON_LABEL[b.reportType] ?? b.reportType} · {b.marketingYear}
            </h4>
            <SourceLink url={b.sourceUrl}>USDA</SourceLink>
          </div>
          {b.frames.map((f, j) => (
            <Row
              key={j}
              label={f.metric}
              value={f.value != null ? `${f.value.toLocaleString()}${f.unit === "$/bu" ? "" : ` ${f.unit}`}` : "—"}
              sub={
                <>
                  {f.deltaYear != null && `${fmtSigned(f.deltaYear)} yr`}
                  {f.stocksToUse != null && ` · s/u ${f.stocksToUse}%`}
                </>
              }
            />
          ))}
        </div>
      ))}
      <Explainer label="What's supply?">
        WASDE carryout, quarterly stocks, and acreage set how much grain is (or will be) available.
        Framed as change (vs last year, vs the prior estimate) and stocks-to-use — markets move on the
        surprise vs expectations and on whether the absolute level is tight or comfortable, not the raw number.
      </Explainer>
    </div>
  );
}

// ── DEMAND ───────────────────────────────────────────────────────────────────

const PACE_CLS: Record<string, string> = {
  ahead: "text-[var(--pos)]",
  behind: "text-[var(--neg)]",
  "on track": "text-[var(--neutral)]",
};

export function DemandDetail({ bundles }: { bundles: DemandBundle[] }) {
  if (!bundles.length) return <Empty />;
  return (
    <div className="space-y-4">
      {bundles.map((b, i) => (
        <div key={i}>
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-text-secondary text-[11px] font-medium tracking-wide uppercase">
              {b.dataType.replace(/_/g, " ")}
              {b.period ? ` · ${b.period}` : ""}
            </h4>
            <SourceLink url={b.sourceUrl}>USDA</SourceLink>
          </div>
          {b.frames.map((f, j) => (
            <div key={j} className="border-border/60 border-b py-1.5 last:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-text-secondary text-xs">{f.metric}</span>
                <span className="tnum text-foreground text-sm font-medium">
                  {f.value != null ? `${f.value.toLocaleString()} ${f.unit}` : "—"}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                {f.paceStatus && (
                  <span className={cn("font-medium", PACE_CLS[f.paceStatus] ?? "text-text-tertiary")}>
                    {f.paceStatus}
                  </span>
                )}
                {f.paceText && <span className="text-text-tertiary">{f.paceText}</span>}
                {f.pctChina != null && <span className="text-text-tertiary tnum">· China {f.pctChina}%</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
      <Explainer label="What's demand?">
        Export sales vs the pace needed to hit USDA&apos;s full-year target, the share going to China, and
        ethanol grind / soy crush vs target. Demand running ahead of pace is supportive; behind is pressuring.
      </Explainer>
    </div>
  );
}

// ── MONEY FLOW (COT) ─────────────────────────────────────────────────────────

export function MoneyFlowDetail({ bundle }: { bundle: CotBundle | null }) {
  if (!bundle) return <Empty />;
  const pct = Math.max(0, Math.min(100, bundle.percentile));
  return (
    <div className="space-y-3">
      <Row
        label="Managed-money net"
        value={`${bundle.net > 0 ? "+" : ""}${bundle.net.toLocaleString()}`}
        sub={bundle.positioning}
      />
      {/* historical percentile band */}
      <div>
        <div className="text-text-tertiary mb-1 flex justify-between text-[11px]">
          <span className="tnum">{bundle.histLow.toLocaleString()}</span>
          <span className={cn("font-medium", bundle.extreme ? "text-[var(--accent)]" : "text-text-secondary")}>
            {bundle.percentile}th percentile{bundle.extreme ? ` · ${bundle.extreme}` : ""}
          </span>
          <span className="tnum">{bundle.histHigh.toLocaleString()}</span>
        </div>
        <div className="bg-bg-elevated relative h-2 rounded-full">
          <div
            className={cn(
              "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg-base",
              bundle.extreme ? "bg-[var(--accent)]" : "bg-text-secondary",
            )}
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>
      <Row label="4-week trend" value={fmtSigned(bundle.trendNet4w)} sub={`${bundle.historyWeeks}wk history`} />
      <div className="flex justify-end">
        <SourceLink url={bundle.sourceUrl}>CFTC Commitment of Traders</SourceLink>
      </div>
      <Explainer label="What's money flow?">
        How speculators (managed money) are positioned, as a percentile of their own multi-year range. It is
        positioning, not a forecast — a crowded extreme can reverse, so it cuts both ways. Mid-range is a weak signal.
      </Explainer>
    </div>
  );
}

// ── MACRO ────────────────────────────────────────────────────────────────────

const MACRO_LABEL: Record<string, string> = {
  dollar: "US Dollar (DXY)",
  crude: "Crude oil",
  macro_weather: "Corn Belt weather",
};

export function MacroDetail({ bundles }: { bundles: MacroBundle[] }) {
  if (!bundles.length) return <Empty />;
  return (
    <div className="space-y-3">
      {bundles.map((b, i) =>
        b.frames.map((f, j) => (
          <div key={`${i}-${j}`} className="border-border/60 border-b pb-2.5 last:border-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-foreground text-xs font-medium">{f.label ?? MACRO_LABEL[b.signalType]}</span>
              <span className="tnum text-foreground text-sm font-medium">
                {f.value != null ? `${f.value.toLocaleString()}${f.unit ? ` ${f.unit}` : ""}` : "—"}
                {f.deltaPriorPct != null && (
                  <span
                    className={cn(
                      "ml-1.5 text-[11px]",
                      f.direction === "up" ? "text-[var(--pos)]" : f.direction === "down" ? "text-[var(--neg)]" : "text-text-tertiary",
                    )}
                  >
                    {fmtSigned(f.deltaPriorPct, 1)}%
                  </span>
                )}
              </span>
            </div>
            {f.chain && <p className="text-text-tertiary mt-0.5 text-[11px] leading-relaxed">{f.chain}</p>}
          </div>
        )),
      )}
      <div className="flex justify-end">
        <SourceLink url={bundles[0]?.sourceUrl ?? null}>Macro sources</SourceLink>
      </div>
      <Explainer label="What's macro?">
        Second-order forces — the dollar (a stronger dollar makes US grain pricier abroad), crude (ties to
        ethanol and input costs), and Corn Belt weather. Always shown, promoted to a driver only when materially moving the read.
      </Explainer>
    </div>
  );
}

// ── TECHNICALS ───────────────────────────────────────────────────────────────

export function TechnicalsDetail({ tech }: { tech: TechnicalsBundle | null }) {
  if (!tech) return <Empty />;
  const rangePct = Math.max(0, Math.min(100, tech.rangePercentile));
  return (
    <div className="space-y-3">
      <Row label="Trend" value={<span className="capitalize">{tech.trend}</span>} sub={tech.trendDetail} />
      {tech.movingAverages.map((m) => (
        <Row
          key={m.period}
          label={`Price vs MA${m.period}`}
          value={`$${m.value.toFixed(2)}`}
          sub={
            <span className={m.above ? "text-[var(--pos)]" : "text-[var(--neg)]"}>
              {m.above ? "above" : "below"} {fmtSigned(m.priceVsPct, 1)}%
            </span>
          }
        />
      ))}
      {tech.support && (
        <Row label="Support" value={`$${tech.support.value.toFixed(2)}`} sub={`${fmtSigned(tech.support.distancePct, 1)}% · ${tech.support.windowLabel}`} />
      )}
      {tech.resistance && (
        <Row label="Resistance" value={`$${tech.resistance.value.toFixed(2)}`} sub={`${fmtSigned(tech.resistance.distancePct, 1)}% · ${tech.resistance.windowLabel}`} />
      )}
      {tech.rsi != null && <Row label="RSI-14" value={tech.rsi.toFixed(0)} sub={tech.momentumLabel} />}
      {/* range percentile */}
      <div>
        <div className="text-text-tertiary mb-1 flex justify-between text-[11px]">
          <span className="tnum">52w low ${tech.low52.toFixed(2)}</span>
          <span>{tech.rangePercentile}th pctile of range</span>
          <span className="tnum">${tech.high52.toFixed(2)} high</span>
        </div>
        <div className="bg-bg-elevated relative h-2 rounded-full">
          <div
            className="border-bg-base absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--accent)]"
            style={{ left: `${rangePct}%` }}
          />
        </div>
      </div>
      <Explainer label="What's technicals?">
        Where price sits relative to its own history — moving averages, recent support/resistance, RSI momentum,
        and position in the 52-week range. Secondary to the fundamentals; useful for context and timing, labeled from real price data.
      </Explainer>
    </div>
  );
}

// ── WEATHER / CONDITIONS ─────────────────────────────────────────────────────

export function ConditionsDetail({ bundles }: { bundles: ReportBundle[] }) {
  if (!bundles.length) return <Empty />;
  const condition = bundles.filter((b) => b.reportType === "condition");
  const show = condition.length ? condition : bundles;
  return (
    <div className="space-y-4">
      {show.map((b, i) => (
        <div key={i}>
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-text-secondary text-[11px] font-medium tracking-wide uppercase">
              {b.reportType} · {b.geography} · {b.period}
            </h4>
            <SourceLink url={b.sourceUrl}>USDA NASS</SourceLink>
          </div>
          {b.points.slice(0, 6).map((p, j) => (
            <Row key={j} label={p.label || p.shortDesc} value={p.value != null ? `${p.value}${p.unit === "percent" ? "%" : ` ${p.unit}`}` : "—"} />
          ))}
        </div>
      ))}
      <Explainer label="What's weather / conditions?">
        Crop condition ratings (good/excellent), progress, and rainfall vs normal. Read as market sentiment about
        the developing crop, not a yield forecast — ratings swing through the season.
      </Explainer>
    </div>
  );
}

function Empty() {
  return <p className="text-text-tertiary text-xs">No data available for this bucket right now.</p>;
}

// ── glue: which detail for which key ─────────────────────────────────────────

export { bucketKey };
