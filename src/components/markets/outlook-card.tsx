import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Eye,
  Info,
  Minus,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Explainer } from "@/components/common/explainer";
import { SignalBadge } from "@/components/common/signal-badge";
import type { OutlookFactorV2, OutlookV2 } from "@/lib/outlook/synthesis";
import { cn } from "@/lib/utils";

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

      <p className="text-text-secondary mt-4 text-sm leading-relaxed">
        {outlook.summary}
      </p>

      <ul className="divide-border/60 mt-3 divide-y border-t border-border/60">
        {outlook.factors.map((factor, i) => (
          <FactorRow key={i} factor={factor} />
        ))}
      </ul>

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
