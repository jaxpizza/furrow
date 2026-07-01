"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

import { EASE } from "./motion";

const CASH_LOW = 4.14;
const CASH_HIGH = 4.15;
const BREAKEVEN = 4.2;

/**
 * The hero's living centerpiece — a mock market-read card that EVOKES the product
 * without being a functional widget: it materializes on load, the signal dot
 * breathes, and the cash number counts up then ticks gently to feel like a live
 * market. It pairs the two halves of Furrow's promise in one frame — the honest
 * read AND where you stand vs. break-even. All motion holds still under
 * prefers-reduced-motion.
 */
export function MarketReadCard() {
  const reduce = useReducedMotion();
  const [cash, setCash] = useState(reduce ? CASH_LOW : 0);
  const [lit, setLit] = useState(false);

  // Count up on mount.
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, CASH_LOW, { duration: 1.2, delay: 0.5, ease: EASE, onUpdate: setCash });
    return () => controls.stop();
  }, [reduce]);

  // A gentle "it's live" tick — a single cent up and back, every few seconds.
  useEffect(() => {
    if (reduce) return;
    let high = false;
    const id = setInterval(() => {
      high = !high;
      const from = high ? CASH_LOW : CASH_HIGH;
      const to = high ? CASH_HIGH : CASH_LOW;
      setLit(true);
      const controls = animate(from, to, { duration: 0.55, ease: EASE, onUpdate: setCash });
      const t = setTimeout(() => setLit(false), 650);
      return () => {
        controls.stop();
        clearTimeout(t);
      };
    }, 3800);
    return () => clearInterval(id);
  }, [reduce]);

  const below = Math.max(0, BREAKEVEN - cash);

  const container = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 22, filter: "blur(10px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.9, ease: EASE, delay: 0.15, staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.35 },
    },
  };
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative w-full max-w-sm">
      {/* soft amber halo behind the card */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[2rem] opacity-60 blur-2xl"
        style={{ background: "radial-gradient(60% 55% at 60% 35%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)" }}
      />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--bg-surface)]/90 p-5 shadow-2xl shadow-black/50 backdrop-blur-sm">
        {/* top hairline highlight for a premium, instrument-panel edge */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />

        <motion.div variants={item} className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-text-tertiary uppercase">Corn</span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--neutral)]/25 bg-[var(--neutral)]/12 px-2 py-1 font-mono text-[11px] font-medium text-[var(--neutral)]">
            <SignalDot reduce={!!reduce} />
            Mixed / Hold
          </span>
        </motion.div>

        <motion.p variants={item} className="mt-3 text-[15px] leading-relaxed text-foreground">
          Corn firmed as tighter old-crop stocks offset a bigger-than-expected acreage number — demand stays firm on
          strong export pace.
        </motion.p>

        <motion.div variants={item} className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.12em] text-text-tertiary uppercase">Cash bid</div>
            <div className={`tnum mt-0.5 text-2xl font-semibold tracking-tight transition-colors duration-500 ${lit ? "text-[var(--pos)]" : "text-foreground"}`}>
              ${cash.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.12em] text-text-tertiary uppercase">Break-even</div>
            <div className="tnum mt-0.5 text-2xl font-semibold tracking-tight text-foreground">${BREAKEVEN.toFixed(2)}</div>
          </div>
        </motion.div>

        <motion.div variants={item} className="mt-3 flex items-center justify-between">
          <span className="tnum text-[13px] font-medium text-[var(--neg)]">${below.toFixed(2)} below break-even</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-text-tertiary uppercase">
            <LiveDot reduce={!!reduce} />
            Live
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SignalDot({ reduce }: { reduce: boolean }) {
  return (
    <span className="relative flex size-2">
      {!reduce && (
        <motion.span
          className="absolute inline-flex size-full rounded-full bg-[var(--neutral)]"
          animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
          transition={{ duration: 2.2, ease: "easeOut", repeat: Infinity }}
        />
      )}
      <span className="relative inline-flex size-2 rounded-full bg-[var(--neutral)]" />
    </span>
  );
}

function LiveDot({ reduce }: { reduce: boolean }) {
  return (
    <span className="relative flex size-1.5">
      {!reduce && (
        <motion.span
          className="absolute inline-flex size-full rounded-full bg-[var(--accent)]"
          animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
        />
      )}
      <span className="relative inline-flex size-1.5 rounded-full bg-[var(--accent)]" />
    </span>
  );
}
