import type { Crop } from "@/lib/types/database";

/** The six engine buckets, in a fixed display order, with their stable keys
 *  (also used as element ids / scroll anchors for each bucket section). */
export const BUCKET_ORDER = [
  "supply",
  "demand",
  "moneyflow",
  "macro",
  "technicals",
  "conditions",
] as const;
export type BucketKey = (typeof BUCKET_ORDER)[number];

export const BUCKET_LABEL: Record<BucketKey, string> = {
  supply: "Supply",
  demand: "Demand",
  moneyflow: "Money flow",
  macro: "Macro",
  technicals: "Technicals",
  conditions: "Weather / Conditions",
};

/** Normalize a watched-context bucket name ("Money flow") to a stable key. */
export function bucketKey(name: string): BucketKey {
  const k = name.toLowerCase().replace(/[^a-z]/g, "");
  if (k.startsWith("money")) return "moneyflow";
  if (k.startsWith("cond") || k.startsWith("weather")) return "conditions";
  if (k.startsWith("tech")) return "technicals";
  if (k.startsWith("sup")) return "supply";
  if (k.startsWith("dem")) return "demand";
  if (k.startsWith("mac")) return "macro";
  return "supply";
}

export type Lean = "up" | "down" | "neutral";

/** Lean → farmer-facing label + colorblind-safe direction. "Supportive" lifts
 *  price, "Pressuring" weighs on it — never a price prediction, just the lean. */
export const LEAN_META: Record<
  Lean,
  { label: string; cls: string; dir: "up" | "down" | "flat" }
> = {
  up: { label: "Supportive", cls: "text-[var(--pos)]", dir: "up" },
  down: { label: "Pressuring", cls: "text-[var(--neg)]", dir: "down" },
  neutral: { label: "Neutral", cls: "text-text-tertiary", dir: "flat" },
};

/** A relative "updated N ago" from an ISO/epoch, computed server-side so it's
 *  hydration-safe. Honest freshness is app-wide. */
export function freshnessLabel(iso: string | number | null, nowMs: number): string {
  if (iso == null) return "—";
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const m = Math.round((nowMs - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fmtPctSigned(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function fmtSigned(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
}

export const CROP_LABEL: Record<Crop, string> = { corn: "Corn", soybean: "Soybeans" };
