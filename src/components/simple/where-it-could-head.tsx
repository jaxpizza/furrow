import type { OutlookV2 } from "@/lib/outlook/synthesis";
import type { TechnicalsBundle } from "@/lib/outlook/technicals-types";
import { cn } from "@/lib/utils";

export type HeadRead = {
  crop: "corn" | "soybean";
  label: string;
  outlook: OutlookV2 | null;
  tech: TechnicalsBundle | null;
};

const LEAN = {
  up: { word: "leans supportive", tone: "text-[var(--pos)]" },
  down: { word: "leans pressuring", tone: "text-[var(--neg)]" },
  balanced: { word: "is about balanced", tone: "text-[var(--neutral)]" },
} as const;

const TREND_WORD: Record<TechnicalsBundle["trend"], string> = {
  uptrend: "trending up",
  downtrend: "trending down",
  sideways: "moving sideways",
};

function chartLine(label: string, tech: TechnicalsBundle | null): string | null {
  if (!tech || tech.basedOnSample) return null;
  const key = tech.atKeyLevel ? ` and testing ${tech.atKeyLevel}` : "";
  return `On the chart, ${label.toLowerCase()} is ${TREND_WORD[tech.trend]}${key} — levels other traders watch.`;
}

function CropRead({ read }: { read: HeadRead }) {
  const t = read.outlook?.dominantTension ?? null;
  const chart = chartLine(read.label, read.tech);

  return (
    <div className="space-y-1.5">
      <div className="text-text-secondary text-[11px] font-medium tracking-wide uppercase">{read.label}</div>
      {t ? (
        <p className="text-foreground text-[15px] leading-relaxed">
          The balance <span className={cn("font-medium", LEAN[t.leans].tone)}>{LEAN[t.leans].word}</span> right now
          {t.why ? <> — {t.why}</> : null}.
        </p>
      ) : read.outlook?.summary ? (
        <p className="text-foreground text-[15px] leading-relaxed">{read.outlook.summary}</p>
      ) : (
        <p className="text-text-tertiary text-[15px] leading-relaxed">The read is refreshing — check back shortly.</p>
      )}
      {chart && <p className="text-text-tertiary text-[13px] leading-relaxed">{chart}</p>}
    </div>
  );
}

/**
 * WHERE IT COULD HEAD — a short, plain read of the possibilities, built from the
 * engine's real tension (the competing forces) and technicals. Deliberately
 * honest: it frames BOTH directions with their conditions and names where the
 * pressure sits today — never a hard price prediction.
 */
export function WhereItCouldHead({ reads }: { reads: HeadRead[] }) {
  return (
    <section aria-label="Where it could head" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-text-secondary text-sm font-medium">Where it could head</h2>
        <span className="text-text-tertiary text-[11px]">not a prediction</span>
      </div>
      <div className="border-border bg-bg-surface/40 space-y-4 rounded-2xl border p-4">
        {reads.map((r) => (
          <CropRead key={r.crop} read={r} />
        ))}
      </div>
    </section>
  );
}
