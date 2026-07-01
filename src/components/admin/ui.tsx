import type { ReactNode } from "react";

// Shared primitives for the platform-admin console. Same utilitarian, monospaced
// palette as the telemetry console (warm stone tones, CSS vars with hex fallbacks
// so the instrument stays readable even if app CSS loads late).

export function ago(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function Panel({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded border border-[var(--border,#292524)] bg-[var(--elevated,#1c1917)]/40 p-3">
      <h2 className="mb-2 flex items-baseline justify-between gap-2 text-[11px] font-semibold tracking-wide uppercase text-[var(--text-secondary,#a8a29e)]">
        {title}
        {hint && <span className="font-normal normal-case text-[var(--text-tertiary,#78716c)]">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="rounded border border-[var(--border,#292524)] bg-[var(--elevated,#1c1917)]/40 px-3 py-2">
      <div className="text-[10px] tracking-wide uppercase text-[var(--text-tertiary,#78716c)]">{label}</div>
      <div className="tabular-nums text-lg font-semibold" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-[var(--text-tertiary,#78716c)]">{sub}</div>}
    </div>
  );
}

/** A yes/no setup pill — the "has the tester populated this?" signal. */
export function YesNo({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]"
      style={{
        borderColor: ok ? "#65a30d55" : "var(--border,#292524)",
        color: ok ? "#84cc16" : "var(--text-tertiary,#78716c)",
        background: ok ? "#65a30d18" : "transparent",
      }}
    >
      <span aria-hidden>{ok ? "✓" : "○"}</span>
      {label}
    </span>
  );
}

