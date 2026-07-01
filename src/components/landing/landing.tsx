"use client";

import Link from "next/link";
import { ArrowRight, CloudSun, LineChart, Sprout, Wallet } from "lucide-react";

import { MarketReadCard } from "./market-read-card";
import { Reveal, RevealGroup, RevealItem } from "./motion";

export function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <Nav />
      <Hero />
      <Tension />
      <Features />
      <Honesty />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ── Brand mark ─────────────────────────────────────────────────────────────── */
function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-7 items-center justify-center rounded-[9px] bg-[var(--accent)] text-[#1b1403] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
        <path d="M4 8c3-2.6 5-2.6 8 0s5 2.6 8 0" />
        <path d="M4 14c3-2.6 5-2.6 8 0s5 2.6 8 0" />
      </svg>
    </span>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <Mark />
      <span className="text-[17px] font-semibold tracking-tight">Furrow</span>
    </Link>
  );
}

/* ── Nav ────────────────────────────────────────────────────────────────────── */
function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="rounded-full border border-border/60 bg-[var(--bg-base)]/70 px-3 py-1.5 backdrop-blur-md sm:px-4">
          <Wordmark />
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-[var(--bg-base)]/70 p-1 pl-3 backdrop-blur-md sm:gap-3 sm:pl-4">
          <Link href="/sign-in" className="text-text-secondary hover:text-foreground px-2 text-sm font-medium transition-colors">
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-sm font-semibold text-[#1b1403] transition-transform hover:scale-[1.03] active:scale-95 sm:px-4"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative isolate">
      <Atmosphere />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-32 pb-20 sm:pt-40 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-44 lg:pb-28">
        {/* left — the message */}
        <div>
          <RevealGroup>
            <RevealItem>
              <span className="text-text-secondary inline-flex items-center gap-2 rounded-full border border-border/70 bg-[var(--bg-surface)]/60 px-3 py-1 font-mono text-[11px] tracking-wide uppercase">
                <span className="size-1.5 rounded-full bg-[var(--pos)]" />
                For corn &amp; soybean farmers
              </span>
            </RevealItem>
            <RevealItem>
              <h1 className="font-serif mt-6 text-[clamp(2.6rem,7vw,4.6rem)] leading-[0.98] font-medium tracking-[-0.02em]">
                Know where the market stands.
                <br />
                And where <em className="text-[var(--accent)] italic">you</em> stand.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="text-text-secondary mt-6 max-w-lg text-lg leading-relaxed">
                An honest read on the corn &amp; soybean markets, tied to your own break-even. Built for Corn Belt
                farmers — no hype, no price predictions, no one telling you what to do.
              </p>
            </RevealItem>
            <RevealItem>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-base font-semibold text-[#1b1403] shadow-lg shadow-[var(--accent)]/10 transition-transform hover:scale-[1.03] active:scale-95"
                >
                  Get started free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="/sign-in" className="text-text-secondary hover:text-foreground px-3 py-3 text-base font-medium transition-colors">
                  Log in
                </Link>
              </div>
            </RevealItem>
            <RevealItem>
              <p className="text-text-tertiary mt-6 font-mono text-[11px] tracking-wide">
                Free to start · Corn &amp; soybeans · Central Illinois &amp; the Corn Belt
              </p>
            </RevealItem>
          </RevealGroup>
        </div>

        {/* right — the living card */}
        <div className="flex justify-center lg:justify-end">
          <MarketReadCard />
        </div>
      </div>
    </section>
  );
}

/** Warm amber glow + a faint furrow-row field behind the hero. */
function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-24 right-[-10%] h-[42rem] w-[42rem] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 12%, transparent), transparent)" }}
      />
      <div
        className="absolute -bottom-10 left-[-10%] h-[30rem] w-[30rem] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--pos) 8%, transparent), transparent)" }}
      />
      {/* furrow rows receding to a horizon */}
      <div
        className="absolute inset-x-0 bottom-0 h-72"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent 0 26px, color-mix(in oklab, var(--accent) 7%, transparent) 26px 27px)",
          maskImage: "linear-gradient(to top, black, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent 85%)",
        }}
      />
    </div>
  );
}

/* ── Section shell ──────────────────────────────────────────────────────────── */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[var(--accent)] font-mono text-[11px] font-medium tracking-[0.16em] uppercase">{children}</span>
  );
}

