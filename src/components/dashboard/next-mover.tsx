import { CalendarClock } from "lucide-react";

import { Card } from "@/components/ui/card";

export type NextMoverInfo = { description: string; daysUntil: number } | null;

function countdown(d: number): string {
  if (d <= 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 14) return `in ${d} days`;
  return `in ${Math.round(d / 7)} wk`;
}

/** The soonest scheduled USDA report — so the farmer knows if something's about
 *  to move the market. Read-only from the report calendar; links to News for the
 *  full events tracker. */
export function NextMover({ mover }: { mover: NextMoverInfo }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <CalendarClock className="size-5 shrink-0 text-[var(--accent)]" />
      <div className="min-w-0 flex-1">
        <div className="text-foreground text-sm leading-snug">
          {mover ? mover.description : "No scheduled USDA report on the calendar right now."}
        </div>
      </div>
      {mover && (
        <span className="tnum shrink-0 text-sm font-semibold text-[var(--accent)]">{countdown(mover.daysUntil)}</span>
      )}
    </Card>
  );
}
