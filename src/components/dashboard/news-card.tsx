import { Card } from "@/components/ui/card";
import { MOCK_NEWS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TONE_DOT: Record<string, string> = {
  pos: "bg-[var(--pos)]",
  neg: "bg-[var(--neg)]",
  neutral: "bg-[var(--neutral)]",
};

export function NewsCard() {
  return (
    <Card className="p-5 md:col-span-2">
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Market News
        </span>
        <span className="text-text-tertiary text-[11px]">Sample feed</span>
      </div>

      <ul className="divide-border/70 mt-2 divide-y">
        {MOCK_NEWS.map((item, i) => (
          <li key={i} className="flex items-start gap-3 py-3">
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                TONE_DOT[item.tone],
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-foreground text-sm leading-snug">
                {item.headline}
              </p>
              <div className="text-text-tertiary mt-0.5 flex items-center gap-2 text-[11px]">
                <span className="font-medium">{item.source}</span>
                <span>·</span>
                <span className="tnum">{item.time} ago</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
