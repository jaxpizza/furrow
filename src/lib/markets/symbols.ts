import type { Crop } from "@/lib/types/database";

import type { Symbol } from "./types";

/** Crop (our DB enum) ↔ internal market symbol ↔ API Ninjas `name` param. */
export const CROP_TO_SYMBOL: Record<Crop, Symbol> = {
  corn: "corn",
  soybean: "soybean",
};

export const SYMBOL_TO_CROP: Record<Symbol, Crop> = {
  corn: "corn",
  soybean: "soybean",
};

/** API Ninjas commodity `name` values. soybeans → "soybean". */
export const SYMBOL_TO_NINJAS_NAME: Record<Symbol, string> = {
  corn: "corn",
  soybean: "soybean",
};

export const CROP_LABEL: Record<Crop, string> = {
  corn: "Corn",
  soybean: "Soybeans",
};

// CME contract months by crop, as [monthIndex 0-11, code, label].
const CORN_MONTHS = [
  [2, "H", "Mar"],
  [4, "K", "May"],
  [6, "N", "Jul"],
  [8, "U", "Sep"],
  [11, "Z", "Dec"],
] as const;

const SOY_MONTHS = [
  [0, "F", "Jan"],
  [2, "H", "Mar"],
  [4, "K", "May"],
  [6, "N", "Jul"],
  [7, "Q", "Aug"],
  [8, "U", "Sep"],
  [10, "X", "Nov"],
] as const;

export type ContractMonth = { code: string; label: string; year: number };

/**
 * The front contract month plus the next two, given "now". Used to label the
 * futures strip. The live quote maps to the front month; the next months are
 * shown for context (per-contract prices need a richer feed than the free tier).
 */
export function contractMonths(
  symbol: Symbol,
  now: Date,
): [ContractMonth, ContractMonth, ContractMonth] {
  const months = symbol === "corn" ? CORN_MONTHS : SOY_MONTHS;
  const m = now.getUTCMonth();
  const y = now.getUTCFullYear();

  // Build a rolling 2-year window of contracts and pick the first 3 that are
  // at or after the current month.
  const all: ContractMonth[] = [];
  for (const yr of [y, y + 1]) {
    for (const [, code, label] of months) {
      all.push({ code, label, year: yr });
    }
  }
  const upcoming = all.filter(
    (c) =>
      c.year > y ||
      (c.year === y &&
        (months.find((mm) => mm[1] === c.code)?.[0] ?? 0) >= m),
  );
  const picks = (upcoming.length >= 3 ? upcoming : all).slice(0, 3);
  return [picks[0], picks[1], picks[2]];
}

export function formatContractMonth(c: ContractMonth): string {
  return `${c.label} ’${String(c.year).slice(2)}`;
}
