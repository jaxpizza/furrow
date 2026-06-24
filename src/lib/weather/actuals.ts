import "server-only";

import {
  ACTUALS_TTL_MS,
  isFresh,
  readActualsCache,
  writeActualsCache,
} from "./cache";
import { fetchArchive } from "./open-meteo";

export type Actuals = {
  time: string[];
  tmax: (number | null)[];
  tmin: (number | null)[];
  precip: (number | null)[];
};

/** This-season daily actuals (Jan 1 → today) from the ERA5 archive. */
export async function getActuals(
  lat: number,
  lon: number,
  key: string,
  now: Date,
): Promise<Actuals | null> {
  const year = now.getUTCFullYear();
  const cached = await readActualsCache<Actuals>(key, year);
  if (cached && isFresh(cached.ts, ACTUALS_TTL_MS)) return cached.payload;

  const end = now.toISOString().slice(0, 10);
  const arc = await fetchArchive(lat, lon, `${year}-01-01`, end);
  if (!arc?.daily?.time?.length) return cached?.payload ?? null;

  const actuals: Actuals = {
    time: arc.daily.time,
    tmax: arc.daily.temperature_2m_max,
    tmin: arc.daily.temperature_2m_min,
    precip: arc.daily.precipitation_sum,
  };
  await writeActualsCache(key, year, actuals);
  return actuals;
}
