import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export type Direction = "up" | "down" | "flat";

/**
 * Directional change indicator. Color ALWAYS pairs with a caret/arrow so the
 * up/down read is colorblind-safe — never rely on hue alone.
 */
export function Delta({
  direction,
  children,
  className,
}: {
  direction: Direction;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-0.5 text-sm font-medium",
        direction === "up" && "text-[var(--pos)]",
        direction === "down" && "text-[var(--neg)]",
        direction === "flat" && "text-[var(--neutral)]",
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
      {children}
    </span>
  );
}
