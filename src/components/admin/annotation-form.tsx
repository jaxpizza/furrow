"use client";

import { useState } from "react";

import { annotate } from "@/app/(admin)/admin/telemetry/actions";

const RATINGS = [
  { value: "good", label: "good", color: "#65a30d" },
  { value: "too-bullish", label: "too-bullish", color: "#65a30d" },
  { value: "too-bearish", label: "too-bearish", color: "#dc2626" },
  { value: "missed-something", label: "missed-something", color: "#d97706" },
  { value: "off", label: "off", color: "#dc2626" },
];

/** The tuning-loop closer: rate + note a generation. Posts to the admin-gated
 *  server action; the RLS insert policy is the real wall. */
export function AnnotationForm({ telemetryId }: { telemetryId: string }) {
  const [rating, setRating] = useState<string>("");
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await annotate(fd);
          setRating("");
        } finally {
          setPending(false);
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="telemetryId" value={telemetryId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex flex-wrap gap-1.5">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRating(r.value)}
            className={`rounded border px-2 py-1 text-[11px] ${
              rating === r.value
                ? "border-transparent text-black"
                : "border-[var(--border,#292524)] text-[var(--text-secondary,#a8a29e)] hover:border-[var(--text-tertiary,#78716c)]"
            }`}
            style={rating === r.value ? { background: r.color } : undefined}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        name="notes"
        rows={3}
        placeholder="Why? (what it read well / missed / over-emphasized)"
        className="w-full rounded border border-[var(--border,#292524)] bg-[var(--surface,#0c0a09)] p-2 text-[11px] outline-none focus:border-[var(--accent,#d97706)]"
      />
      <button
        type="submit"
        disabled={!rating || pending}
        className="rounded bg-[var(--accent,#d97706)] px-3 py-1 text-[11px] font-medium text-black disabled:opacity-40"
      >
        {pending ? "saving…" : "save assessment"}
      </button>
    </form>
  );
}
