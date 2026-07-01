import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SignalBadge } from "@/components/common/signal-badge";
import { Card } from "@/components/ui/card";
import type { OutlookV2 } from "@/lib/outlook/synthesis";
import type { Crop } from "@/lib/types/database";

export type MarketReadView = {
  crop: Crop;
  label: string;
  read: OutlookV2 | null;
  readUpdatedLabel: string | null;
};

/** The market read, reduced to its essence for the at-a-glance dashboard: the
 *  signal + one plain-English line of why. The six factors, the tension
 *  breakdown, and the macro strip all live in the full read (terminal). */
export function MarketReadPulse({ pulse }: { pulse: MarketReadView }) {
  const { crop, label, read, readUpdatedLabel } = pulse;

  if (!read) {
    return (
      <Card className="flex flex-col gap-2 p-4">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">{label}</span>
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

  // The essence of the read, shown in FULL (never truncated): the sharp pulse —
  // 2 causal sentences naming the competing forces + net result, generated and
  // cached with the read. Falls back to the dominant tension's "why", then the
  // summary, for older reads generated before the pulse existed. The six
  // factors, macro strip, and full narrative live behind "See full read".
  const essence = read.pulse ?? read.dominantTension?.why ?? read.summary;

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">{label}</span>
        <SignalBadge signal={read.signal} />
      </div>

      <p className="text-foreground text-sm leading-relaxed">{essence}</p>

      <div className="flex items-center justify-between gap-2">
        {readUpdatedLabel ? (
          <span className="text-text-tertiary text-[11px]">read updated {readUpdatedLabel}</span>
        ) : (
          <span />
        )}
        <Link
          href={`/terminal?crop=${crop}&mode=deep`}
          className="text-text-tertiary hover:text-[var(--accent)] inline-flex items-center gap-0.5 text-[11px] transition-colors"
        >
          See full read
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
