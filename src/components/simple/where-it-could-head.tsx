import type { OutlookV2 } from "@/lib/outlook/synthesis";
import { cn } from "@/lib/utils";

export type HeadRead = {
  crop: "corn" | "soybean";
  label: string;
  outlook: OutlookV2 | null;
};

/**
 * Honest lean read from what the engine genuinely computes: the 3-state `signal`
 * (favorable / mixed / unfavorable) and `dominantTension.leans` (up / down /
 * balanced). We map that to a coarse 5-step tilt — NO fabricated percentage, no
 * per-factor weights (the engine assigns none). "Driving it" names the engine's
 * own lead force on the winning side; when it's genuinely balanced we say so.
 */
type Lean = {
  pos: -2 | -1 | 0 | 1 | 2;
  word: string;
  tone: string;
  driver: string | null; // heaviest-hitting force (winning side), null when balanced
  opposing: string | null;
};

const MINT = "text-[var(--pos)]";
const CORAL = "text-[var(--neg)]";
const GOLD = "text-[var(--neutral)]";

function readLean(o: OutlookV2 | null): Lean | null {
  if (!o?.signal) return null;
  const t = o.dominantTension;
  let pos: Lean["pos"];
  let word: string;
  let tone: string;

  if (o.signal === "favorable") {
    pos = 2;
    word = "Bullish";
    tone = MINT;
  } else if (o.signal === "unfavorable") {
    pos = -2;
    word = "Bearish";
    tone = CORAL;
  } else {
    const leans = t?.leans ?? "balanced";
    if (leans === "up") {
      pos = 1;
      word = "Leaning bullish";
      tone = MINT;
    } else if (leans === "down") {
      pos = -1;
      word = "Leaning bearish";
      tone = CORAL;
    } else {
      pos = 0;
      word = "Balanced";
      tone = GOLD;
    }
  }

  const driver = t ? (pos > 0 ? t.forceUp : pos < 0 ? t.forceDown : null) : null;
  const opposing = t ? (pos > 0 ? t.forceDown : pos < 0 ? t.forceUp : null) : null;
  return { pos, word, tone, driver, opposing };
}

/** A calm tilt scale: centered when balanced, tipped toward the dominant side.
 *  Marker position reflects the engine's real 3-state lean — never a percentage. */
function LeanMeter({ pos }: { pos: number }) {
  const left = 8 + ((pos + 2) / 4) * 84; // −2 → 8%, 0 → 50%, +2 → 92%
  const tone = pos > 0 ? "var(--pos)" : pos < 0 ? "var(--neg)" : "var(--neutral)";
  return (
    <div className="space-y-1">
      <div
        className="relative h-2 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--neg) 30%, transparent), color-mix(in oklab, var(--bg-elevated) 60%, transparent) 50%, color-mix(in oklab, var(--pos) 30%, transparent))",
        }}
      >
        <div className="bg-border absolute inset-y-[-2px] left-1/2 w-px -translate-x-1/2" aria-hidden />
        <div
          className="border-bg-base absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
          style={{ left: `${left}%`, backgroundColor: tone }}
          aria-hidden
        />
      </div>
      <div className="text-text-tertiary flex justify-between text-[10px] font-medium">
        <span>Bearish</span>
        <span>Bullish</span>
      </div>
    </div>
  );
}

function CropRead({ read }: { read: HeadRead }) {
  const lean = readLean(read.outlook);

  if (!lean) {
    return (
      <div className="space-y-1">
        <div className="text-text-secondary text-[11px] font-medium tracking-wide uppercase">{read.label}</div>
        <p className="text-text-tertiary text-[15px] leading-relaxed">The read is refreshing — check back shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-text-secondary text-[11px] font-medium tracking-wide uppercase">{read.label}</span>
        <span className={cn("text-[13px] font-semibold", lean.tone)}>{lean.word}</span>
      </div>

      <LeanMeter pos={lean.pos} />

      {lean.pos !== 0 && lean.driver ? (
        <div className="space-y-0.5 pt-0.5">
          <p className="text-[14px] leading-relaxed">
            <span className="text-text-tertiary">Driving it: </span>
            <span className={cn("font-medium", lean.tone)}>{lean.driver}</span>.
          </p>
          {lean.opposing && (
            <p className="text-text-tertiary text-[13px] leading-relaxed">Pushing back: {lean.opposing}.</p>
          )}
        </div>
      ) : (
        <div className="space-y-0.5 pt-0.5">
          <p className="text-foreground text-[14px] leading-relaxed">No single force is winning — genuinely balanced.</p>
          {lean.driver === null && read.outlook?.dominantTension && (
            <p className="text-text-tertiary text-[13px] leading-relaxed">
              <span className="text-[var(--pos)]">▲</span> {read.outlook.dominantTension.forceUp}.{"  "}
              <span className="text-[var(--neg)]">▼</span> {read.outlook.dominantTension.forceDown}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * WHERE IT COULD HEAD — which side is pushing harder, felt at a glance. A tilt
 * meter (from the engine's real signal + lean) and the single heaviest-hitting
 * force (the tension's lead force on the winning side). Honest: it shows current
 * market conditions and the coarse tilt the engine computes — never a price
 * prediction, never a fabricated magnitude. Balanced is stated as balanced.
 */
export function WhereItCouldHead({ reads }: { reads: HeadRead[] }) {
  return (
    <section aria-label="Where it could head" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-text-secondary text-sm font-medium">Where it could head</h2>
        <span className="text-text-tertiary text-[11px]">not a prediction</span>
      </div>
      <div className="border-border bg-bg-surface/40 space-y-5 rounded-2xl border p-4">
        {reads.map((r) => (
          <CropRead key={r.crop} read={r} />
        ))}
      </div>
    </section>
  );
}
