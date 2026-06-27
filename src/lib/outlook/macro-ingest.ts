import "server-only";

import {
  macroLastFetched,
  readLatestMacroBundles,
  writeMacroBundle,
} from "./macro-cache";
import type { MacroBundle } from "./macro-types";
import { macroProvider } from "./providers/macro";

const MACRO_TTL_MS = 6 * 60 * 60 * 1000; // dollar/crude daily; weather a few times/day

function isStale(last: number | null): boolean {
  return last == null || Date.now() - last >= MACRO_TTL_MS;
}

/** Fetch + frame + store macro signals when stale. Never throws. */
export async function refreshMacro(force = false): Promise<number> {
  try {
    if (!force && !isStale(await macroLastFetched())) return 0;
    const bundles = await macroProvider.getBundles();
    let n = 0;
    for (const b of bundles) if (await writeMacroBundle(b)) n++;
    return n;
  } catch (e) {
    console.warn("[macro] refresh failed", e);
    return 0;
  }
}

export type MacroSnapshot = {
  bundles: MacroBundle[];
  fetchedAt: number | null;
};

export async function getMacroSnapshot(force = false): Promise<MacroSnapshot> {
  await refreshMacro(force);
  const [bundles, fetchedAt] = await Promise.all([
    readLatestMacroBundles(),
    macroLastFetched(),
  ]);
  return { bundles, fetchedAt };
}
