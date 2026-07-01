import { Explainer } from "@/components/common/explainer";
import { Card } from "@/components/ui/card";

export type BreakevenView = { crop: string; label: string; breakeven: number | null };

/** Leads the Inputs page with the ANSWER: your per-crop break-even + what it's
 *  for. The costs and expected-yield inputs that produce it sit below. Reads the
 *  same computed number the dashboard, markets, and alerts use — no new math. */
export function BreakevenHeadline({ items }: { items: BreakevenView[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-text-tertiary px-1 text-[11px] font-medium tracking-wide uppercase">
        Your break-even
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <Card key={it.crop} className="p-4">
            <div className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
              {it.label} break-even
            </div>
            {it.breakeven != null ? (
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="tnum text-3xl font-semibold tracking-tight">${it.breakeven.toFixed(2)}</span>
                <span className="text-text-tertiary text-sm">/bu</span>
              </div>
            ) : (
              <div className="text-text-secondary mt-1 text-sm leading-relaxed">
                Add your costs and expected yield below to get your break-even.
              </div>
            )}
          </Card>
        ))}
      </div>
      <p className="text-text-secondary text-sm leading-relaxed">
        This is the price you need to cover your costs. Furrow uses it to tell you when today&apos;s cash price is
        profitable, and to alert you when the market crosses it.
      </p>
      <Explainer label="How your break-even works">
        It&apos;s your total logged cost per acre divided by your expected yield (bu/acre) — the cost baked into
        every bushel you grow. Log your costs and set your acres + expected yield below, and this updates
        automatically. The same number drives your dashboard position, the markets cash-vs-break-even line, and
        your price alerts — informational, not advice.
      </Explainer>
    </div>
  );
}
