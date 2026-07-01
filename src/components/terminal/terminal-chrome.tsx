import Link from "next/link";

import type { Crop } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import type { OutlookV2 } from "@/lib/outlook/synthesis";

import { CROP_LABEL } from "./lib";

/** The terminal's command bar + shell. The terminal is a single deep view — the
 *  calm 30-second read lives on the Markets tab — so this is a static frame:
 *  title, crop toggle, and the honest freshness / not-advice line. */
export function TerminalChrome({
  crop,
  updatedLabel,
  freshness,
  sampleData,
  children,
}: {
  crop: Crop;
  updatedLabel: string | null;
  freshness: OutlookV2["freshness"] | null;
  sampleData: boolean;
  children: React.ReactNode;
}) {
  const updated = updatedLabel;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── command bar ─────────────────────────────────────────────── */}
      <header className="border-border bg-bg-surface/40 sticky top-0 z-20 -mx-4 mb-4 border-b px-4 py-3 backdrop-blur md:mx-0 md:rounded-lg md:border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-[var(--accent)]/15 text-[var(--accent)] grid size-7 place-items-center rounded-md">
              <span className="size-2 animate-pulse rounded-full bg-[var(--accent)]" />
            </span>
            <div>
              <h1 className="text-sm leading-tight font-semibold tracking-tight">
                Intelligence Terminal
              </h1>
              <p className="text-text-tertiary text-[11px] leading-tight">
                {CROP_LABEL[crop]} · the full read
              </p>
            </div>
          </div>

          {/* crop toggle */}
          <div className="border-border bg-bg-elevated/60 inline-flex items-center gap-0.5 rounded-md border p-0.5">
            {(["corn", "soybean"] as Crop[]).map((c) => (
              <Link
                key={c}
                href={`/terminal?crop=${c}`}
                scroll={false}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  crop === c
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "text-text-secondary hover:text-foreground",
                )}
              >
                {CROP_LABEL[c]}
              </Link>
            ))}
          </div>
        </div>

        {/* honest freshness + not-advice line */}
        <div className="text-text-tertiary mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          {updated && <span className="tnum">updated {updated}</span>}
          {freshness?.usdaWeek && (
            <>
              <span className="opacity-40">·</span>
              <span>USDA {freshness.usdaWeek}</span>
            </>
          )}
          {sampleData && (
            <>
              <span className="opacity-40">·</span>
              <span className="text-[var(--neutral)]">contains sample data</span>
            </>
          )}
          <span className="opacity-40">·</span>
          <span>Market context, not financial advice.</span>
        </div>
      </header>

      {children}
    </div>
  );
}
