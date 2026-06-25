"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ContourField } from "@/components/brand/contour-field";
import { Delta, type Direction } from "@/components/common/delta";
import type { Crop } from "@/lib/types/database";

import { BasisForm } from "./basis-form";
import { BreakevenVsCash } from "./breakeven-vs-cash";

function fmtBasis(cents: number): string {
  const sign = cents >= 0 ? "+" : "−";
  return `${sign}${Math.abs(cents)}¢`;
}

function fmtAsOf(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CashPriceCard({
  crop,
  cropLabel,
  farmId,
  cashPrice,
  basisCents,
  hasBasis,
  elevatorName,
  futuresPrice,
  contractMonth,
  asOf,
  source,
  delta,
  breakeven,
}: {
  crop: Crop;
  cropLabel: string;
  farmId: string;
  cashPrice: number;
  basisCents: number;
  hasBasis: boolean;
  elevatorName: string | null;
  futuresPrice: number;
  contractMonth: string;
  asOf: string;
  /** futures source: 'api-ninjas' (live, 15-min delayed) | 'sample' */
  source: string;
  delta: { change: number; pct: number; direction: Direction };
  /** the farmer's break-even line, shown against the cash price */
  breakeven: { effective: number | null; profitTargetPrice: number | null };
}) {
  const isSample = source === "sample";
  const [editing, setEditing] = useState(false);

  return (
    <Card className="relative overflow-hidden md:col-span-2">
      <ContourField className="text-[var(--accent)]" opacity={0.05} />
      <div className="relative flex flex-col gap-5 p-5">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
                Cash Price · {cropLabel} · Central IL
              </span>
              {isSample ? (
                <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                  SAMPLE
                </span>
              ) : (
                <span className="text-text-tertiary rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium">
                  15-MIN DELAYED
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="tnum text-4xl font-semibold tracking-tight">
                ${cashPrice.toFixed(2)}
              </span>
              <Delta direction={delta.direction}>
                {delta.change >= 0 ? "+" : ""}
                {delta.change.toFixed(2)} ({delta.pct >= 0 ? "+" : ""}
                {delta.pct.toFixed(1)}%)
              </Delta>
            </div>
          </div>
          <span className="text-text-tertiary text-[11px]">
            as of {fmtAsOf(asOf)}
          </span>
        </div>

        {/* breakdown: futures + basis = cash */}
        <div className="border-border/80 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-bg-elevated/40 px-4 py-3 text-sm">
          <span className="text-text-secondary">Futures</span>
          <span className="text-text-tertiary tnum text-xs">{contractMonth}</span>
          <span className="tnum text-foreground font-medium">
            ${futuresPrice.toFixed(2)}
          </span>
          <span className="text-text-tertiary px-1">+</span>
          <span className="text-text-secondary">
            {hasBasis ? "your basis" : "basis"}
          </span>
          <span className="tnum text-foreground font-medium">
            {fmtBasis(basisCents)}
          </span>
          {!hasBasis && (
            <span className="text-text-tertiary text-xs">(sample)</span>
          )}
          {elevatorName && (
            <span className="text-text-tertiary text-xs">· {elevatorName}</span>
          )}
          <span className="text-text-tertiary px-1">=</span>
          <span className="text-text-secondary">cash</span>
          <span className="tnum font-semibold text-[var(--accent)]">
            ${cashPrice.toFixed(2)}
          </span>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-text-tertiary hover:text-foreground ml-auto inline-flex items-center gap-1 text-xs transition-colors"
          >
            {hasBasis ? (
              <>
                <Pencil className="size-3" /> Edit basis
              </>
            ) : (
              <>
                <Plus className="size-3" /> Set your basis
              </>
            )}
          </button>
        </div>

        {/* break-even vs cash — the at-a-glance moneymaker */}
        <BreakevenVsCash
          breakeven={breakeven.effective}
          profitTargetPrice={breakeven.profitTargetPrice}
          cashPrice={cashPrice}
        />

        {/* prompt to set basis when none stored */}
        {!hasBasis && !editing && (
          <p className="text-text-secondary -mt-2 text-sm leading-relaxed">
            <span className="text-foreground font-medium">
              Set your basis
            </span>{" "}
            to turn the futures price into your real cash bid. We&apos;re showing
            a sample basis until you do.
          </p>
        )}

        {editing && (
          <div className="rounded-md border border-border bg-bg-surface p-4">
            <BasisForm
              farmId={farmId}
              crop={crop}
              initialBasisCents={hasBasis ? basisCents : null}
              initialElevator={elevatorName}
              onSaved={() => setEditing(false)}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
