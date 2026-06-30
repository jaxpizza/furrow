import Link from "next/link";
import { notFound } from "next/navigation";

import { AnnotationForm } from "@/components/admin/annotation-form";
import { getTelemetry } from "@/lib/telemetry/queries";

export const dynamic = "force-dynamic";

const SIGNAL_COLOR: Record<string, string> = {
  favorable: "#65a30d",
  mixed: "#d97706",
  unfavorable: "#dc2626",
};
const DIR_COLOR: Record<string, string> = {
  up: "#65a30d",
  down: "#dc2626",
  neutral: "#78716c",
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-[var(--border,#292524)]">
      <h2 className="flex items-baseline justify-between border-b border-[var(--border,#292524)] bg-[var(--elevated,#1c1917)]/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary,#a8a29e)]">
        {title}
        {hint && <span className="font-normal normal-case text-[var(--text-tertiary,#78716c)]">{hint}</span>}
      </h2>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Json({ data, label }: { data: unknown; label: string }) {
  return (
    <details className="text-[11px]">
      <summary className="cursor-pointer text-[var(--text-tertiary,#78716c)] hover:text-[var(--text-secondary,#a8a29e)]">
        {label}
      </summary>
      <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--surface,#0c0a09)] p-2 text-[10px] leading-snug text-[var(--text-secondary,#a8a29e)]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

type OutShape = {
  signal?: string;
  summary?: string;
  factors?: { direction?: string; text?: string; claim?: string; source?: { label?: string; url?: string | null } }[];
  dominantTension?: { leans?: string; forceUp?: string; forceDown?: string } | null;
  watchedContext?: { bucket?: string; isDriver?: boolean; lean?: string; state?: string; emphasis?: string }[];
  watchItems?: { text?: string }[];
  macroContext?: { line?: string } | null;
};
type InShape = {
  seasonal?: { line?: string; season?: string; emphasis?: { bucket: string; emphasis: string }[] };
  buckets?: Record<string, { present: boolean; freshness: string; itemCount: number; items: unknown[] }>;
  gaps?: Record<string, string[]>;
  failedSources?: string[];
};

export default async function TelemetryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = await getTelemetry(id);
  if (!rec) notFound();

  const out = (rec.output ?? {}) as OutShape;
  const input = (rec.input_snapshot ?? {}) as InShape;
  const reasoning = rec.reasoning as {
    drivers?: string[];
    watched?: string[];
    perBucket?: { bucket: string; isDriver: boolean; lean: string; emphasis: string }[];
  } | null;
  const buckets = input.buckets ?? {};

  return (
    <div className="space-y-4">
      <Link href="/admin/telemetry" className="text-[11px] text-[var(--text-tertiary,#78716c)] hover:text-[var(--accent,#d97706)]">
        ← all generations
      </Link>

      {/* ── meta ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-[var(--border,#292524)] bg-[var(--elevated,#1c1917)]/40 px-3 py-2 text-[11px]">
        <span className="text-base font-semibold capitalize">{rec.crop}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] text-black"
          style={{ background: SIGNAL_COLOR[rec.signal] ?? "#78716c" }}
        >
          {rec.signal}
        </span>
        <Meta k="trigger" v={rec.trigger} />
        <Meta k="model" v={rec.model} />
        <Meta k="latency" v={rec.latency_ms != null ? `${(rec.latency_ms / 1000).toFixed(1)}s` : "—"} />
        <Meta k="generated" v={new Date(rec.generated_at).toISOString().replace("T", " ").slice(0, 16)} />
        <Meta k="hash" v={rec.corpus_hash.slice(0, 12)} />
        {rec.sample_data && <span className="text-[var(--accent,#d97706)]">sample-data</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── reasoning linkage ──────────────────────────────────── */}
        <Section title="Reasoning linkage" hint="driver vs watched">
          <div className="mb-2 flex flex-wrap gap-3 text-[11px]">
            <span>
              <span className="text-[var(--text-tertiary,#78716c)]">drivers:</span>{" "}
              <span className="text-[#65a30d]">{(reasoning?.drivers ?? []).join(", ") || "—"}</span>
            </span>
            <span>
              <span className="text-[var(--text-tertiary,#78716c)]">watched:</span>{" "}
              <span className="text-[var(--text-secondary,#a8a29e)]">{(reasoning?.watched ?? []).join(", ") || "—"}</span>
            </span>
          </div>
          <table className="w-full text-[11px]">
            <tbody>
              {(reasoning?.perBucket ?? []).map((b) => (
                <tr key={b.bucket} className="border-t border-[var(--border,#292524)]/40">
                  <td className="py-1 capitalize">{b.bucket}</td>
                  <td className="py-1">
                    <span className={b.isDriver ? "text-[#65a30d]" : "text-[var(--text-tertiary,#78716c)]"}>
                      {b.isDriver ? "DRIVER" : "watched"}
                    </span>
                  </td>
                  <td className="py-1 text-[var(--text-secondary,#a8a29e)]">lean {b.lean}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* ── annotation ─────────────────────────────────────────── */}
        <Section title="Assessment" hint="human judgment">
          {rec.annotations.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {rec.annotations.map((a) => (
                <li key={a.id} className="text-[11px]">
                  <span className="text-[var(--accent,#d97706)]">{a.rating}</span>{" "}
                  <span className="text-[var(--text-tertiary,#78716c)]">
                    {new Date(a.created_at).toISOString().slice(0, 10)}
                  </span>
                  {a.notes && <div className="text-[var(--text-secondary,#a8a29e)]">{a.notes}</div>}
                </li>
              ))}
            </ul>
          )}
          <AnnotationForm telemetryId={rec.id} />
        </Section>
      </div>

      {/* ── output ───────────────────────────────────────────────── */}
      <Section title="Output — the read">
        {out.summary && <p className="mb-3 text-[12px] leading-relaxed">{out.summary}</p>}
        <div className="space-y-1.5">
          {(out.factors ?? []).map((f, i) => (
            <div key={i} className="flex gap-2 text-[11px]">
              <span
                className="mt-0.5 h-fit shrink-0 rounded px-1 text-[9px] uppercase text-black"
                style={{ background: DIR_COLOR[f.direction ?? "neutral"] ?? "#78716c" }}
              >
                {f.direction ?? "—"}
              </span>
              <span>
                {f.text ?? f.claim}{" "}
                <span className="text-[var(--text-tertiary,#78716c)]">— {f.source?.label ?? "(unsourced)"}</span>
              </span>
            </div>
          ))}
        </div>
        {out.dominantTension && (
          <div className="mt-3 border-t border-[var(--border,#292524)]/40 pt-2 text-[11px]">
            <span className="text-[var(--text-tertiary,#78716c)]">tension leans </span>
            <span className="text-[var(--accent,#d97706)]">{out.dominantTension.leans}</span>
            {out.dominantTension.forceUp && (
              <div className="text-[#65a30d]">▲ {out.dominantTension.forceUp}</div>
            )}
            {out.dominantTension.forceDown && (
              <div className="text-[#dc2626]">▼ {out.dominantTension.forceDown}</div>
            )}
          </div>
        )}
        <div className="mt-3 space-y-1">
          <Json data={out.watchedContext} label="watched_context (per-bucket driver/watched + lean)" />
          <Json data={out.watchItems} label="watch_items" />
          <Json data={out.macroContext} label="macroContext" />
        </div>
      </Section>

      {/* ── input snapshot ───────────────────────────────────────── */}
      <Section title="Input snapshot — what the engine saw">
        {input.seasonal && (
          <p className="mb-3 text-[11px]">
            <span className="text-[var(--text-tertiary,#78716c)]">seasonal frame ({input.seasonal.season}):</span>{" "}
            {input.seasonal.line}
          </p>
        )}
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-[10px] uppercase text-[var(--text-tertiary,#78716c)]">
              <th className="py-1 font-medium">bucket</th>
              <th className="py-1 font-medium">present</th>
              <th className="py-1 font-medium">freshness</th>
              <th className="py-1 font-medium">items</th>
              <th className="py-1 font-medium">framed data</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(buckets).map(([name, b]) => (
              <tr key={name} className="border-t border-[var(--border,#292524)]/40 align-top">
                <td className="py-1.5 capitalize">{name}</td>
                <td className="py-1.5">
                  {b.present ? (
                    <span className="text-[#65a30d]">yes</span>
                  ) : (
                    <span className="text-[#dc2626]">absent</span>
                  )}
                </td>
                <td className="py-1.5 text-[var(--text-secondary,#a8a29e)]">{b.freshness}</td>
                <td className="py-1.5 tabular-nums">{b.itemCount}</td>
                <td className="py-1.5">
                  {b.items.length > 0 ? <Json data={b.items} label="view" /> : <span className="text-[var(--text-tertiary,#78716c)]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
          <span>
            <span className="text-[var(--text-tertiary,#78716c)]">gaps active:</span>{" "}
            {Object.values(input.gaps ?? {}).reduce((s, l) => s + l.length, 0)}
          </span>
          <span>
            <span className="text-[var(--text-tertiary,#78716c)]">sources absent:</span>{" "}
            {(input.failedSources ?? []).length}
          </span>
        </div>
        {(input.failedSources ?? []).length > 0 && (
          <ul className="mt-1 text-[10px] text-[#dc2626]">
            {(input.failedSources ?? []).map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── corpus text ──────────────────────────────────────────── */}
      <Section title="Corpus text" hint="exact text the model received">
        <details className="text-[11px]">
          <summary className="cursor-pointer text-[var(--text-tertiary,#78716c)] hover:text-[var(--text-secondary,#a8a29e)]">
            show corpus ({rec.corpus_text?.length ?? 0} chars)
          </summary>
          <pre className="mt-1 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--surface,#0c0a09)] p-2 text-[10px] leading-snug text-[var(--text-secondary,#a8a29e)]">
            {rec.corpus_text}
          </pre>
        </details>
      </Section>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <span>
      <span className="text-[var(--text-tertiary,#78716c)]">{k} </span>
      <span className="text-[var(--text-secondary,#a8a29e)]">{v}</span>
    </span>
  );
}
