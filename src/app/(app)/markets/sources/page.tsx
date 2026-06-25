import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Database, ExternalLink, Newspaper } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { getSessionContext } from "@/lib/farm";
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

  const { news, reports, newsFetchedAt, reportsFetchedAt } =
    await getSourcesSnapshot();

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
