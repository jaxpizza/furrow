"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Explainer } from "@/components/common/explainer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { computeEffectiveBreakeven, type BreakevenTarget } from "@/lib/alerts/types";
import { createClient } from "@/lib/supabase/client";
import type { Crop } from "@/lib/types/database";

import { COST_GROUPS, COST_KEYS, numStr, toNum, type CostKey } from "./cost-categories";
import { MoneyField } from "./field";

export function CostBreakdownForm({
  farmId,
  crop,
  cropLabel,
  costs,
  target,
}: {
  farmId: string;
  crop: Crop;
  cropLabel: string;
  costs: Record<CostKey, number | null> | null;
  target: BreakevenTarget | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const [items, setItems] = useState<Record<CostKey, string>>(() =>
    Object.fromEntries(COST_KEYS.map((k) => [k, numStr(costs?.[k])])) as Record<CostKey, string>,
  );
  const [yield_, setYield] = useState(numStr(target?.expectedYield));
  const [profit, setProfit] = useState(numStr(target?.profitTargetPerBushel));

  const set = (k: CostKey, v: string) => setItems((p) => ({ ...p, [k]: v }));

  const total = useMemo(
    () => COST_KEYS.reduce((s, k) => s + (toNum(items[k]) ?? 0), 0),
    [items],
  );
  const yieldNum = toNum(yield_);
  const effective = computeEffectiveBreakeven({
    entryMode: "per_acre_yield",
    costPerBushel: null,
    costPerAcre: total > 0 ? total : null,
    expectedYield: yieldNum,
  });
  const profitNum = toNum(profit);
  const targetPrice =
    effective != null && profitNum != null && profitNum > 0
      ? Math.round((effective + profitNum) * 100) / 100
      : null;

  async function onSave() {
    setPending(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    // 1) the itemized breakdown
    const costRow = {
      farm_id: farmId,
      crop,
      ...Object.fromEntries(COST_KEYS.map((k) => [k, toNum(items[k])])),
      updated_at: now,
    };
    const { error: e1 } = await supabase
      .from("input_cost_items")
      .upsert(costRow, { onConflict: "farm_id,crop" });

    // 2) roll the sum into THE break-even the markets card / terminal / alerts use
    const { error: e2 } = await supabase.from("breakeven_targets").upsert(
      {
        farm_id: farmId,
        crop,
        entry_mode: "per_acre_yield",
        cost_per_bushel: null,
        cost_per_acre: total > 0 ? Math.round(total * 100) / 100 : null,
        expected_yield: yieldNum,
        profit_target_per_bushel: profitNum != null && profitNum > 0 ? profitNum : null,
        active: true,
        updated_at: now,
      },
      { onConflict: "farm_id,crop" },
    );

    setPending(false);
    if (e1 || e2) {
      toast.error((e1 ?? e2)?.message ?? "Could not save your costs.");
      return;
    }
    toast.success(`Costs saved — ${cropLabel} break-even updated`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Calculator className="size-4 text-[var(--accent)]" />
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Cost of production · {cropLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* itemized inputs */}
        <div className="space-y-5">
          {COST_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="text-text-tertiary mb-2 text-[10px] font-medium tracking-wide uppercase">
                {g.group}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {g.items.map((it) => (
                  <MoneyField
                    key={it.key}
                    id={`c-${it.key}`}
                    label={it.label}
                    hint={it.hint}
                    unit="$/ac"
                    value={items[it.key]}
                    onChange={(v) => set(it.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="border-border/70 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
            <MoneyField
              id="c-yield"
              label="Expected yield"
              unit="bu/ac"
              value={yield_}
              onChange={setYield}
              placeholder="205"
            />
            <MoneyField
              id="c-profit"
              label="Profit target"
              hint="optional"
              unit="+$/bu"
              value={profit}
              onChange={setProfit}
              placeholder="0.30"
            />
          </div>
        </div>

        {/* transparent break-even math */}
        <div className="border-border/70 bg-bg-elevated/40 flex h-fit flex-col rounded-lg border p-4 lg:sticky lg:top-4">
          <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
            Your {cropLabel.toLowerCase()} break-even
          </span>
          <span className="tnum mt-1 text-4xl font-semibold tracking-tight">
            {effective != null ? `$${effective.toFixed(2)}` : "—"}
            {effective != null && <span className="text-text-tertiary ml-1 text-base font-normal">/bu</span>}
          </span>

          <dl className="border-border/60 mt-3 space-y-1.5 border-t pt-3 text-xs">
            <Row label="Total cost" value={`$${total.toFixed(0)}/ac`} strong />
            <Row label="÷ Expected yield" value={yieldNum != null ? `${yieldNum} bu/ac` : "— set yield"} />
            <Row
              label="= Break-even"
              value={effective != null ? `$${effective.toFixed(2)}/bu` : "—"}
              accent
            />
            {targetPrice != null && (
              <Row label="Profit target" value={`$${targetPrice.toFixed(2)}/bu`} />
            )}
          </dl>

          <p className="text-text-tertiary mt-3 text-[11px] leading-relaxed">
            This is the break-even the Markets card, Terminal, cash-vs-break-even chart,
            and price alerts all use — one number, built from your real costs.
          </p>
        </div>
      </div>

      <Explainer>
        Your <span className="text-foreground">break-even</span> is the cash price where
        you stop losing money: total cost per acre ÷ expected yield. Enter each cost{" "}
        <span className="text-foreground">per acre</span> — most farm costs are budgeted
        that way — and we sum them and divide by your yield. Empty until you enter your
        real numbers; nothing is assumed. Saving here updates the single break-even used
        everywhere (it supersedes any quick per-bushel number you set on the Markets card).
        Informational, not financial advice.
      </Explainer>

      <Button onClick={onSave} size="sm" disabled={pending} className="mt-4">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {costs || target ? "Update costs" : "Save costs"}
      </Button>
    </Card>
  );
}

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd
        className={
          accent
            ? "tnum text-[var(--accent)] font-semibold"
            : strong
              ? "tnum text-foreground font-medium"
              : "tnum text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
