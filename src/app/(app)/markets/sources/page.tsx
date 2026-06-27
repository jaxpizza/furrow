import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  Database,
  ExternalLink,
  Layers,
  Newspaper,
  Ship,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { getSessionContext } from "@/lib/farm";
import { getDemandSnapshot } from "@/lib/outlook/demand-ingest";
import { DEMAND_LABEL, type DemandBundle, type DemandFrame } from "@/lib/outlook/demand-types";
import { getCotSnapshot } from "@/lib/outlook/cot-ingest";
import type { CotBundle } from "@/lib/outlook/cot-types";
import { getEconSnapshot } from "@/lib/outlook/econ-ingest";
import { REPORT_LABEL, type EconBundle, type EconFrame } from "@/lib/outlook/econ-types";
import { getSourcesSnapshot } from "@/lib/outlook/ingest";
import { NASS_ATTRIBUTION } from "@/lib/outlook/sources";
import type { Crop } from "@/lib/types/database";
import type { ReportBundle } from "@/lib/outlook/types";

export const metadata: Metadata = { title: "Outlook Sources (internal)" };

// Refresh-on-read can call out to USDA + 5 RSS feeds; give it room and never
// pre-render this scaffolding page.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REPORT_ORDER = ["condition", "progress", "yield", "production"];
const CROP_LABEL: Record<Crop, string> = { corn: "Corn", soybean: "Soybeans" };

