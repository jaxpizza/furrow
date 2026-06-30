"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Crop } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import type { OutlookV2 } from "@/lib/outlook/synthesis";

import { CROP_LABEL, type BucketKey } from "./lib";

type Mode = "glance" | "deep";

/** Lets the glance signal-row jump the farmer straight into a bucket's detail in
 *  deep mode (taps a signal → switch mode → scroll + open that bucket). */
const TerminalCtx = createContext<{ goToBucket: (k: BucketKey) => void } | null>(null);
export function useTerminal() {
  const ctx = useContext(TerminalCtx);
  if (!ctx) throw new Error("useTerminal must be used inside TerminalChrome");
  return ctx;
}

export function TerminalChrome({
  crop,
  initialMode,
  updatedLabel,
  freshness,
  sampleData,
  glance,
  deep,
}: {
  crop: Crop;
  initialMode: Mode;
  updatedLabel: string | null;
  freshness: OutlookV2["freshness"] | null;
  sampleData: boolean;
  glance: React.ReactNode;
  deep: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const pendingBucket = useRef<BucketKey | null>(null);

  const setModeUrl = useCallback((m: Mode) => {
    setMode(m);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", m);
    window.history.replaceState(null, "", url);
  }, []);

  const goToBucket = useCallback((k: BucketKey) => {
    pendingBucket.current = k;
    setModeUrl("deep");
  }, [setModeUrl]);

  // once deep mode is showing, scroll to + open the requested bucket
  useEffect(() => {
    if (mode !== "deep" || !pendingBucket.current) return;
    const key = pendingBucket.current;
    pendingBucket.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(`bucket-${key}`);
      if (!el) return;
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [mode]);

  const updated = updatedLabel;

  return (
    <TerminalCtx.Provider value={{ goToBucket }}>
      <div className="mx-auto max-w-6xl">
        {/* ── command bar ─────────────────────────────────────────── */}
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

            <div className="flex items-center gap-2">
              {/* crop toggle — shared across modes, preserves current mode */}
              <div className="border-border bg-bg-elevated/60 inline-flex items-center gap-0.5 rounded-md border p-0.5">
                {(["corn", "soybean"] as Crop[]).map((c) => (
                  <Link
                    key={c}
                    href={`/terminal?crop=${c}&mode=${mode}`}
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

              {/* mode toggle — instant, client-side */}
              <div className="border-border bg-bg-elevated/60 inline-flex items-center gap-0.5 rounded-md border p-0.5">
                {(["glance", "deep"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModeUrl(m)}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      mode === m
                        ? "bg-foreground/90 text-bg-base"
                        : "text-text-secondary hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
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

        <div className="animate-in fade-in duration-200">
          {mode === "glance" ? glance : deep}
        </div>
      </div>
    </TerminalCtx.Provider>
  );
}
