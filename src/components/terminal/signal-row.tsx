"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  BUCKET_LABEL,
  BUCKET_ORDER,
  bucketKey,
  LEAN_META,
  type BucketKey,
  type Lean,
} from "./lib";
import { useTerminal } from "./terminal-chrome";

type Watched = { bucket: string; state: string; lean: string; emphasis: string; isDriver: boolean };

const ICON = { up: ArrowUpRight, down: ArrowDownRight, neutral: Minus };

/** The six engine signals as a calm status row. Most read neutral/quiet; active
 *  drivers draw the eye (amber). Tap any one to jump to its detail in deep mode. */
export function SignalRow({ watched }: { watched: Watched[] }) {
  const { goToBucket } = useTerminal();

  const byKey = new Map<BucketKey, Watched>();
  for (const w of watched) byKey.set(bucketKey(w.bucket), w);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {BUCKET_ORDER.map((key) => {
        const w = byKey.get(key);
        const lean = (w?.lean as Lean) ?? "neutral";
        const meta = LEAN_META[lean];
        const Icon = ICON[lean];
        const driver = w?.isDriver ?? false;
        return (
          <button
            key={key}
            onClick={() => goToBucket(key)}
            className={cn(
              "group flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
              driver
                ? "border-[var(--accent)]/35 bg-[var(--accent)]/[0.06]"
                : "border-border bg-bg-surface/40 hover:border-border hover:bg-bg-elevated/50",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-[11px] font-medium tracking-wide uppercase">
                {BUCKET_LABEL[key]}
              </span>
              {driver && (
                <span className="text-[var(--accent)] text-[9px] font-semibold tracking-wider uppercase">
                  driving
                </span>
              )}
            </div>
            <div className={cn("flex items-center gap-1 text-sm font-medium", meta.cls)}>
              <Icon className="size-3.5" strokeWidth={2.5} />
              {meta.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
