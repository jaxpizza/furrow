import { CircleDot, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type Signal = "favorable" | "mixed" | "unfavorable";

const CONFIG: Record<
  Signal,
  { label: string; icon: typeof TrendingUp; color: string; bg: string }
> = {
  favorable: {
    label: "Favorable",
    icon: TrendingUp,
    color: "text-[var(--pos)]",
    bg: "bg-[var(--pos)]/12 border-[var(--pos)]/25",
  },
  mixed: {
    label: "Mixed / Hold",
    icon: CircleDot,
    color: "text-[var(--neutral)]",
    bg: "bg-[var(--neutral)]/12 border-[var(--neutral)]/25",
  },
  unfavorable: {
    label: "Unfavorable",
    icon: TrendingDown,
    color: "text-[var(--neg)]",
    bg: "bg-[var(--neg)]/12 border-[var(--neg)]/25",
  },
};

/**
 * The sell/hold "read". Three states — favorable / mixed-hold / unfavorable —
 * each paired with a distinct icon so meaning never rests on color alone.
 */
export function SignalBadge({
  signal,
  className,
}: {
  signal: Signal;
  className?: string;
}) {
  const { label, icon: Icon, color, bg } = CONFIG[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        bg,
        color,
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}