/* ── The tension ────────────────────────────────────────────────────────────── */
function Tension() {
  const items = [
    { k: "Hype", t: "“Sure-thing” calls and buy signals from people with something to sell." },
    { k: "A firehose", t: "More reports, charts, and hot takes than anyone can read before chores." },
    { k: "Locked away", t: "The analysis that's actually useful sits behind advisory fees you can't justify." },
  ];
  return (
    <section className="relative border-t border-border/50 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <Eyebrow>The problem</Eyebrow>
          <h2 className="font-serif mt-4 max-w-2xl text-[clamp(1.9rem,4.2vw,2.9rem)] leading-[1.05] font-medium tracking-[-0.01em]">
            Good market information is hype, a firehose, or locked away.
          </h2>
        </Reveal>
        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-3" delay={0.05}>
          {items.map((it) => (
            <RevealItem key={it.k}>
              <div className="h-full rounded-xl border border-border/70 bg-[var(--bg-surface)]/50 p-5">
                <div className="font-mono text-xs tracking-wide text-[var(--neg)] uppercase">{it.k}</div>
                <p className="text-text-secondary mt-2 text-[15px] leading-relaxed">{it.t}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
        <Reveal delay={0.1}>
          <p className="mt-12 max-w-2xl text-lg leading-relaxed text-foreground">
            And underneath all of it, you&apos;re running the real numbers in your head — today&apos;s bid against what
            it cost you to grow the crop.{" "}
            <span className="text-[var(--accent)]">Furrow does that math, in plain sight.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Features ───────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: LineChart,
    kicker: "Honest market read",
    title: "A straight read, not a hot take.",
    body: "Every day, a plain-language read on corn and soybeans: what moved, why, and which way the competing forces lean. Sourced to real USDA data and the news the desk actually watches — never a made-up price target.",
    shot: "Dashboard — “The market read” (Corn & Soy signal + one plain-language sentence, with “see full read”)",
  },
  {
    icon: Wallet,
    kicker: "Your break-even, always",
    title: "The moment today's price is profitable.",
    body: "Log your costs once. Furrow turns them into your break-even per bushel and shows — on every screen — whether today's cash bid clears it. Whole-farm costs get split across crops by acreage, so the number stays honest.",
    shot: "Inputs — “Your break-even $4.20/bu” headline + the spending-by-category summary",
  },
  {
    icon: Sprout,
    kicker: "Your whole position",
    title: "What you've grown, sold, and still have riding.",
    body: "Bushels on hand valued at today's cash, percent sold, and what's still exposed to the market — your operation's position in one glance, tied straight to your break-even.",
    shot: "Dashboard — holdings value ($526,995 · bushels on hand · % sold · above/below break-even)",
  },
  {
    icon: CloudSun,
    kicker: "Per-field weather that matters",
    title: "The weather questions you actually ask.",
    body: "Fieldwork windows, rainfall vs. normal, growing degree days, and your field's frost dates — per field from its own coordinates, not a generic forecast for the nearest city.",
    shot: "Weather — rainfall vs. normal + growing degree days + the 7-day fieldwork window",
  },
];

function Features() {
  return (
    <section className="relative border-t border-border/50 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <Eyebrow>What Furrow does</Eyebrow>
          <h2 className="font-serif mt-4 max-w-2xl text-[clamp(1.9rem,4.2vw,2.9rem)] leading-[1.05] font-medium tracking-[-0.01em]">
            Four things, done plainly and done well.
          </h2>
        </Reveal>

        <div className="mt-16 space-y-20 sm:space-y-28">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.kicker} feature={f} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ feature, flip }: { feature: (typeof FEATURES)[number]; flip: boolean }) {
  const Icon = feature.icon;
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <Reveal className={flip ? "lg:order-2" : ""} y={30}>
        <div>
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]">
              <Icon className="size-4" />
            </span>
            <span className="text-[var(--accent)] font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
              {feature.kicker}
            </span>
          </span>
          <h3 className="font-serif mt-5 text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-medium tracking-[-0.01em]">
            {feature.title}
          </h3>
          <p className="text-text-secondary mt-4 max-w-md text-[16px] leading-relaxed">{feature.body}</p>
        </div>
      </Reveal>
      <Reveal className={flip ? "lg:order-1" : ""} delay={0.08} y={30}>
        <Shot label={feature.shot} />
      </Reveal>
    </div>
  );
}

