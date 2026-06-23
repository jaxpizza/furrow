import { type LucideIcon } from "lucide-react";

import { ContourField } from "@/components/brand/contour-field";
import { Card } from "@/components/ui/card";

/**
 * Phase-1 placeholder for nav sections that have no data yet. The contour motif
 * + a clear "what this will show" list keeps an empty section from reading as
 * broken.
 */
export function ComingSoon({
  icon: Icon,
  title,
  tagline,
  willShow,
}: {
  icon: LucideIcon;
  title: string;
  tagline: string;
  willShow: string[];
}) {
  return (
    <Card className="relative overflow-hidden">
      <ContourField className="text-foreground" opacity={0.04} />
      <div className="relative flex flex-col items-start gap-5 p-8 md:p-12">
        <div className="border-border bg-bg-elevated flex size-12 items-center justify-center rounded-lg border">
          <Icon className="size-6 text-[var(--accent)]" strokeWidth={1.75} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--accent)] uppercase">
              Coming soon
            </span>
          </div>
          <p className="text-text-secondary max-w-md text-sm leading-relaxed">
            {tagline}
          </p>
        </div>
        <div className="w-full max-w-md">
          <div className="text-text-tertiary mb-2 text-[11px] font-medium tracking-wide uppercase">
            What this will show
          </div>
          <ul className="space-y-2">
            {willShow.map((line) => (
              <li
                key={line}
                className="text-text-secondary flex items-start gap-2.5 text-sm"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]/60" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
