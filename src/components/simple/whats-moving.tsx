import { ExternalLink } from "lucide-react";

import type { OutlookFactorV2, OutlookV2 } from "@/lib/outlook/synthesis";
import { cn } from "@/lib/utils";

export type MarketStory = {
  crop: "corn" | "soybean";
  label: string;
  outlook: OutlookV2 | null;
};

const DIR = {
  up: { mark: "▲", tone: "text-[var(--pos)]" },
  down: { mark: "▼", tone: "text-[var(--neg)]" },
  neutral: { mark: "•", tone: "text-text-tertiary" },
} as const;

function Factor({ factor }: { factor: OutlookFactorV2 }) {
  const d = DIR[factor.direction];
  return (
    <li className="flex gap-2.5 text-[15px] leading-relaxed">
      <span className={cn("mt-0.5 shrink-0 text-xs", d.tone)}>{d.mark}</span>
      <span className="text-foreground min-w-0">
        {factor.text}
        {factor.source &&
          (factor.source.url ? (
            <a
              href={factor.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-[var(--accent)] ml-1.5 inline-flex items-center gap-0.5 align-baseline text-[11px] whitespace-nowrap transition-colors"
            >
              {factor.source.label}
              <ExternalLink className="size-2.5" />
            </a>
          ) : (
            <span className="text-text-tertiary ml-1.5 text-[11px]">{factor.source.label}</span>
          ))}
      </span>
    </li>
  );
}

function CropStory({ story }: { story: MarketStory }) {
  const o = story.outlook;
  const factors = (o?.factors ?? []).slice(0, 2);

  return (
    <div className="space-y-2.5">
      <div className="text-[var(--accent)] text-[11px] font-medium tracking-wide uppercase">{story.label}</div>
      {o?.summary ? (
        <p className="text-foreground text-[15px] leading-relaxed">{o.summary}</p>
      ) : (
        <p className="text-text-tertiary text-[15px] leading-relaxed">
          The market read is refreshing — check back shortly.
        </p>
      )}
      {factors.length > 0 && <ul className="space-y-2 pt-0.5">{factors.map((f, i) => <Factor key={i} factor={f} />)}</ul>}
    </div>
  );
}

/**
 * WHAT'S MOVING THE MARKET — the star of the screen. A plain read of the real
 * forces behind the price (export demand, U.S. supply and weather, money and
 * policy), lifted straight from the engine's grounded synthesis of USDA data and
 * the ag news it ingests — each driver carrying its real source. Honest by
 * construction: it surfaces only what the engine actually tagged, never invented.
 */
export function WhatsMoving({ stories }: { stories: MarketStory[] }) {
  return (
    <section aria-label="What's moving the market" className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-serif text-xl font-medium tracking-tight">What&apos;s moving the market</h2>
        <p className="text-text-secondary text-[13px] leading-relaxed">
          What&apos;s happening out in the world that&apos;s moving corn and beans — from USDA data and the ag news
          the market&apos;s watching.
        </p>
      </div>

      <div
        className="relative space-y-5 overflow-hidden rounded-2xl border border-[var(--accent)]/25 p-5"
        style={{ background: "color-mix(in oklab, var(--accent) 5%, var(--bg-surface))" }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent"
        />
        {stories.map((s) => (
          <CropStory key={s.crop} story={s} />
        ))}
        <p className="text-text-tertiary border-t border-[var(--accent)]/15 pt-3 text-[11px] leading-relaxed">
          Real market news and USDA data, plainly told — context, not financial advice.
        </p>
      </div>
    </section>
  );
}
