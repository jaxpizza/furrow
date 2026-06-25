"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Target, X } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { CROP_LABEL } from "@/lib/markets/symbols";
import type { FiredAlert } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<FiredAlert["thresholdType"], string> = {
  breakeven: "Break-even",
  profit_target: "Profit target",
};

export function AlertsFeed({ alerts }: { alerts: FiredAlert[] }) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState<string | null>(null);

  async function dismiss(id: string) {
    setDismissing(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("price_alerts")
      .update({ status: "dismissed" })
      .eq("id", id);
    setDismissing(null);
    if (error) {
      toast.error(error.message ?? "Could not dismiss.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const isProfit = a.thresholdType === "profit_target";
        const delta = Math.max(0, a.cashPriceAtFire - a.thresholdPrice);
        const unread = a.status === "unread";
        const Icon = isProfit ? Target : ArrowUpRight;
        return (
          <Card
            key={a.id}
            className={cn(
              "flex items-start gap-3 p-4",
              unread && "border-[var(--accent)]/40 bg-[var(--accent)]/[0.04]",
            )}
          >
            <div
              className={cn(
                "mt-0.5 rounded-md p-1.5",
                isProfit
                  ? "bg-[var(--pos)]/12 text-[var(--pos)]"
                  : "bg-[var(--accent)]/12 text-[var(--accent)]",
              )}
            >
              <Icon className="size-4" strokeWidth={2.5} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-foreground text-sm font-medium">
                  {CROP_LABEL[a.crop as keyof typeof CROP_LABEL]} cash reached{" "}
                  <span className="tnum">${a.cashPriceAtFire.toFixed(2)}</span>
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                    isProfit
                      ? "bg-[var(--pos)]/12 text-[var(--pos)]"
                      : "bg-bg-elevated text-text-secondary",
                  )}
                >
                  {TYPE_LABEL[a.thresholdType]}
                </span>
                {unread && (
                  <span className="size-1.5 rounded-full bg-[var(--accent)]" />
                )}
              </div>
              <p className="text-text-secondary tnum mt-1 text-xs leading-relaxed">
                ${delta.toFixed(2)} above your{" "}
                {TYPE_LABEL[a.thresholdType].toLowerCase()} of $
                {a.thresholdPrice.toFixed(2)}
                {a.futuresAtFire != null && (
                  <>
                    {" · "}futures ${a.futuresAtFire.toFixed(2)}
                    {a.basisAtFire != null && (
                      <> · basis {fmtBasis(a.basisAtFire)}</>
                    )}
                  </>
                )}
              </p>
              <span
                className="text-text-tertiary mt-1 block text-[11px]"
                suppressHydrationWarning
              >
                {relTime(a.firedAt)}
              </span>
            </div>

            <button
              onClick={() => dismiss(a.id)}
              disabled={dismissing === a.id}
              aria-label="Dismiss alert"
              className="text-text-tertiary hover:text-foreground -m-1 shrink-0 rounded p-1 transition-colors disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </Card>
        );
      })}
    </div>
  );
}

function fmtBasis(cents: number): string {
  const sign = cents >= 0 ? "+" : "−";
  return `${sign}${Math.abs(cents)}¢`;
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
