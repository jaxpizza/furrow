import "server-only";

import {
  FORECAST_TTL_MS,
  isFresh,
  readForecastCache,
  writeForecastCache,
} from "./cache";
import { fetchForecast, type ForecastResponse } from "./open-meteo";

/** Cached raw forecast payload (current + hourly + daily). */
export async function getForecast(
  lat: number,
  lon: number,
  key: string,
): Promise<ForecastResponse | null> {
  const cached = await readForecastCache<ForecastResponse>(key);
  if (cached && isFresh(cached.ts, FORECAST_TTL_MS)) return cached.payload;

  const live = await fetchForecast(lat, lon);
  if (!live?.daily) return cached?.payload ?? null;

  await writeForecastCache(key, live);
  return live;
}
