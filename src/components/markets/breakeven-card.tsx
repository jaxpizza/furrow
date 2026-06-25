"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Explainer } from "@/components/common/explainer";
import { createClient } from "@/lib/supabase/client";
import type { Crop } from "@/lib/types/database";
import {
  computeEffectiveBreakeven,
  type BreakevenTarget,
  type EntryMode,
} from "@/lib/alerts/types";
import { cn } from "@/lib/utils";

export function BreakevenCard({
  farmId,
  crop,
  cropLabel,
  target,
}: {
  farmId: string;
  crop: Crop;
  cropLabel: string;
  target: BreakevenTarget | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<EntryMode>(target?.entryMode ?? "per_bushel");
  const [perBu, setPerBu] = useState(numStr(target?.costPerBushel));
  const [perAcre, setPerAcre] = useState(numStr(target?.costPerAcre));
  const [yield_, setYield] = useState(numStr(target?.expectedYield));
  const [profit, setProfit] = useState(numStr(target?.profitTargetPerBushel));

  const effective = computeEffectiveBreakeven({
    entryMode: mode,
    costPerBushel: toNum(perBu),
    costPerAcre: toNum(perAcre),
    expectedYield: toNum(yield_),
  });
  const profitNum = toNum(profit);
  const targetPrice =
    effective != null && profitNum != null && profitNum > 0
      ? Math.round((effective + profitNum) * 100) / 100
      : null;

  async function onSave() {
    if (effective == null) {
      toast.error("Enter your cost so we can compute a break-even.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.from("breakeven_targets").upsert(
      {
        farm_id: farmId,
        crop,
        entry_mode: mode,
        cost_per_bushel: mode === "per_bushel" ? toNum(perBu) : null,
        cost_per_acre: mode === "per_acre_yield" ? toNum(perAcre) : null,
        expected_yield: mode === "per_acre_yield" ? toNum(yield_) : null,
        profit_target_per_bushel: profitNum != null && profitNum > 0 ? profitNum : null,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "farm_id,crop" },
    );
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not save your break-even.");
      return;
    }
    toast.success(`Break-even saved for ${cropLabel}`);
    router.refresh();
  }

  return (
    <Card className="p-5 md:col-span-3">
      <div className="flex items-center gap-2">
        <Calculator className="size-4 text-[var(--accent)]" />
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Break-even Alert · {cropLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[1fr_auto]">
        {/* inputs */}
        <div className="space-y-4">
          {/* mode toggle */}
          <div className="bg-bg-elevated inline-flex rounded-md p-0.5 text-xs">
            <ModeButton
              active={mode === "per_bushel"}
              onClick={() => setMode("per_bushel")}
            >
              Cost per bushel
            </ModeButton>
            <ModeButton
              active={mode === "per_acre_yield"}
              onClick={() => setMode("per_acre_yield")}
            >
              Cost per acre + yield
            </ModeButton>
          </div>

          {mode === "per_bushel" ? (
            <Field
              id="be-perbu"
              label="My cost"
              unit="$/bu"
              value={perBu}
              onChange={setPerBu}
              placeholder="4.15"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="be-peracre"
                label="My cost"
                unit="$/ac"
                value={perAcre}
                onChange={setPerAcre}
                placeholder="850"
              />
              <Field
                id="be-yield"
                label="Expected yield"
                unit="bu/ac"
                value={yield_}
                onChange={setYield}
                placeholder="205"
              />
            </div>
          )}

          <Field
            id="be-profit"
            label="Profit target (optional)"
            unit="+$/bu"
            value={profit}
            onChange={setProfit}
            placeholder="0.30"
          />

          <Explainer>
            Your <span className="text-foreground">break-even</span> is the cash
            price where you stop losing money. Enter it directly as a per-bushel
            cost, or as your cost per acre divided by expected yield — e.g.
            $850/ac ÷ 205 bu/ac = <span className="tnum">$4.15</span>/bu. The
            optional <span className="text-foreground">profit target</span> adds
            cents on top, so you also get alerted when cash clears break-even by
            that much. We compare your number against the live{" "}
            <span className="text-foreground">cash price</span> (futures + your
            basis) — never futures alone. Informational, not financial advice.
          </Explainer>
        </div>

        {/* computed effective break-even */}
        <div className="border-border/70 flex flex-col justify-center rounded-md border bg-bg-elevated/40 px-5 py-4 md:min-w-[180px]">
          <span className="text-text-tertiary text-[11px]">
            Effective break-even
          </span>
          <span className="tnum mt-1 text-3xl font-semibold tracking-tight">
            {effective != null ? `$${effective.toFixed(2)}` : "—"}
          </span>
          {targetPrice != null && (
            <span className="text-text-secondary tnum mt-1 text-xs">
              target ${targetPrice.toFixed(2)}
            </span>
          )}
          {mode === "per_acre_yield" && effective != null && (
            <span className="text-text-tertiary tnum mt-2 text-[11px]">
              ${toNum(perAcre)?.toFixed(0)}/ac ÷ {toNum(yield_)} bu
            </span>
          )}
        </div>
      </div>

      <Button
        onClick={onSave}
        size="sm"
        disabled={pending || effective == null}
        className="mt-4"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {target ? "Update break-even" : "Save break-even"}
      </Button>
    </Card>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1 font-medium transition-colors",
        active
          ? "bg-bg-surface text-foreground shadow-sm"
          : "text-text-tertiary hover:text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="tnum pr-14"
        />
        <span className="text-text-tertiary absolute top-1/2 right-3 -translate-y-1/2 text-xs">
          {unit}
        </span>
      </div>
    </div>
  );
}

function numStr(n: number | null | undefined): string {
  return n != null ? String(n) : "";
}
function toNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
