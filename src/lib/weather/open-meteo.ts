import "server-only";

const UA = "Furrow/1.0 (farm weather dashboard; contact: support@furrow.app)";
const IMPERIAL =
  "temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto";

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      cache: "no-store", // our DB cache owns freshness
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export type ForecastResponse = {
  /** Seconds offset of the location's local time from UTC (timezone=auto). */
  utc_offset_seconds?: number;
  timezone?: string;
  current?: Record<string, number | string>;
  hourly?: Record<string, (number | string)[]>;
  daily?: Record<string, (number | string)[]>;
};

/** Current + hourly (incl. soil temp, with 5 past days for the trend) + daily
 *  out to 14 days. */
export function fetchForecast(
  lat: number,
  lon: number,
): Promise<ForecastResponse | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,soil_temperature_6cm` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code` +
    `&forecast_days=14&past_days=5&${IMPERIAL}`;
  return getJson(url) as Promise<ForecastResponse | null>;
}

export type ArchiveResponse = {
  daily?: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
  };
};

/** Daily archive (ERA5) for a date range — used for this-year actuals and for
 *  the 1991-2020 normals. The archive now extends to ~today (preliminary). */
export function fetchArchive(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<ArchiveResponse | null> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${start}&end_date=${end}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&${IMPERIAL}`;
  return getJson(url) as Promise<ArchiveResponse | null>;
}
