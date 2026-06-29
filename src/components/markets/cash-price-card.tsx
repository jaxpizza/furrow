"use client";

import { useState } from "react";
import { Pencil, Plus, RefreshCw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ContourField } from "@/components/brand/contour-field";
import { Delta, type Direction } from "@/components/common/delta";
import { Explainer } from "@/components/common/explainer";
import type { Crop } from "@/lib/types/database";

import { BasisForm } from "./basis-form";
import { BreakevenVsCash } from "./breakeven-vs-cash";

function fmtBasis(cents: number): string {
  const sign = cents >= 0 ? "+" : "−";
  return `${sign}${Math.abs(cents)}¢`;
}

// Format date and time in SEPARATE calls with an explicit timezone. A single
// combined toLocaleString() is a hydration trap: Node's ICU joins date+time
// with " at " ("Jun 25 at 1:19 PM") while the browser uses ", ", and an unset
// timeZone drifts between the server's clock and the user's. Pinning Central
// (this is the Central-IL cash price) makes server and client render identical.
function fmtAsOf(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
  return `${date}, ${time} CT`;
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
  stale = false,
  delta,
  breakeven,
  basisAge,
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
  /** true when the live feed failed and a last-known quote is being served — so
   *  we never assert "15-MIN DELAYED" (live) over a stale value. */
  stale?: boolean;
  delta: { change: number; pct: number; direction: Direction };
  /** the farmer's break-even line, shown against the cash price */
  breakeven: { effective: number | null; profitTargetPrice: number | null };
  /** how long ago the basis was set + whether it's gone stale (~2wk) */
  basisAge: { label: string; stale: boolean } | null;
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
              ) : stale ? (
                <span className="rounded bg-[var(--neg)]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--neg)]">
                  FEED UNAVAILABLE · LAST VALUE
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

        {/* basis staleness — honest visibility, never nagging */}
        {hasBasis && basisAge && (
          <div className="-mt-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-text-tertiary">
                Basis set <span className="text-text-secondary">{basisAge.label}</span>.
              </span>
              {basisAge.stale && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-1.5 py-0.5 font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/15"
                >
                  <RefreshCw className="size-2.5" />
                  Confirm it&apos;s current
                </button>
              )}
            </div>
            <Explainer label="Why refresh your basis?">
              Basis isn&apos;t fixed — it drifts with local supply, demand, and
              freight through the season, so the cash figure is only as current
              as the basis behind it. Re-checking with your elevator every couple
              of weeks keeps it honest. Nothing here is blocked by an older basis;
              it&apos;s just worth a glance.
            </Explainer>
          </div>
        )}

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
