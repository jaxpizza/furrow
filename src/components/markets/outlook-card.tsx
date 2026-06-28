import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Eye,
  Globe,
  Info,
  Minus,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Explainer } from "@/components/common/explainer";
import { SignalBadge } from "@/components/common/signal-badge";
import type {
  DominantTension,
  MacroContextItem,
  OutlookV2,
  OutlookFactorV2,
  SeasonalContext,
  WatchedBucket,
} from "@/lib/outlook/synthesis";
import { cn } from "@/lib/utils";

function SeasonalLine({ ctx }: { ctx: SeasonalContext }) {
  return (
    <div className="border-border/60 bg-bg-elevated/30 mt-3 rounded-md border px-3 py-2">
      <div className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">
        Seasonal frame · {ctx.season}
      </div>
      <p className="text-text-secondary mt-0.5 text-[11px] leading-snug">{ctx.line}</p>
    </div>
  );
}

function TensionBlock({ t }: { t: DominantTension }) {
  const leanColor =
    t.leans === "up"
      ? "text-[var(--pos)]"
      : t.leans === "down"
        ? "text-[var(--neg)]"
        : "text-[var(--neutral)]";
  return (
    <div className="border-border/60 mt-3 rounded-md border border-dashed px-3 py-2.5">
      <div className="text-text-tertiary mb-1.5 text-[10px] font-medium tracking-wide uppercase">
        Dominant tension ·{" "}
        <span className={leanColor}>
          {t.leans === "balanced" ? "balanced" : `leans ${t.leans}`}
        </span>
      </div>
      <div className="flex items-stretch gap-2 text-[11px]">
        <div className="flex-1">
          <div className="text-[var(--pos)] text-[10px] font-medium">▲ supports</div>
          <p className="text-text-secondary leading-snug">{t.forceUp}</p>
        </div>
        <div className="bg-border/60 w-px" />
        <div className="flex-1">
          <div className="text-[var(--neg)] text-[10px] font-medium">▼ pressures</div>
          <p className="text-text-secondary leading-snug">{t.forceDown}</p>
        </div>
      </div>
      {t.why && (
        <p className="text-text-tertiary mt-1.5 text-[10px] leading-snug">{t.why}</p>
      )}
    </div>
  );
}

