import { Card } from "@/components/ui/card";
import type { Position } from "@/lib/inputs/ledger";

/** The marketing position, derived entirely from the logged harvest + sale
 *  ledgers — no manual totals. */
export function PositionSummary({ cropLabel, position }: { cropLabel: string; position: Position }) {
  const { produced, sold, remaining, pctSold, avgPrice, revenue, ownedRemaining, commercialRemaining, unassignedRemaining } = position;

  if (produced === 0 && sold === 0) {
    return (
      <Card className="p-5">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          {cropLabel} position
        </span>
        <p className="text-text-secondary mt-2 text-sm">
          Log harvest and sales below to see % sold, bushels remaining, and where they&apos;re stored.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          {cropLabel} position
        </span>
        {pctSold != null && (
          <span className="text-text-secondary text-xs">
            <span className="tnum text-foreground text-lg font-semibold">{pctSold}%</span> sold
          </span>
        )}
      </div>

      {pctSold != null && (
        <div className="bg-bg-elevated mt-2 h-2 overflow-hidden rounded-full">
          <div className="h-full bg-[var(--accent)]" style={{ width: `${pctSold}%` }} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Produced" value={`${fmt(produced)}`} unit="bu" />
        <Stat label="Sold" value={`${fmt(sold)}`} unit="bu" />
        <Stat label="Remaining" value={`${fmt(remaining)}`} unit="bu" accent />
        <Stat label="Avg price" value={avgPrice != null ? `$${avgPrice.toFixed(2)}` : "—"} />
      </div>

      <div className="border-border/60 mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t pt-3 text-xs">
        <span className="text-text-secondary">
          On-farm <span className="tnum text-foreground font-medium">{fmt(ownedRemaining)} bu</span>
        </span>
        <span className="text-text-secondary">
          Commercial <span className="tnum text-foreground font-medium">{fmt(commercialRemaining)} bu</span>
        </span>
        {unassignedRemaining > 0 && (
          <span className="text-text-tertiary">
            Unassigned <span className="tnum">{fmt(unassignedRemaining)} bu</span>
          </span>
        )}
        {revenue > 0 && (
          <span className="text-text-secondary ml-auto">
            Realized <span className="tnum text-foreground font-medium">${fmt(revenue)}</span>
          </span>
        )}
      </div>
    </Card>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-text-tertiary text-[10px] font-medium tracking-wide uppercase">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={accent ? "tnum text-[var(--accent)] text-lg font-semibold" : "tnum text-foreground text-lg font-semibold"}>
          {value}
        </span>
        {unit && <span className="text-text-tertiary text-[11px]">{unit}</span>}
      </div>
    </div>
  );
}
