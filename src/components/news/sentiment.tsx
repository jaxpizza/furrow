import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import type { Sentiment } from "@/lib/news/tagging";
import type { Crop } from "@/lib/types/database";
import { cn } from "@/lib/utils";

// Colorblind-safe: every state carries an icon + a word, not just a colour.
const MAP: Record<Sentiment, { Icon: typeof TrendingUp; word: string; cls: string }> = {
  bullish: { Icon: TrendingUp, word: "Bullish", cls: "text-[var(--pos)] bg-[var(--pos)]/12" },
  bearish: { Icon: TrendingDown, word: "Bearish", cls: "text-[var(--neg)] bg-[var(--neg)]/12" },
  neutral: { Icon: Minus, word: "Neutral", cls: "text-text-tertiary bg-foreground/[0.06]" },
};

const CROP_SHORT: Record<Crop, string> = { corn: "Corn", soybean: "Soy" };

export function SentimentTag({ crop, sentiment }: { crop: Crop; sentiment: Sentiment }) {
  const m = MAP[sentiment];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", m.cls)}>
      <span className="text-text-secondary font-semibold">{CROP_SHORT[crop]}</span>
      <m.Icon className="size-3" aria-hidden />
      {m.word}
    </span>
  );
}

/** Bare directional arrow + word, for an event takeaway's price read. */
export function DirectionPill({ direction }: { direction: "up" | "down" | "neutral" }) {
  const s: Sentiment = direction === "up" ? "bullish" : direction === "down" ? "bearish" : "neutral";
  const m = MAP[s];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", m.cls)}>
      <m.Icon className="size-3" aria-hidden />
      {m.word}
    </span>
  );
}
