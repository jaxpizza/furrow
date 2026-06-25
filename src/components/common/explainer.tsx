import { ChevronDown, HelpCircle } from "lucide-react";

/**
 * Lightweight "What's this?" disclosure built on native <details> — no client
 * JS, no accordion library. Always-visible cards stay clean; the deeper plain-
 * language detail expands on demand. App-wide standard: every farmer-facing
 * metric pairs a visible plain line with one of these optional expanders.
 */
export function Explainer({
  label = "What's this?",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mt-2">
      <summary className="text-text-tertiary hover:text-text-secondary flex cursor-pointer list-none items-center gap-1 text-[11px] transition-colors [&::-webkit-details-marker]:hidden">
        <HelpCircle className="size-3" />
        {label}
        <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-border text-text-secondary mt-2 border-l-2 pl-3 text-xs leading-relaxed">
        {children}
      </div>
    </details>
  );
}
