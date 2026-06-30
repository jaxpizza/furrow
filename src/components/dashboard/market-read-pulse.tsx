import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SignalBadge } from "@/components/common/signal-badge";
import { Card } from "@/components/ui/card";

import type { CropPulse } from "./types";

const LEANS: Record<string, string> = {
  up: "Leans supportive",
  down: "Leans pressuring",
  balanced: "Balanced",
};

/** Compact headline of the engine's read — signal, one-line summary, the leading
 *  force. The full sourced reasoning lives in the terminal (linked). */
export function MarketReadPulse({ pulse }: { pulse: CropPulse }) {
  const { crop, label, read, readUpdatedLabel } = pulse;

  if (!read) {
    return (
      <Card className="flex flex-col gap-2 p-4">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          {label}
        </span>
        <p className="text-text-secondary text-sm">
          No read yet — it appears after the first generation.{" "}
          <Link href={`/terminal?crop=${crop}`} className="text-[var(--accent)] hover:underline">
            Open the Terminal
          </Link>
          .
        </p>
      </Card>
    );
  }

  const t = read.dominantTension;
  const leadForce = t ? (t.leans === "down" ? t.forceDown : t.forceUp) : null;

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
            {label}
          </span>
          <SignalBadge signal={read.signal} />
        </div>
        <Link
          href={`/terminal?crop=${crop}&mode=deep`}
          className="text-text-tertiary hover:text-[var(--accent)] inline-flex items-center gap-0.5 text-[11px] transition-colors"
        >
          Full read
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <p className="text-foreground line-clamp-3 text-sm leading-relaxed">{read.summary}</p>

      {t && (
        <div className="border-border/70 flex items-start gap-2 border-t pt-2.5 text-xs">
          <span
            className={
              t.leans === "down"
                ? "text-[var(--neg)] shrink-0 font-semibold"
                : t.leans === "up"
                  ? "text-[var(--pos)] shrink-0 font-semibold"
                  : "text-text-tertiary shrink-0 font-semibold"
            }
          >
            {LEANS[t.leans] ?? "Mixed"}
          </span>
          {leadForce && <span className="text-text-secondary line-clamp-1">— {leadForce}</span>}
        </div>
      )}

      {readUpdatedLabel && (
        <span className="text-text-tertiary text-[11px]">read updated {readUpdatedLabel}</span>
      )}
    </Card>
  );
}
