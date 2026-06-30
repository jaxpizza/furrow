import Link from "next/link";

import {
  listTelemetry,
  telemetryAggregates,
  type Aggregates,
} from "@/lib/telemetry/queries";

export const dynamic = "force-dynamic";

const SIGNALS = ["favorable", "mixed", "unfavorable"] as const;
const SIGNAL_COLOR: Record<string, string> = {
  favorable: "#65a30d",
  mixed: "#d97706",
  unfavorable: "#dc2626",
};

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** A horizontal frequency bar list (bucket → count). */
function FreqBars({ data, color }: { data: Record<string, number>; color?: string }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  if (!entries.length)
    return <p className="text-[11px] text-[var(--text-tertiary,#78716c)]">— none —</p>;
  return (
    <ul className="space-y-1">
      {entries.map(([k, v]) => (
        <li key={k} className="flex items-center gap-2 text-[11px]">
          <span className="w-40 shrink-0 truncate text-[var(--text-secondary,#a8a29e)]" title={k}>
            {k}
          </span>
          <span className="relative h-3 flex-1 rounded-sm bg-[var(--border,#292524)]/40">
            <span
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{ width: `${(v / max) * 100}%`, background: color ?? "var(--accent,#d97706)" }}
            />
          </span>
          <span className="w-7 shrink-0 text-right tabular-nums">{v}</span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-[var(--border,#292524)] bg-[var(--elevated,#1c1917)]/40 p-3">
      <h2 className="mb-2 flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary,#a8a29e)]">
        {title}
        {hint && <span className="font-normal normal-case text-[var(--text-tertiary,#78716c)]">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

function SignalDistribution({ agg }: { agg: Aggregates }) {
  const crops = Object.keys(agg.signalByCrop).sort();
  if (!crops.length)
    return <p className="text-[11px] text-[var(--text-tertiary,#78716c)]">— no data —</p>;
  return (
    <div className="space-y-2">
      {crops.map((crop) => {
        const dist = agg.signalByCrop[crop];
        const total = Object.values(dist).reduce((s, v) => s + v, 0);
        return (
          <div key={crop}>
            <div className="mb-0.5 flex justify-between text-[11px]">
              <span className="capitalize text-[var(--text-secondary,#a8a29e)]">{crop}</span>
              <span className="tabular-nums text-[var(--text-tertiary,#78716c)]">n={total}</span>
            </div>
            <div className="flex h-4 overflow-hidden rounded-sm">
              {SIGNALS.map((s) => {
                const v = dist[s] ?? 0;
                if (!v) return null;
                return (
                  <span
                    key={s}
                    className="flex items-center justify-center text-[9px] text-black/70"
                    style={{ width: `${(v / total) * 100}%`, background: SIGNAL_COLOR[s] }}
                    title={`${s}: ${v}`}
                  >
                    {v / total > 0.12 ? `${s[0].toUpperCase()}${v}` : ""}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FilterBar({ current }: { current: { crop?: string; signal?: string; trigger?: string } }) {
  const chip = (label: string, params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...params })) if (v) qs.set(k, v);
    const active =
      (params.crop !== undefined && params.crop === current.crop) ||
      (params.signal !== undefined && params.signal === current.signal) ||
      (params.trigger !== undefined && params.trigger === current.trigger);
    return (
      <Link
        href={`/admin/telemetry?${qs.toString()}`}
        className={`rounded px-1.5 py-0.5 text-[11px] ${
          active
            ? "bg-[var(--accent,#d97706)]/20 text-[var(--accent,#d97706)]"
            : "text-[var(--text-tertiary,#78716c)] hover:text-[var(--text-secondary,#a8a29e)]"
        }`}
      >
        {label}
      </Link>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      <span className="text-[var(--text-tertiary,#78716c)]">filter:</span>
      <span className="flex gap-1">
        {chip("corn", { crop: current.crop === "corn" ? undefined : "corn" })}
        {chip("soybean", { crop: current.crop === "soybean" ? undefined : "soybean" })}
      </span>
      <span className="text-[var(--border,#44403c)]">|</span>
      <span className="flex gap-1">
        {SIGNALS.map((s) => (
          <span key={s}>{chip(s, { signal: current.signal === s ? undefined : s })}</span>
        ))}
      </span>
      <span className="text-[var(--border,#44403c)]">|</span>
      <span className="flex gap-1">
        {["initial", "new-corpus", "max-age"].map((t) => (
          <span key={t}>{chip(t, { trigger: current.trigger === t ? undefined : t })}</span>
        ))}
      </span>
      {(current.crop || current.signal || current.trigger) && (
        <Link href="/admin/telemetry" className="text-[var(--accent,#d97706)] underline">
          clear
        </Link>
      )}
    </div>
  );
}

export default async function TelemetryConsole({
  searchParams,
}: {
  searchParams: Promise<{ crop?: string; signal?: string; trigger?: string }>;
}) {
  const sp = await searchParams;
  const filters = { crop: sp.crop, signal: sp.signal, trigger: sp.trigger };
  const [agg, feed] = await Promise.all([
    telemetryAggregates(),
    listTelemetry({ ...filters, limit: 150 }),
  ]);

  return (
    <div className="space-y-4">
      {/* ── aggregates ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel title="Signal distribution" hint={`window n=${agg.total}`}>
          <SignalDistribution agg={agg} />
        </Panel>
        <Panel title="Driver frequency" hint="bucket → factor">
          <FreqBars data={agg.driverFreq} color="#65a30d" />
        </Panel>
        <Panel title="Watched frequency" hint="bucket → context only">
          <FreqBars data={agg.watchedFreq} color="#78716c" />
        </Panel>
        <Panel title="Data-gap frequency" hint="per run">
          <FreqBars data={agg.gapFreq} color="#dc2626" />
        </Panel>
        <Panel title="Source failures" hint="absent this run">
          <FreqBars data={agg.failedSourceFreq} color="#dc2626" />
        </Panel>
        <Panel title="Latency · triggers">
          <dl className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <dt className="text-[var(--text-tertiary,#78716c)]">latency avg / p50 / max</dt>
              <dd className="tabular-nums">
                {agg.latency.avg ?? "—"} / {agg.latency.p50 ?? "—"} / {agg.latency.max ?? "—"} ms
              </dd>
            </div>
            {Object.entries(agg.triggerCounts).map(([t, c]) => (
              <div key={t} className="flex justify-between">
                <dt className="text-[var(--text-tertiary,#78716c)]">trigger · {t}</dt>
                <dd className="tabular-nums">{c}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      {/* ── feed ─────────────────────────────────────────────────── */}
      <section className="rounded border border-[var(--border,#292524)]">
        <div className="flex items-center justify-between border-b border-[var(--border,#292524)] px-3 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary,#a8a29e)]">
            Generations <span className="text-[var(--text-tertiary,#78716c)]">({feed.length})</span>
          </h2>
          <FilterBar current={filters} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border,#292524)] text-left text-[10px] uppercase text-[var(--text-tertiary,#78716c)]">
                <th className="px-3 py-1.5 font-medium">when</th>
                <th className="px-3 py-1.5 font-medium">crop</th>
                <th className="px-3 py-1.5 font-medium">signal</th>
                <th className="px-3 py-1.5 font-medium">trigger</th>
                <th className="px-3 py-1.5 font-medium">drivers</th>
                <th className="px-3 py-1.5 font-medium">gaps</th>
                <th className="px-3 py-1.5 font-medium">lat</th>
                <th className="px-3 py-1.5 font-medium">note</th>
              </tr>
            </thead>
            <tbody>
              {feed.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[var(--text-tertiary,#78716c)]">
                    No telemetry yet — generate a market read to capture the first record.
                  </td>
                </tr>
              )}
              {feed.map((r) => {
                const gapCount = Object.values(r.gaps ?? {}).reduce((s, l) => s + l.length, 0);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border,#292524)]/50 hover:bg-[var(--elevated,#1c1917)]/60"
                  >
                    <td className="px-3 py-1.5">
                      <Link href={`/admin/telemetry/${r.id}`} className="hover:text-[var(--accent,#d97706)]">
                        {ago(r.generated_at)} ago
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 capitalize">{r.crop}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] text-black"
                        style={{ background: SIGNAL_COLOR[r.signal] ?? "#78716c" }}
                      >
                        {r.signal}
                      </span>
                      {r.sample_data && <span className="ml-1 text-[var(--text-tertiary,#78716c)]">·sample</span>}
                    </td>
                    <td className="px-3 py-1.5 text-[var(--text-secondary,#a8a29e)]">{r.trigger}</td>
                    <td className="px-3 py-1.5 text-[var(--text-secondary,#a8a29e)]">
                      {(r.reasoning?.drivers ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {gapCount > 0 ? (
                        <span className="text-[#dc2626]">{gapCount}</span>
                      ) : (
                        <span className="text-[var(--text-tertiary,#78716c)]">0</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-[var(--text-tertiary,#78716c)]">
                      {r.latency_ms != null ? `${(r.latency_ms / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.annotation ? (
                        <span className="text-[var(--accent,#d97706)]" title={r.annotation.notes ?? ""}>
                          {r.annotation.rating}
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary,#78716c)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
