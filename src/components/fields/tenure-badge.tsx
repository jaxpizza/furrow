import { TENURE_META } from "@/lib/fields";
import type { Tenure } from "@/lib/types/database";
import { cn } from "@/lib/utils";

/** Owned = amber (brand/equity); rented = neutral gold. Distinct shapes via the
 *  label so it doesn't lean on color alone. */
export function TenureBadge({
  tenure,
  className,
}: {
  tenure: Tenure;
  className?: string;
}) {
  const meta = TENURE_META[tenure];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        meta.rented
          ? "bg-[var(--neutral)]/12 text-[var(--neutral)]"
          : "bg-[var(--accent)]/15 text-[var(--accent)]",
        className,
      )}
    >
      {meta.short}
    </span>
  );
}