function WatchedContextList({ items }: { items: WatchedBucket[] }) {
  if (items.length === 0) return null;
  const arrow = (l: WatchedBucket["lean"]) =>
    l === "up" ? "↑" : l === "down" ? "↓" : "→";
  const color = (l: WatchedBucket["lean"]) =>
    l === "up"
      ? "text-[var(--pos)]"
      : l === "down"
        ? "text-[var(--neg)]"
        : "text-[var(--neutral)]";
  return (
    <div className="border-border/60 mt-1 border-t pt-3">
      <div className="text-text-tertiary mb-2 text-[10px] font-medium tracking-wide uppercase">
        All buckets considered · drivers + watched
      </div>
      <div className="space-y-1">
        {items.map((w, i) => (
          <div key={i} className="flex items-baseline gap-2 text-[11px]">
            <span className={cn("tnum w-3 shrink-0 text-center", color(w.lean))}>
              {arrow(w.lean)}
            </span>
            <span className="text-foreground w-20 shrink-0 font-medium">{w.bucket}</span>
            <span
              className={
                w.isDriver
                  ? "shrink-0 rounded bg-[var(--accent)]/15 px-1 text-[9px] text-[var(--accent)] uppercase"
                  : "text-text-tertiary shrink-0 rounded bg-bg-elevated px-1 text-[9px] uppercase"
              }
            >
              {w.isDriver ? "driver" : "watched"}
            </span>
            <span className="text-text-tertiary text-[9px] uppercase">{w.emphasis}</span>
            <span className="text-text-secondary min-w-0 leading-snug">{w.state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MacroContextStrip({ items }: { items: MacroContextItem[] }) {
  if (items.length === 0) return null;
  const arrow = (d: MacroContextItem["direction"]) =>
    d === "up" ? "↑" : d === "down" ? "↓" : "→";
  const color = (d: MacroContextItem["direction"]) =>
    d === "up"
      ? "text-[var(--pos)]"
      : d === "down"
        ? "text-[var(--neg)]"
        : "text-[var(--neutral)]";
  return (
    <div className="border-border/60 mt-1 border-t pt-3">
      <div className="text-text-tertiary mb-2 flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase">
        <Globe className="size-3" />
        Macro context
        <span className="text-text-tertiary/70 normal-case tracking-normal">
          · watched, not driving
        </span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {items.map((m) => (
          <div
            key={m.key}
            className="bg-bg-elevated/40 border-border/50 rounded-md border px-2.5 py-2"
          >
            <div className="text-text-tertiary text-[10px] tracking-wide uppercase">
              {m.label}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="tnum text-foreground text-sm font-medium">
                {m.value}
              </span>
              <span className={cn("tnum text-[11px] font-medium", color(m.direction))}>
                {arrow(m.direction)}
              </span>
            </div>
            <div className="text-text-tertiary tnum mt-0.5 text-[10px] leading-snug">
              {m.detail}
            </div>
            <div className="text-text-secondary mt-1 text-[10px] leading-snug">
              {m.lean}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FactorRow({ factor }: { factor: OutlookFactorV2 }) {
  const { direction, text, source } = factor;
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;
  const color =
    direction === "up"
      ? "text-[var(--pos)]"
      : direction === "down"
        ? "text-[var(--neg)]"
        : "text-[var(--neutral)]";
  const label =
    direction === "up"
      ? "pushing up"
      : direction === "down"
        ? "pushing down"
        : "neutral";

  return (
    <li className="flex items-start gap-2.5 py-2.5">
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} strokeWidth={2.5} />
      <div className="min-w-0">
        <p className="text-foreground text-sm leading-snug">{text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={cn("text-[10px] font-medium uppercase", color)}>
            {label}
          </span>
          {source &&
            (source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary hover:text-[var(--accent)] inline-flex items-center gap-1 text-[10px] transition-colors"
              >
                <ExternalLink className="size-2.5" />
                {source.label}
              </a>
            ) : (
              <span className="text-text-tertiary inline-flex items-center gap-1 text-[10px]">
                {source.label}
              </span>
            ))}
        </div>
      </div>
    </li>
  );
}

export function OutlookCard({ outlook }: { outlook: OutlookV2 | null }) {
  if (!outlook) {
    return (
      <Card className="flex flex-col p-5 md:col-span-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[var(--accent)]" />
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
            Market Outlook
          </span>
        </div>
        <p className="text-text-secondary mt-4 text-sm leading-relaxed">
          The market read is synthesized by Claude from the USDA + ag-news
          corpus and the price trend. Set{" "}
          <span className="text-foreground font-mono text-xs">
            ANTHROPIC_API_KEY
          </span>{" "}
          to enable it.
        </p>
      </Card>
    );
  }

  const f = outlook.freshness;
  const freshnessLine = [
    f.usdaWeek ? `USDA ${f.usdaWeek}` : null,
    `${f.newsCount} headlines${f.newsThrough ? ` through ${fmtDay(f.newsThrough)}` : ""}`,
    `${f.priceTrend} trend`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="flex flex-col p-5 md:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[var(--accent)]" />
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
            Market Outlook
          </span>
        </div>
        <SignalBadge signal={outlook.signal} />
      </div>

      {outlook.seasonalContext && <SeasonalLine ctx={outlook.seasonalContext} />}

      <p className="text-text-secondary mt-4 text-sm leading-relaxed">
        {outlook.summary}
      </p>

      {outlook.dominantTension && <TensionBlock t={outlook.dominantTension} />}

      <ul className="divide-border/60 mt-3 divide-y border-t border-border/60">
        {outlook.factors.map((factor, i) => (
          <FactorRow key={i} factor={factor} />
        ))}
      </ul>

      <MacroContextStrip items={outlook.macroContext ?? []} />

      <WatchedContextList items={outlook.watchedContext ?? []} />

      {outlook.watchItems.length > 0 && (
        <div className="border-border/60 mt-1 border-t pt-3">
          <div className="text-text-tertiary mb-1.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase">
            <Eye className="size-3" />
            What to watch
          </div>
          <ul className="space-y-1">
            {outlook.watchItems.map((w, i) => (
              <li
                key={i}
                className="text-text-secondary flex gap-1.5 text-xs leading-snug"
              >
                <span className="text-text-tertiary">·</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Explainer label="What's a condition rating?">
        The USDA % good/excellent is a weekly snapshot of how crops are rated
        right now — it&apos;s the sentiment the market reacts to, <span className="text-foreground">not a yield forecast</span>. Ratings swing
        through the season (Illinois ratings dropped in June 2023, then
        recovered with yields fine), so treat them as today&apos;s mood, not a
        prediction.
      </Explainer>

      <div className="mt-3 flex items-start gap-2 rounded-md border border-border/70 bg-bg-elevated/40 px-3 py-2">
        <Info className="text-text-tertiary mt-0.5 size-3.5 shrink-0" />
        <p className="text-text-tertiary text-[11px] leading-relaxed">
          {outlook.disclaimer}
        </p>
      </div>

      <div className="text-text-tertiary mt-3 space-y-1 text-[10px] leading-relaxed">
        <p>
          Based on {freshnessLine}
          {outlook.sampleData && " · price is SAMPLE data"}.
        </p>
        <p>{outlook.attribution}</p>
        <p className="font-mono">
          {outlook.model} · generated {fmtDateTime(outlook.generatedAt)}
        </p>
      </div>
    </Card>
  );
}

function fmtDay(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

function fmtDateTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
  return `${date}, ${time} CT`;
}
