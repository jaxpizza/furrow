import { cn } from "@/lib/utils";

/**
 * Furrow mark — three plowed furrow lines bending toward a horizon, in the
 * brand amber. Pairs with the Geist wordmark. No literal crops or tractors.
 */
export function FurrowMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-6 w-6", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <g
        stroke="var(--bg-base)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M7 21C12 13 20 13 25 21" />
        <path d="M8 25C13 18 19 18 24 25" />
        <path d="M10 16C13 12 19 12 22 16" opacity="0.55" />
      </g>
    </svg>
  );
}

export function FurrowLogo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <FurrowMark />
      {showWordmark && (
        <span className="text-foreground text-[15px] font-semibold tracking-tight">
          Furrow
        </span>
      )}
    </span>
  );
}
