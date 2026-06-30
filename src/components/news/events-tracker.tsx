import { CalendarClock, CheckCircle2, ExternalLink } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import { Card } from "@/components/ui/card";
import type { ReleasedEvent, UpcomingEvent } from "@/lib/news/events";

import { DirectionPill } from "./sentiment";

export function EventsTracker({
  upcoming,
  released,
}: {
  upcoming: UpcomingEvent[];
  released: ReleasedEvent[];
}) {
  return (
    <Card className="p-5">
      <div>
        <h2 className="text-foreground text-sm font-semibold">Events tracker</h2>
        <p className="text-text-tertiary text-[11px]">
          The USDA report calendar — what&apos;s coming, and what the ones that landed actually meant.
        </p>
      </div>

      {/* UPCOMING */}
      <div className="mt-4">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5 text-[var(--accent)]" aria-hidden />
          <span className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">Coming up</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-text-secondary py-3 text-sm">No scheduled releases on the calendar.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {upcoming.map((e) => (
              <li
                key={`${e.reportType}-${e.releaseDate}`}
                className="border-border bg-bg-elevated/40 flex items-start gap-3 rounded-lg border p-3"
              >
                <Countdown days={e.daysUntil} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-foreground text-sm font-semibold">{e.label}</span>
                    <span className="text-text-tertiary tnum text-[11px]">{fmtDate(e.releaseDate)}</span>
                  </div>
                  <p className="text-text-secondary mt-0.5 text-xs leading-relaxed">{e.whatToWatch}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* RELEASED */}
      <div className="mt-5">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-[var(--pos)]" aria-hidden />
          <span className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">Released</span>
        </div>
        {released.length === 0 ? (
          <p className="text-text-secondary py-3 text-sm">
            No recent releases with results yet. Once a report&apos;s data lands, it shows here with the figure
            and what it meant.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {released.map((e) => (
              <li
                key={`${e.reportType}-${e.releaseDate}`}
                className="border-border/70 border-l-2 border-l-[var(--pos)]/50 bg-bg-elevated/40 rounded-lg rounded-l-sm border p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground text-sm font-semibold">{e.label}</span>
                  <span className="text-text-tertiary tnum text-[11px]">
                    {fmtDate(e.releaseDate)} · {ago(e.daysAgo)}
                  </span>
                </div>

                {e.results.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {e.results.map((r) => (
                      <div key={r.crop} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                        <span className="text-text-tertiary w-10 shrink-0 capitalize">{r.crop}</span>
                        <span className="text-foreground tnum font-medium">{r.valueLabel}</span>
                        {r.deltaLabel && <span className="text-text-secondary tnum">{r.deltaLabel}</span>}
                        <DirectionPill direction={r.direction} />
                      </div>
                    ))}
                  </div>
                )}

                {e.takeaway && (
                  <div className="border-border/60 mt-2 border-t pt-2">
                    <div className="flex items-start gap-2">
                      <DirectionPill direction={e.takeaway.direction} />
                      <p className="text-text-secondary min-w-0 flex-1 text-xs leading-relaxed">
                        {e.takeaway.text}
                      </p>
                    </div>
                    <span className="text-text-tertiary mt-1 block text-[10px]">
                      {e.takeaway.fromEngine ? "Furrow engine's read" : "Read from the released figures"}
                    </span>
                  </div>
                )}

                {e.articles.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {e.articles.map((art) => (
                      <a
                        key={art.link}
                        href={art.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-tertiary hover:text-[var(--accent)] inline-flex items-center gap-1 text-[11px] transition-colors"
                      >
                        <ExternalLink className="size-2.5 shrink-0" aria-hidden />
                        <span className="truncate">
                          {art.source}: {art.title}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Explainer label="How an event resolves">
        A report sits in <span className="text-foreground">Coming up</span> with a countdown until its data
        lands. The moment the actual numbers ingest, it moves to{" "}
        <span className="text-foreground">Released</span> with the framed result and the engine&apos;s read of
        what it meant — the same release-detection that resolves the outlook&apos;s watch-items, shown as a
        timeline.
      </Explainer>
    </Card>
  );
}

function Countdown({ days }: { days: number }) {
  const big = days === 0 ? "Today" : days === 1 ? "1" : String(days);
  const small = days === 0 ? "" : days === 1 ? "day" : "days";
  return (
    <div className="bg-[var(--accent)]/10 text-[var(--accent)] flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5">
      <span className="tnum text-base leading-none font-bold">{big}</span>
      {small && <span className="text-[10px] leading-tight">{small}</span>}
    </div>
  );
}

function ago(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return `${Math.round(days / 7)} wk ago`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
