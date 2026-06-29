import "server-only";

import {
  demandLastFetched,
  readLatestDemandBundles,
  writeDemandBundle,
} from "./demand-cache";
import { bucketStale, demandComplete } from "./manifest";
import { demandProvider } from "./providers/usda-demand";
import type { DemandBundle } from "./demand-types";

const DEMAND_TTL_MS = 12 * 60 * 60 * 1000; // export sales/ethanol refresh ~weekly

/** Fetch + frame + store demand data when stale — or sooner if a sub-source
 *  (e.g. FAS export sales) is missing, so the gap self-heals fast. Never throws. */
export async function refreshDemand(force = false): Promise<number> {
  try {
    if (!force) {
      const [last, cached] = await Promise.all([
        demandLastFetched(),
        readLatestDemandBundles(),
      ]);
      if (!bucketStale(last, demandComplete(cached), DEMAND_TTL_MS)) return 0;
    }
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