export default async function OutlookSourcesPage() {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const [{ news, reports, newsFetchedAt, reportsFetchedAt }, econ, demandSnap, cotSnap] =
    await Promise.all([
      getSourcesSnapshot(),
      getEconSnapshot(),
      getDemandSnapshot(),
      getCotSnapshot(),
    ]);

  const supply = [...econ.bundles].sort(
    (a, b) => a.crop.localeCompare(b.crop) || a.reportType.localeCompare(b.reportType),
  );
  const demand = [...demandSnap.bundles].sort(
    (a, b) => a.crop.localeCompare(b.crop) || a.dataType.localeCompare(b.dataType),
  );
  const cot = [...cotSnap.bundles].sort((a, b) => a.crop.localeCompare(b.crop));

  const bundles = [...reports].sort(
    (a, b) =>
      a.crop.localeCompare(b.crop) ||
      REPORT_ORDER.indexOf(a.reportType) - REPORT_ORDER.indexOf(b.reportType) ||
      a.geography.localeCompare(b.geography),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Outlook Sources"
        subtitle="Stage 1 — the grounded data corpus the outlook will reason over. Internal scaffolding; not a finished feature."
      />

      <div className="mb-5 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/[0.06] px-4 py-2.5 text-xs text-text-secondary">
        <span className="font-medium text-[var(--accent)]">Internal</span> · live
        ingestion preview. USDA reports refresh daily, news a few times a day.
      </div>

      {/* ── Supply (Phase A: WASDE / Grain Stocks / Acreage) ──────────────── */}
      <section className="mb-8">
        <SectionHeader
          icon={<Layers className="size-4 text-[var(--accent)]" />}
          title="USDA Supply — WASDE, Grain Stocks, Acreage"
          meta={`${supply.length} reports · ${fmtAgo(econ.fetchedAt)}`}
        />
        {supply.length === 0 ? (
          <Empty>No supply data cached yet.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {supply.map((b) => (
              <SupplyCard key={`${b.reportType}-${b.crop}`} b={b} />
            ))}
          </div>
        )}
        <p className="text-text-tertiary mt-3 text-[11px] leading-relaxed">
          Every figure carries its reference frames (Δ month, Δ year, stocks-to-use),
          computed at ingestion. {NASS_ATTRIBUTION}
        </p>
      </section>

      {/* ── Report calendar ───────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader
          icon={<CalendarClock className="size-4 text-[var(--accent)]" />}
          title="Report Calendar — next market-movers"
          meta={`${econ.upcoming.length} upcoming`}
        />
        {econ.upcoming.length === 0 ? (
          <Empty>Calendar unavailable.</Empty>
        ) : (
          <Card className="divide-border/60 divide-y p-0">
            {econ.upcoming.map((e) => (
              <div
                key={`${e.reportType}-${e.releaseDate}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-sm">{e.description}</div>
                  <div className="text-text-tertiary tnum text-[11px]">
                    {e.releaseDate}
                  </div>
                </div>
                <span
                  className={cnCountdown(e.daysUntil)}
                >
                  {e.daysUntil === 0
                    ? "today"
                    : e.daysUntil === 1
                      ? "tomorrow"
                      : `in ${e.daysUntil}d`}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* ── Demand (Phase B: Export Sales / Ethanol / Crush) ──────────────── */}
      <section className="mb-8">
        <SectionHeader
          icon={<Ship className="size-4 text-[var(--accent)]" />}
          title="USDA Demand — Export Sales, Ethanol, Crush"
          meta={`${demand.length} sources · ${fmtAgo(demandSnap.fetchedAt)}`}
        />
        {demand.length === 0 ? (
          <Empty>
            No demand data cached yet — a source may be temporarily unavailable
            (FAS export-sales outages, or a missing key).
          </Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {demand.map((b) => (
              <DemandCard key={`${b.dataType}-${b.crop}`} b={b} />
            ))}
          </div>
        )}
        <p className="text-text-tertiary mt-3 text-[11px] leading-relaxed">
          Pace-vs-target is the headline frame (cumulative vs the WASDE annual
          target). A single weekly/monthly print is noisy — the pace and trend
          carry the signal.
        </p>
      </section>

      {/* ── Money Flow (Phase C: CFTC Commitment of Traders) ──────────────── */}
      <section className="mb-8">
        <SectionHeader
          icon={<TrendingUp className="size-4 text-[var(--accent)]" />}
          title="Money Flow — Fund Positioning (CFTC COT)"
          meta={`${cot.length} markets · ${fmtAgo(cotSnap.fetchedAt)}`}
        />
        {cot.length === 0 ? (
          <Empty>No COT data cached yet — the CFTC feed may be unavailable.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cot.map((b) => (
              <MoneyFlowCard key={b.crop} b={b} />
            ))}
          </div>
        )}
        <p className="text-text-tertiary mt-3 text-[11px] leading-relaxed">
          Managed-Money net position ranked against its own multi-year history —
          the percentile is the frame. Positioning, not prediction: an extreme
          (crowded) reading is a contrarian risk that cuts both ways; a mid-range
          reading is a weak signal.
        </p>
      </section>

      {/* ── USDA NASS ─────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader
          icon={<Database className="size-4 text-[var(--accent)]" />}
          title="USDA NASS Reports"
          meta={`${bundles.length} series · ${fmtAgo(reportsFetchedAt)}`}
        />

        {bundles.length === 0 ? (
          <Empty>No USDA data cached yet.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {bundles.map((b) => (
              <ReportCard key={`${b.reportType}-${b.crop}-${b.geography}`} b={b} />
            ))}
          </div>
        )}

        <p className="text-text-tertiary mt-3 text-[11px] leading-relaxed">
          {NASS_ATTRIBUTION}
        </p>
      </section>

      {/* ── Ag-news ───────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={<Newspaper className="size-4 text-[var(--accent)]" />}
          title="Ag-News Headlines"
          meta={`${news.length} items · ${fmtAgo(newsFetchedAt)}`}
        />

        {news.length === 0 ? (
          <Empty>No news cached yet.</Empty>
        ) : (
          <div className="space-y-2">
            {news.map((n) => (
              <Card key={n.link} className="p-3.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-foreground font-medium">{n.source}</span>
                  <span className="text-text-tertiary tnum">
                    {fmtDate(n.publishedAt)}
                  </span>
                  <div className="ml-auto flex gap-1">
                    {n.cropTags.map((t) => (
                      <span
                        key={t}
                        className="text-text-tertiary rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-[var(--accent)] mt-1.5 flex items-start gap-1 text-sm font-medium transition-colors"
                >
                  {n.title}
                  <ExternalLink className="mt-0.5 size-3 shrink-0 opacity-60" />
                </a>
                {n.summary && (
                  <p className="text-text-secondary mt-1 text-xs leading-relaxed">
                    {n.summary}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DemandCard({ b }: { b: DemandBundle }) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          {CROP_LABEL[b.crop]} · {DEMAND_LABEL[b.dataType]}
          {b.period ? ` · ${b.period}` : ""}
        </span>
        {b.sourceUrl && (
          <a
            href={b.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-tertiary hover:text-[var(--accent)] shrink-0"
            title="Source"
          >
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <ul className="mt-2.5 space-y-2">
        {b.frames.map((f, i) => (
          <DemandFrameRow key={i} f={f} />
        ))}
      </ul>
    </Card>
  );
}

function DemandFrameRow({ f }: { f: DemandFrame }) {
  return (
    <li className="border-border/40 border-b pb-1.5 last:border-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-text-secondary">{f.metric}</span>
        <span className="flex items-baseline gap-1">
          <span className="tnum text-foreground font-medium">
            {f.value != null ? fmtValue(f.value) : "—"}
          </span>
          <span className="text-text-tertiary text-[10px]">{f.unit}</span>
        </span>
      </div>
      {f.paceStatus && f.paceText && (
        <div className="mt-1 flex items-start gap-1 text-[10px]">
          <span
            className={
              f.paceStatus === "ahead"
                ? "tnum shrink-0 rounded bg-[var(--pos)]/12 px-1.5 text-[var(--pos)]"
                : f.paceStatus === "behind"
                  ? "tnum shrink-0 rounded bg-[var(--neg)]/12 px-1.5 text-[var(--neg)]"
                  : "tnum text-text-tertiary shrink-0 rounded bg-bg-elevated px-1.5"
            }
          >
            {f.paceStatus}
          </span>
          <span className="text-text-tertiary leading-snug">{f.paceText}</span>
        </div>
      )}
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
        {f.deltaPrior != null && (
          <FrameChip
            label={f.priorLabel ? `vs ${f.priorLabel}` : "Δ prior"}
            v={f.deltaPrior}
          />
        )}
        {f.deltaYear != null && <FrameChip label="Δ year" v={f.deltaYear} />}
        {f.pctChina != null && (
          <span className="text-text-tertiary tnum">{f.pctChina}% China</span>
        )}
      </div>
    </li>
  );
}

function MoneyFlowCard({ b }: { b: CotBundle }) {
  const netClass =
    b.net >= 0 ? "text-[var(--pos)]" : "text-[var(--neg)]";
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          {CROP_LABEL[b.crop]} · Managed Money · {b.reportDate}
        </span>
        {b.sourceUrl && (
          <a
            href={b.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-tertiary hover:text-[var(--accent)] shrink-0"
            title="CFTC source"
          >
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-text-secondary">Net position ({b.positioning})</span>
        <span className={`tnum font-medium ${netClass}`}>
          {b.net > 0 ? "+" : ""}
          {fmtValue(b.net)}
        </span>
      </div>

      {/* percentile bar — the headline frame */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-tertiary">
            {b.percentile}th pctile · {b.historyWeeks}-wk history
          </span>
          <span
            className={
              b.extreme
                ? "tnum rounded bg-[var(--neg)]/12 px-1.5 font-medium text-[var(--neg)]"
                : "tnum text-text-tertiary rounded bg-bg-elevated px-1.5"
            }
          >
            {b.extreme ? `EXTREME — ${b.extreme}` : "mid-range · weak signal"}
          </span>
        </div>
        <div className="bg-bg-elevated relative mt-1 h-1.5 overflow-hidden rounded-full">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${b.extreme ? "bg-[var(--neg)]" : "bg-[var(--accent)]"}`}
            style={{ width: `${Math.max(2, Math.min(100, b.percentile))}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
        {b.deltaPriorNet != null && <FrameChip label="Δ prior wk" v={b.deltaPriorNet} />}
        {b.trendNet4w != null && <FrameChip label="~4wk" v={b.trendNet4w} />}
        {b.openInterest != null && (
          <span className="text-text-tertiary tnum">OI {fmtValue(b.openInterest)}</span>
        )}
      </div>
      <p className="text-text-tertiary mt-2 text-[10px] leading-snug">
        Positioning, not prediction — aggregated, self-classified data.
      </p>
    </Card>
  );
}

