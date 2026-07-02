"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

import { EASE } from "./motion";

type Mode = "simple" | "detailed";

const CASH_LOW = 4.14;
const CASH_HIGH = 4.15;
const BREAKEVEN = 4.2;

/**
 * The hero's interactive centerpiece — a Simple ⇄ Detailed toggle the visitor
 * controls. Flipping it MORPHS a browser-framed preview between the two real
 * modes: the calm /today read (the living market-read card, folded in) and the
 * data-rich dashboard/terminal. One honest engine, two faces. Real screenshots
 * drop into `simpleSrc` / `detailedSrc`; until then, living mocks stand in.
 * All heavy motion holds still under prefers-reduced-motion.
 */
export function ModeShowcase({
  simpleSrc = null,
  detailedSrc = null,
}: {
  /** Real /today screenshot — replaces the living Simple mock when provided. */
  simpleSrc?: string | null;
  /** Real dashboard/terminal screenshot — replaces the Detailed mock. */
  detailedSrc?: string | null;
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("simple");

  return (
    <div className="relative w-full max-w-md">
      {/* soft amber halo */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2.5rem] opacity-70 blur-3xl"
        style={{
          background: "radial-gradient(60% 55% at 55% 30%, color-mix(in oklab, var(--accent) 20%, transparent), transparent 70%)",
        }}
      />

      <Segmented mode={mode} onChange={setMode} reduce={!!reduce} />

      <Frame mode={mode}>
        <div className="relative h-[23rem] sm:h-[25rem]">
          <Layer active={mode === "simple"} reduce={!!reduce}>
            <SimplePreview reduce={!!reduce} src={simpleSrc} />
          </Layer>
          <Layer active={mode === "detailed"} reduce={!!reduce}>
            <DetailedPreview src={detailedSrc} />
          </Layer>
        </div>
      </Frame>

      <p className="text-text-tertiary mt-4 text-center font-mono text-[11px] tracking-wide">
        One engine, two faces —{" "}
        <span className="text-text-secondary">tap {mode === "simple" ? "Detailed" : "Simple"}</span> to feel it.
      </p>
    </div>
  );
}

/* ── The toggle — a segmented control with a sliding amber pill ──────────────── */
function Segmented({ mode, onChange, reduce }: { mode: Mode; onChange: (m: Mode) => void; reduce: boolean }) {
  return (
    <div
      role="tablist"
      aria-label="Preview mode"
      className="border-border/70 bg-[var(--bg-surface)]/70 mx-auto mb-4 grid w-full max-w-[19rem] grid-cols-2 gap-1 rounded-full border p-1 backdrop-blur-sm"
    >
      {(["simple", "detailed"] as Mode[]).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            className="relative rounded-full py-2 text-center text-[13px] font-semibold transition-colors"
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 rounded-full bg-[var(--accent)] shadow-sm"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative z-10 ${active ? "text-[#1b1403]" : "text-text-secondary"}`}>
              {m === "simple" ? "Simple" : "Detailed"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Browser frame — chrome + a URL that morphs with the mode ────────────────── */
function Frame({ mode, children }: { mode: Mode; children: React.ReactNode }) {
  const path = mode === "simple" ? "/today" : "/dashboard";
  return (
    <div className="border-border/80 bg-[var(--bg-surface)]/80 relative overflow-hidden rounded-2xl border shadow-2xl shadow-black/50 backdrop-blur-sm">
      <div aria-hidden className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="border-border/60 bg-[var(--bg-base)]/50 flex items-center gap-2 border-b px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <span className="bg-border size-2.5 rounded-full" />
          <span className="bg-border size-2.5 rounded-full" />
          <span className="bg-border size-2.5 rounded-full" />
        </span>
        <span className="bg-[var(--bg-elevated)]/70 text-text-tertiary mx-auto flex items-center rounded px-2 py-0.5 font-mono text-[10px]">
          furrowapp.xyz
          <AnimatePresence mode="wait">
            <motion.span
              key={path}
              className="text-[var(--accent)]"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {path}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
      {children}
    </div>
  );
}

/* ── A crossfading + morphing layer ─────────────────────────────────────────────
 * Driven by a compositor CSS transition, NOT a framer JS animation: it can't
 * stall on a busy main thread (the prod-robustness lesson from the hero fix), and
 * it resolves to its target even in a backgrounded tab — so the inactive layer is
 * never left half-visible over the active one. Opacity + a subtle scale only. */
function Layer({ active, reduce, children }: { active: boolean; reduce: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      className="absolute inset-0 transition-[opacity,transform] will-change-[opacity,transform]"
      style={{
        opacity: active ? 1 : 0,
        transform: active || reduce ? "scale(1)" : "scale(0.97)",
        transitionDuration: reduce ? "150ms" : "450ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

/* ── SIMPLE preview — the calm /today read (the living card, folded in) ──────── */
function SimplePreview({ reduce, src }: { reduce: boolean; src: string | null }) {
  // A motion value drives the count-up + live tick WITHOUT React re-renders — the
  // old setState-per-frame version saturated the main thread on load.
  const cash = useMotionValue(reduce ? CASH_LOW : 0);
  const cashText = useTransform(cash, (v) => `$${v.toFixed(2)}`);
  const belowText = useTransform(cash, (v) => `−$${Math.max(0, BREAKEVEN - v).toFixed(2)} below`);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const c = animate(cash, CASH_LOW, { duration: 1.1, delay: 0.4, ease: EASE });
    return () => c.stop();
  }, [reduce, cash]);

  useEffect(() => {
    if (reduce) return;
    let high = false;
    const id = setInterval(() => {
      high = !high;
      setLit(true);
      animate(cash, high ? CASH_HIGH : CASH_LOW, { duration: 0.55, ease: EASE });
      setTimeout(() => setLit(false), 650);
    }, 3800);
    return () => clearInterval(id);
  }, [reduce, cash]);

  if (src) return <FramedShot src={src} label="Simple — the /today screen" />;

  return (
    <div className="flex h-full flex-col justify-center gap-5 px-6 py-5 sm:px-7">
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary font-serif text-[15px]">Today&apos;s market</span>
        <span className="text-text-tertiary inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wide uppercase">
          <Breathe color="var(--accent)" reduce={reduce} size={1.5} /> Live
        </span>
      </div>

      <div>
        <div className="text-text-tertiary font-mono text-[11px] tracking-[0.14em] uppercase">Corn · cash</div>
        <div className="mt-1 flex items-end gap-3">
          <motion.span className={`tnum text-5xl font-semibold tracking-tight transition-colors duration-500 ${lit ? "text-[var(--pos)]" : "text-foreground"}`}>
            {cashText}
          </motion.span>
          <span className="tnum text-[var(--pos)] mb-1.5 text-sm font-medium">▲ +0.03</span>
        </div>
      </div>

      <p className="text-text-secondary text-[14px] leading-relaxed">
        <span className="text-[var(--neutral)] font-medium">Balanced.</span> Tighter old-crop stocks offset a bigger
        acreage number; demand stays firm on export pace.
      </p>

      <Spark className="text-[var(--accent)]" />

      <div className="border-border/60 flex items-center justify-between border-t pt-3.5 text-[12px]">
        <span className="text-text-tertiary">
          Break-even <span className="tnum text-foreground font-medium">${BREAKEVEN.toFixed(2)}</span>
        </span>
        <motion.span className="tnum text-[var(--neg)] font-medium">{belowText}</motion.span>
      </div>
    </div>
  );
}

/* ── The six analysis buckets (the app's real set) + their lean ─────────────────
 * Every read the engine produces weighs exactly these six buckets. The leans here
 * are a representative MIXED spread for the preview — not a live read — but the
 * bucket set and the up/down/neutral model mirror the real engine. */
type Lean = "up" | "down" | "neutral";

const LEAN_STYLE: Record<Lean, { glyph: string; word: string; color: string }> = {
  up: { glyph: "▲", word: "bull", color: "var(--pos)" },
  down: { glyph: "▼", word: "bear", color: "var(--neg)" },
  neutral: { glyph: "→", word: "neutral", color: "var(--neutral)" },
};

const BUCKETS: { name: string; lean: Lean }[] = [
  { name: "Supply", lean: "neutral" },
  { name: "Demand", lean: "up" },
  { name: "Money flow", lean: "down" },
  { name: "Macro", lean: "neutral" },
  { name: "Technicals", lean: "up" },
  { name: "Conditions", lean: "down" },
];

/* ── DETAILED preview — the data-rich instrument panel ──────────────────────── */
function DetailedPreview({ src }: { src: string | null }) {
  if (src) return <FramedShot src={src} label="Detailed — the dashboard / terminal" />;

  return (
    <div className="flex h-full flex-col gap-2 p-3.5">
      <div className="flex items-center gap-1.5">
        <span className="text-foreground font-mono text-[11px] font-semibold tracking-wide">CORN</span>
        <span className="rounded border border-[var(--neutral)]/25 bg-[var(--neutral)]/12 px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--neutral)]">
          MIXED / HOLD
        </span>
        <span className="text-text-tertiary ml-auto inline-flex items-center gap-1 font-mono text-[9px] tracking-wide uppercase">
          <span className="size-1.5 rounded-full bg-[var(--accent)]" /> Live
        </span>
      </div>

      {/* mini chart with support/resistance — break-even + basis folded in */}
      <div className="border-border/60 bg-[var(--bg-base)]/40 relative rounded-md border p-2">
        <div className="flex items-baseline justify-between">
          <span className="tnum text-foreground text-lg font-semibold">$4.14</span>
          <span className="tnum text-[var(--pos)] text-[11px] font-medium">▲ +0.07 (+1.6%)</span>
        </div>
        <div className="text-text-tertiary mt-0.5 flex items-center justify-between font-mono text-[9px]">
          <span>
            Break-even <span className="text-foreground">$4.20</span>
          </span>
          <span>
            Basis <span className="text-foreground">−22¢</span>
          </span>
        </div>
        <Spark className="text-[var(--accent)] mt-1" withLevels />
      </div>

      {/* SIX-BUCKET BREAKDOWN — the depth: every bucket weighed, with its lean */}
      <div className="space-y-1">
        <div className="text-text-tertiary flex items-center justify-between font-mono text-[8.5px] tracking-[0.12em] uppercase">
          <span>Six-bucket read</span>
          <span className="opacity-70">every factor weighed</span>
        </div>
        <div className="bg-border/70 grid grid-cols-3 gap-px overflow-hidden rounded-md">
          {BUCKETS.map((b) => {
            const s = LEAN_STYLE[b.lean];
            return (
              <div key={b.name} className="bg-[var(--bg-surface)] px-2 py-1.5">
                <div className="text-text-tertiary truncate font-mono text-[8.5px] tracking-wide uppercase">{b.name}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: s.color }}>
                  <span>{s.glyph}</span>
                  <span>{s.word}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* the deep read — the dominant tension */}
      <div className="border-border/60 mt-auto space-y-1 rounded-md border p-2 text-[10.5px] leading-snug">
        <div className="flex gap-1.5">
          <span className="text-[var(--pos)] shrink-0 font-semibold">▲</span>
          <span className="text-text-secondary">Tight old-crop stocks + export pace at 100% of target</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-[var(--neg)] shrink-0 font-semibold">▼</span>
          <span className="text-text-secondary">Bigger acreage + a comfortable old-crop build</span>
        </div>
      </div>
    </div>
  );
}

/* ── Shared bits ────────────────────────────────────────────────────────────── */
function FramedShot({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative h-full w-full">
      <Image src={src} alt={label} fill sizes="(max-width: 640px) 92vw, 28rem" className="object-cover object-top" />
    </div>
  );
}

function Breathe({ color, reduce, size = 2 }: { color: string; reduce: boolean; size?: number }) {
  return (
    <span className="relative flex" style={{ height: `${size * 4}px`, width: `${size * 4}px` }}>
      {!reduce && (
        <motion.span
          className="absolute inline-flex size-full rounded-full"
          style={{ background: color }}
          animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
          transition={{ duration: 2, ease: "easeOut", repeat: Infinity }}
        />
      )}
      <span className="relative inline-flex size-full rounded-full" style={{ background: color }} />
    </span>
  );
}

/** A calm amber trend line; `withLevels` adds dashed support/resistance for the
 *  detailed view. Decorative — it evokes the trend, it is not live data. */
function Spark({ className = "", withLevels = false }: { className?: string; withLevels?: boolean }) {
  return (
    <svg viewBox="0 0 240 64" className={`h-14 w-full ${className}`} fill="none" preserveAspectRatio="none" aria-hidden>
      {withLevels && (
        <>
          <line x1="0" y1="12" x2="240" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" />
          <line x1="0" y1="52" x2="240" y2="52" stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
        </>
      )}
      <path
        d="M0,44 L20,40 40,46 60,30 80,34 100,20 120,26 140,16 160,22 180,10 200,18 220,8 240,14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0,44 L20,40 40,46 60,30 80,34 100,20 120,26 140,16 160,22 180,10 200,18 220,8 240,14 L240,64 L0,64 Z"
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
  );
}
