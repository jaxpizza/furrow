import "server-only";

import {
  demandLastFetched,
  readLatestDemandBundles,
  writeDemandBundle,
} from "./demand-cache";
import { demandProvider } from "./providers/usda-demand";
import type { DemandBundle } from "./demand-types";

const DEMAND_TTL_MS = 12 * 60 * 60 * 1000; // export sales/ethanol refresh ~weekly

function isStale(last: number | null): boolean {
  return last == null || Date.now() - last >= DEMAND_TTL_MS;
}

/** Fetch + frame + store demand data when stale. Never throws. */
export async function refreshDemand(force = false): Promise<number> {
  try {
    if (!force && !isStale(await demandLastFetched())) return 0;
    const bundles = await demandProvider.getBundles();
    let n = 0;
    for (const b of bundles) if (await writeDemandBundle(b)) n++;
    return n;
  } catch (e) {
    console.warn("[demand] refresh failed", e);
    return 0;
  }
}

export type DemandSnapshot = {
  bundles: DemandBundle[];
  fetchedAt: number | null;
};

export async function getDemandSnapshot(force = false): Promise<DemandSnapshot> {
  await refreshDemand(force);
  const [bundles, fetchedAt] = await Promise.all([
    readLatestDemandBundles(),
    demandLastFetched(),
  ]);
  return { bundles, fetchedAt };
}