function SupplyCard({ b }: { b: EconBundle }) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          {CROP_LABEL[b.crop]} · {REPORT_LABEL[b.reportType]} · {b.marketingYear}
        </span>
        {b.sourceUrl && (
          <a
            href={b.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-tertiary hover:text-[var(--accent)] shrink-0"
            title="USDA source"
          >
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <ul className="mt-2.5 space-y-2">
        {b.frames.map((f, i) => (
          <FrameRow key={i} f={f} />
        ))}
      </ul>
    </Card>
  );
}

function FrameRow({ f }: { f: EconFrame }) {
  return (
    <li className="border-border/40 border-b pb-1.5 last:border-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-text-secondary">{f.metric}</span>
        <span className="flex items-baseline gap-1">
          <span className="tnum text-foreground font-medium">
            {f.value != null ? fmtValue(f.value) : "—"}
          </span>
          <span className="text-text-tertiary text-[10px]">{f.unit}</span>
        </span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
        {f.deltaPrior != null && (
          <FrameChip
            label={f.priorLabel ? `vs ${f.priorLabel}` : "Δ prior"}
            v={f.deltaPrior}
          />
        )}
        {f.deltaYear != null && <FrameChip label="Δ year" v={f.deltaYear} />}
        {f.stocksToUse != null && (
          <span className="text-text-tertiary tnum">
            stocks/use {f.stocksToUse}%
          </span>
        )}
        {!f.expectationAvailable && (
          <span className="text-text-tertiary italic">exp. not tracked</span>
        )}
      </div>
    </li>
  );
}

function FrameChip({ label, v }: { label: string; v: number }) {
  const up = v > 0;
  const flat = v === 0;
  return (
    <span
      className={
        flat
          ? "text-text-tertiary tnum"
          : up
            ? "tnum text-[var(--pos)]"
            : "tnum text-[var(--neg)]"
      }
    >
      {label} {v > 0 ? "+" : ""}
      {fmtValue(v)}
    </span>
  );
}

function cnCountdown(days: number): string {
  const base =
    "tnum shrink-0 rounded px-2 py-0.5 text-[11px] font-medium tabular-nums ";
  if (days <= 3)
    return base + "bg-[var(--accent)]/15 text-[var(--accent)]";
  return base + "bg-bg-elevated text-text-secondary";
}

function ReportCard({ b }: { b: ReportBundle }) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          {CROP_LABEL[b.crop]} · {b.reportType} · {b.geography}
        </span>
        <a
          href={b.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-tertiary hover:text-[var(--accent)] shrink-0"
          title="NASS Quick Stats query"
        >
          <ExternalLink className="size-3" />
        </a>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {b.points.map((p, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-text-secondary">{p.label}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="tnum text-foreground font-medium">
                {p.value != null ? fmtValue(p.value) : "—"}
              </span>
              <span className="text-text-tertiary text-[10px]">{fmtUnit(p.unit)}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="text-text-tertiary mt-2.5 border-t border-border/60 pt-2 text-[10px]">
        {b.points[0]?.period && <span className="tnum">{b.points[0].period} · </span>}
        {b.period}
      </div>
    </Card>
  );
}

function SectionHeader({
  icon,
  title,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h2 className="text-foreground text-sm font-semibold">{title}</h2>
      <span className="text-text-tertiary ml-auto text-[11px]">{meta}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card className="text-text-secondary p-6 text-center text-sm">{children}</Card>
  );
}

function fmtValue(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function fmtUnit(unit: string): string {
  // tidy NASS units for display
  return unit
    .replace(/^PCT.*$/i, "%")
    .replace(/BU \/ ACRE/i, "bu/ac")
    .replace(/\bBU\b/i, "bu");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

function fmtAgo(ts: number | null): string {
  if (ts == null) return "never";
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
