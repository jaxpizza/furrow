import "server-only";

import { getActuals } from "./actuals";
import {
  cellKey,
  cornGdd,
  formatOrdinal,
  ORD_MAY1,
  ordinalOfDate,
  percentileOf,
  RAIN_SEVERITY_LABEL,
  rainSeverity,
} from "./calc";
import { getForecast } from "./forecast";
import { getNormals } from "./normals";
import type {
  CurrentConditions,
  FieldworkWindow,
  ForecastDay,
  GddRead,
  HourPoint,
  RainfallRead,
  RainPoint,
  SoilRead,
  StressFlag,
  WeatherDashboard,
  WeatherLocation,
} from "./types";

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function weekday(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export async function getWeatherDashboard(
  location: WeatherLocation,
  now: Date,
): Promise<WeatherDashboard> {
  const { lat, lon } = location;
  const key = cellKey(lat, lon);

  const [forecast, actuals, normals] = await Promise.all([
    getForecast(lat, lon, key),
    getActuals(lat, lon, key, now),
    getNormals(lat, lon, key),
  ]);

  const today = now.toISOString().slice(0, 10);

  // ── current conditions ──────────────────────────────────────────────────
  let current: CurrentConditions | null = null;
  const c = forecast?.current;
  if (c && num(c.temperature_2m) != null) {
    current = {
      tempF: c.temperature_2m as number,
      feelsF: (c.apparent_temperature as number) ?? (c.temperature_2m as number),
      humidity: (c.relative_humidity_2m as number) ?? 0,
      windMph: (c.wind_speed_10m as number) ?? 0,
      windDir: (c.wind_direction_10m as number) ?? 0,
      precipIn: (c.precipitation as number) ?? 0,
      weatherCode: (c.weather_code as number) ?? 0,
      asOf: (c.time as string) ?? now.toISOString(),
    };
  }

  // ── daily forecast (today → +6) + extended window for flags ─────────────
  const daily: ForecastDay[] = [];
  const dWindow: ForecastDay[] = []; // today..+13 for stress/fieldwork
  const d = forecast?.daily;
  if (d?.time) {
    const t = d.time as string[];
    const startIdx = Math.max(
      0,
      t.findIndex((x) => x >= today),
    );
    for (let i = startIdx; i < t.length; i++) {
      const day: ForecastDay = {
        date: t[i],
        weekday: weekday(t[i]),
        tmaxF: (d.temperature_2m_max?.[i] as number) ?? 0,
        tminF: (d.temperature_2m_min?.[i] as number) ?? 0,
        precipIn: (d.precipitation_sum?.[i] as number) ?? 0,
        precipProb: (d.precipitation_probability_max?.[i] as number) ?? 0,
        windMaxMph: (d.wind_speed_10m_max?.[i] as number) ?? 0,
        weatherCode: (d.weather_code?.[i] as number) ?? 0,
      };
      dWindow.push(day);
      if (daily.length < 7) daily.push(day);
    }
  }

  // ── hourly strip (next 24h) ──────────────────────────────────────────────
  const hourly: HourPoint[] = [];
  const h = forecast?.hourly;
  let soil: SoilRead | null = null;
  if (h?.time) {
    const ht = h.time as string[];
    const nowIso = now.toISOString().slice(0, 13); // to the hour
    let cur = ht.findIndex((x) => x.slice(0, 13) >= nowIso);
    if (cur < 0) cur = 0;
    for (let i = cur; i < Math.min(cur + 24, ht.length); i++) {
      hourly.push({
        iso: ht[i],
        hourLabel: new Date(`${ht[i]}:00Z`).toLocaleTimeString("en-US", {
          hour: "numeric",
          timeZone: "UTC",
        }),
        tempF: (h.temperature_2m?.[i] as number) ?? 0,
        precipProb: (h.precipitation_probability?.[i] as number) ?? 0,
        weatherCode: (h.weather_code?.[i] as number) ?? 0,
      });
    }

    // ── soil temp + plant-timing (corn ~50°F) ──────────────────────────────
    const soilArr = h.soil_temperature_6cm as (number | null)[] | undefined;
    const soilNow = num(soilArr?.[cur]);
    if (soilArr && soilNow != null) {
      const ago = num(soilArr[Math.max(0, cur - 120)]) ?? soilNow; // ~5 days
      const changeF = soilNow - ago;
      const trend = changeF > 1 ? "rising" : changeF < -1 ? "falling" : "steady";
      const state =
        soilNow >= 55
          ? "above"
          : soilNow >= 50
            ? "at_window"
            : soilNow >= 46 && trend === "rising"
              ? "approaching"
              : "below";
      const text =
        state === "at_window"
          ? "At the typical 50°F corn window."
          : state === "above"
            ? "Comfortably above the 50°F corn window."
            : state === "approaching"
              ? "Approaching the typical 50°F corn window."
              : "Below the typical 50°F corn window.";
      soil = {
        tempF: soilNow,
        depthLabel: "6 cm (~2.4 in)",
        trend,
        changeF,
        timing: { state, text },
      };
    }
  }

  // ── rainfall vs normal ───────────────────────────────────────────────────
  let rainfall: RainfallRead | null = null;
  if (actuals?.time?.length && normals) {
    const todayOrd0 = ordinalOfDate(today) - 1;

    // normal cumulative prefix by ordinal
    const normalCum = new Array(normals.precipNormal.length).fill(0);
    let nrun = 0;
    for (let i = 0; i < normals.precipNormal.length; i++) {
      nrun += normals.precipNormal[i];
      normalCum[i] = nrun;
    }

    // this-year cumulative series (by date, up to today)
    const series: RainPoint[] = [];
    let arun = 0;
    for (let i = 0; i < actuals.time.length; i++) {
      const ord0 = ordinalOfDate(actuals.time[i]) - 1;
      arun += actuals.precip[i] ?? 0;
      series.push({ ord: ord0, actual: arun, normal: normalCum[ord0] ?? 0 });
    }

    const ytdIn = arun;
    const past7In = actuals.precip
      .slice(-7)
      .reduce<number>((s, p) => s + (p ?? 0), 0);
    const normalIn = normalCum[todayOrd0] ?? 0;
    const deltaIn = ytdIn - normalIn;
    const samples = normals.yearlyCumPrecip
      .map((a) => a[todayOrd0])
      .filter((v) => typeof v === "number");
    const percentile = percentileOf(ytdIn, samples);
    const severity = rainSeverity(percentile);
    const dir = deltaIn < 0 ? "below" : "above";
    const headline = `${Math.abs(deltaIn).toFixed(1)} in ${dir} normal — ${RAIN_SEVERITY_LABEL[severity]}`;

    rainfall = {
      ytdIn,
      past7In,
      normalIn,
      deltaIn,
      percentile,
      severity,
      headline,
      series,
    };
  }

  // ── growing degree days (corn, base 50, since May 1) ────────────────────
  let gdd: GddRead | null = null;
  if (actuals?.time?.length && normals) {
    const todayOrd = ordinalOfDate(today);
    let accumulated = 0;
    for (let i = 0; i < actuals.time.length; i++) {
      const ord = ordinalOfDate(actuals.time[i]);
      const tx = actuals.tmax[i];
      const tn = actuals.tmin[i];
      if (ord >= ORD_MAY1 && ord <= todayOrd && tx != null && tn != null) {
        accumulated += cornGdd(tx, tn);
      }
    }
    let normal = 0;
    for (let ord = ORD_MAY1; ord <= todayOrd; ord++) {
      normal += cornGdd(
        normals.tmaxNormal[ord - 1] ?? 50,
        normals.tminNormal[ord - 1] ?? 50,
      );
    }
    const delta = accumulated - normal;
    gdd = {
      accumulated: Math.round(accumulated),
      normal: Math.round(normal),
      delta: Math.round(delta),
      seasonStart: "May 1",
      aheadBehind:
        Math.abs(delta) < 30 ? "on track" : delta > 0 ? "ahead" : "behind",
    };
  }

  // ── growing season (average frost-free window, from the normals) ────────
  let growingSeason: WeatherDashboard["growingSeason"] = null;
  if (normals && normals.frostSpringOrd && normals.frostFallOrd) {
    growingSeason = {
      springFrost: formatOrdinal(normals.frostSpringOrd),
      fallFrost: formatOrdinal(normals.frostFallOrd),
      springOrd: normals.frostSpringOrd,
      fallOrd: normals.frostFallOrd,
      frostFreeDays: normals.frostFallOrd - normals.frostSpringOrd,
      todayOrd: ordinalOfDate(today),
    };
  }

  // ── fieldwork window: longest near-term dry run ─────────────────────────
  const fieldwork = bestDryWindow(dWindow);

  // ── stress flags ─────────────────────────────────────────────────────────
  const stress = stressFlags(dWindow);

  return {
    location,
    current,
    rainfall,
    gdd,
    soil,
    growingSeason,
    daily,
    hourly,
    fieldwork,
    stress,
    degraded: !forecast,
  };
}

function bestDryWindow(days: ForecastDay[]): FieldworkWindow {
  let best: { start: number; len: number } | null = null;
  let run = 0;
  let runStart = 0;
  for (let i = 0; i < days.length; i++) {
    const dry = days[i].precipIn < 0.1 && days[i].precipProb < 40;
    if (dry) {
      if (run === 0) runStart = i;
      run++;
      if (!best || run > best.len) best = { start: runStart, len: run };
    } else {
      run = 0;
    }
  }
  if (!best || best.len < 2) return null;
  const s = days[best.start];
  const e = days[best.start + best.len - 1];
  return {
    startDate: s.date,
    endDate: e.date,
    days: best.len,
    label: `${best.len} dry days ${s.weekday}–${e.weekday}`,
  };
}

function stressFlags(days: ForecastDay[]): StressFlag[] {
  const flags: StressFlag[] = [];

  const heat = days.filter((d) => d.tmaxF >= 90);
  if (heat.length) {
    const alert = heat.some((d) => d.tmaxF >= 95);
    const peak = Math.max(...heat.map((d) => d.tmaxF));
    flags.push({
      kind: "heat",
      severity: alert ? "alert" : "watch",
      text: `Heat: ${heat.length} day${heat.length > 1 ? "s" : ""} ≥90°F (peak ${Math.round(peak)}°F)`,
    });
  }

  const freeze = days.filter((d) => d.tminF <= 32);
  if (freeze.length) {
    const low = Math.min(...freeze.map((d) => d.tminF));
    flags.push({
      kind: "freeze",
      severity: low <= 28 ? "alert" : "watch",
      text: `Frost risk: low ${Math.round(low)}°F ${freeze[0].weekday}`,
    });
  }

  const heavy = days.filter((d) => d.precipIn >= 1.5);
  if (heavy.length) {
    const max = Math.max(...heavy.map((d) => d.precipIn));
    flags.push({
      kind: "heavy_rain",
      severity: max >= 2.5 ? "alert" : "watch",
      text: `Heavy rain: up to ${max.toFixed(1)} in ${heavy[0].weekday}`,
    });
  }

  return flags;
}
