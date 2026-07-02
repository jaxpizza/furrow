"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { computeEffectiveBreakeven } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";

export type BeCrop = {
  crop: "corn" | "soybean";
  label: string;
  cashPrice: number | null;
  target: { costPerAcre: number | null; expectedYield: number | null; effectiveBreakeven: number | null } | null;
  prefill: { costPerAcre: number; expectedYield: number };
};

function toNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function gapLine(cash: number | null, be: number | null): { text: string; tone: string } | null {
  if (cash == null || be == null) return null;
  const gap = Math.round((cash - be) * 100) / 100;
  const above = gap >= 0;
  return {
    text: `${above ? "+" : "−"}$${Math.abs(gap).toFixed(2)} ${above ? "above" : "below"} break-even`,
    tone: above ? "text-[var(--pos)]" : "text-[var(--neg)]",
  };
}

/**
 * OPTIONAL break-even. Quiet and collapsed by default — the screen above is fully
 * useful without it. Opened, a farmer enters cost/acre + expected yield (pre-filled
 * with a sensible central-IL ballpark) and sees whether today's cash clears his
 * costs. Writes to the SAME breakeven_targets storage the full app uses, so it's
 * consistent if he ever switches to Detailed view.
 */
export function SimpleBreakeven({ farmId, crops }: { farmId: string; crops: BeCrop[] }) {
  const router = useRouter();
  const hasAny = crops.some((c) => c.target?.effectiveBreakeven != null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState(() =>
    crops.map((c) => ({
      crop: c.crop,
      costPerAcre: String(c.target?.costPerAcre ?? c.prefill.costPerAcre),
      expectedYield: String(c.target?.expectedYield ?? c.prefill.expectedYield),
    })),
  );

  function setRow(crop: string, patch: Partial<{ costPerAcre: string; expectedYield: string }>) {
    setRows((rs) => rs.map((r) => (r.crop === crop ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    const payloads = rows
      .map((r) => {
        const costPerAcre = toNum(r.costPerAcre);
        const expectedYield = toNum(r.expectedYield);
        const effective = computeEffectiveBreakeven({
          entryMode: "per_acre_yield",
          costPerBushel: null,
          costPerAcre,
          expectedYield,
        });
        return effective != null ? { crop: r.crop, costPerAcre, expectedYield } : null;
      })
      .filter((p): p is { crop: "corn" | "soybean"; costPerAcre: number | null; expectedYield: number | null } => p !== null);

    if (payloads.length === 0) {
      toast.error("Enter your cost per acre and expected yield.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.from("breakeven_targets").upsert(
      payloads.map((p) => ({
        farm_id: farmId,
        crop: p.crop,
        entry_mode: "per_acre_yield" as const,
        cost_per_bushel: null,
        cost_per_acre: p.costPerAcre,
        expected_yield: p.expectedYield,
        active: true,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "farm_id,crop" },
    );
    setPending(false);

    if (error) {
      toast.error(error.message ?? "Could not save your break-even.");
      return;
    }
    toast.success("Break-even saved.");
    setOpen(false);
    router.refresh();
  }

  return (
    <section aria-label="Your break-even (optional)" className="border-border bg-bg-surface/40 rounded-2xl border">
      {/* header row — always visible, doubles as the collapsed summary */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="bg-[var(--accent)]/12 text-[var(--accent)] grid size-8 shrink-0 place-items-center rounded-lg">
          <Wallet className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-foreground block text-sm font-medium">Your break-even</span>
          <span className="text-text-tertiary block text-[12px]">
            {hasAny ? "Today's price vs your costs" : "Optional — see if today's price clears your costs"}
          </span>
        </span>
        {/* collapsed at-a-glance result */}
        {!open && hasAny && (
          <span className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
            {crops.map((c) => {
              const g = gapLine(c.cashPrice, c.target?.effectiveBreakeven ?? null);
              return g ? (
                <span key={c.crop} className={cn("tnum text-[12px] font-medium", g.tone)}>
                  {c.label.slice(0, 4)} {g.text.replace(" break-even", "")}
                </span>
              ) : null;
            })}
          </span>
        )}
        <ChevronDown className={cn("text-text-tertiary size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* collapsed, small screens: show the result lines below the header */}
      {!open && hasAny && (
        <div className="space-y-1 px-4 pb-4 sm:hidden">
          {crops.map((c) => {
            const g = gapLine(c.cashPrice, c.target?.effectiveBreakeven ?? null);
            return g ? (
              <div key={c.crop} className="flex items-center justify-between text-[13px]">
                <span className="text-text-secondary">{c.label}</span>
                <span className={cn("tnum font-medium", g.tone)}>{g.text}</span>
              </div>
            ) : null;
          })}
        </div>
      )}

      {open && (
        <div className="border-border/70 space-y-4 border-t px-4 py-4">
          {crops.map((c) => {
            const row = rows.find((r) => r.crop === c.crop)!;
            const effective = computeEffectiveBreakeven({
              entryMode: "per_acre_yield",
              costPerBushel: null,
              costPerAcre: toNum(row.costPerAcre),
              expectedYield: toNum(row.expectedYield),
            });
            const g = gapLine(c.cashPrice, effective);
            return (
              <div key={c.crop} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-text-secondary text-[13px] font-medium">{c.label}</span>
                  <span className="text-text-tertiary text-[12px]">
                    break-even{" "}
                    <span className="tnum text-foreground font-medium">
                      {effective != null ? `$${effective.toFixed(2)}` : "—"}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor={`ca-${c.crop}`} className="text-[11px]">
                      Cost / acre
                    </Label>
                    <Input
                      id={`ca-${c.crop}`}
                      type="number"
                      inputMode="decimal"
                      value={row.costPerAcre}
                      onChange={(e) => setRow(c.crop, { costPerAcre: e.target.value })}
                      className="tnum"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`y-${c.crop}`} className="text-[11px]">
                      Yield (bu/ac)
                    </Label>
                    <Input
                      id={`y-${c.crop}`}
                      type="number"
                      inputMode="decimal"
                      value={row.expectedYield}
                      onChange={(e) => setRow(c.crop, { expectedYield: e.target.value })}
                      className="tnum"
                    />
                  </div>
                </div>
                {g && (
                  <div className={cn("tnum text-[13px] font-medium", g.tone)}>
                    At today&apos;s ${c.cashPrice?.toFixed(2)}, you&apos;re {g.text}.
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" onClick={onSave} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save break-even
            </Button>
            <span className="text-text-tertiary text-[11px]">Prefilled with a central-IL ballpark — adjust to yours.</span>
          </div>
        </div>
      )}
    </section>
  );
}
