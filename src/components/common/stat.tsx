import { cn } from "@/lib/utils";

/**
 * Labeled figure. The value renders in tabular mono (.tnum) so columns of
 * numbers align — the core "terminal" treatment for every figure in the app.
 */
export function Stat({
  label,
  value,
  unit,
  className,
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "tnum text-foreground font-semibold",
            size === "sm" && "text-base",
            size === "md" && "text-2xl",
            size === "lg" && "text-4xl",
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-text-secondary text-xs font-medium">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