/** A premium, clearly-labeled placeholder for a real app screenshot. */
function Shot({ label }: { label: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border/80 bg-[var(--bg-surface)]/70 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-border/60 bg-[var(--bg-base)]/50 px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </span>
        <span className="text-text-tertiary mx-auto truncate rounded bg-[var(--bg-elevated)]/70 px-2 py-0.5 font-mono text-[10px]">
          furrowapp.xyz
        </span>
      </div>
      <div className="relative flex aspect-[16/10] items-center justify-center p-6">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "repeating-linear-gradient(to bottom, transparent 0 20px, color-mix(in oklab, var(--accent) 4%, transparent) 20px 21px)",
          }}
        />
        <div className="relative max-w-xs text-center">
          <div className="text-text-tertiary mx-auto mb-3 inline-flex size-10 items-center justify-center rounded-lg border border-dashed border-border">
            <LineChart className="size-4" />
          </div>
          <div className="text-text-tertiary font-mono text-[10px] tracking-[0.16em] uppercase">Screenshot</div>
          <p className="text-text-secondary mt-1.5 text-xs leading-relaxed">{label}</p>
        </div>
      </div>
    </figure>
  );
}

/* ── The honesty moment (the differentiator) ────────────────────────────────── */
function Honesty() {
  return (
    <section className="relative border-t border-border/50 py-28 sm:py-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(60% 50% at 50% 40%, color-mix(in oklab, var(--accent) 7%, transparent), transparent 75%)" }}
      />
      <div className="mx-auto max-w-4xl px-5 text-center">
        <Reveal>
          <Eyebrow>The line we won&apos;t cross</Eyebrow>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="font-serif mx-auto mt-6 max-w-3xl text-[clamp(2.1rem,5.2vw,3.6rem)] leading-[1.06] font-medium tracking-[-0.015em]">
            Furrow will never tell you to{" "}
            <Struck>buy</Struck>, <Struck>sell</Struck>, or <Struck>hold</Struck>.
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="text-text-secondary mx-auto mt-8 max-w-xl text-lg leading-relaxed">
            It will never predict a price. It hands you the facts — sourced — and your own numbers, and it trusts that
            the call is yours. For a crop you planted, in a market you know, that&apos;s the only honest way to build a
            tool.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-12 inline-flex flex-col items-center">
            <span className="font-serif text-[var(--accent)] text-[clamp(2rem,5vw,3rem)] leading-none italic">
              You decide.
            </span>
            <span className="mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[var(--accent)]/60 to-transparent" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Struck({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block text-text-tertiary">
      {children}
      <span
        aria-hidden
        className="absolute inset-x-[-4%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--neg)]/80"
      />
    </span>
  );
}

/* ── Final CTA ──────────────────────────────────────────────────────────────── */
function FinalCta() {
  return (
    <section className="relative isolate border-t border-border/50 py-28 sm:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{ background: "radial-gradient(55% 60% at 50% 100%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%)" }}
      />
      <div className="mx-auto max-w-3xl px-5 text-center">
        <Reveal>
          <h2 className="font-serif text-[clamp(2.4rem,6vw,4rem)] leading-[1] font-medium tracking-[-0.02em]">
            See where you stand.
          </h2>
        </Reveal>
        <Reveal delay={0.06}>
          <p className="text-text-secondary mx-auto mt-6 max-w-md text-lg leading-relaxed">
            Free to start. Built for corn and soybeans in the Corn Belt.
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-9 flex flex-col items-center gap-4">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-8 py-4 text-lg font-semibold text-[#1b1403] shadow-xl shadow-[var(--accent)]/15 transition-transform hover:scale-[1.03] active:scale-95"
            >
              Get started free
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-text-tertiary text-sm">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-text-secondary hover:text-foreground underline-offset-4 transition-colors hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-border/60 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark />
          <p className="text-text-secondary mt-3 max-w-xs text-sm leading-relaxed">
            An honest read on your market. And your break-even.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 text-sm sm:items-end">
          <a href="mailto:hello@furrowapp.xyz" className="text-text-secondary hover:text-foreground transition-colors">
            hello@furrowapp.xyz
          </a>
          <span className="text-text-tertiary font-mono text-[11px] tracking-wide">
            © {new Date().getFullYear()} Furrow · No hype. No predictions. You decide.
          </span>
        </div>
      </div>
    </footer>
  );
}
