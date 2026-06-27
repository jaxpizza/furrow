import "server-only";

import {
  cotLastFetched,
  readLatestCotBundles,
  writeCotBundle,
} from "./cot-cache";
import type { CotBundle } from "./cot-types";
import { moneyFlowProvider } from "./providers/cftc-cot";

const COT_TTL_MS = 12 * 60 * 60 * 1000; // weekly data — daily refresh is plenty

function isStale(last: number | null): boolean {
  return last == null || Date.now() - last >= COT_TTL_MS;
}

/** Fetch + frame + store the weekly COT when stale. Never throws. */
export async function refreshCot(force = false): Promise<number> {
  try {
    if (!force && !isStale(await cotLastFetched())) return 0;
    const bundles = await moneyFlowProvider.getBundles();
    let n = 0;
    for (const b of bundles) if (await writeCotBundle(b)) n++;
    return n;
  } catch (e) {
    console.warn("[cot] refresh failed", e);
    return 0;
  }
}

export type CotSnapshot = {
  bundles: CotBundle[];
  fetchedAt: number | null;
};

export async function getCotSnapshot(force = false): Promise<CotSnapshot> {
  await refreshCot(force);
  const [bundles, fetchedAt] = await Promise.all([
    readLatestCotBundles(),
    cotLastFetched(),
  ]);
  return { bundles, fetchedAt };
}
