import "server-only";

import { ordinal } from "@/lib/weather/calc";
import { getNormals } from "@/lib/weather/normals";
import { fetchArchive, fetchForecast } from "@/lib/weather/open-meteo";

import type { MacroBundle, MacroFrame, MacroProvider } from "../macro-types";

const NINJAS = "https://api.api-ninjas.com/v1/commodityprice";
const FRANKFURTER = "https://api.frankfurter.dev/v1";
const TIMEOUT_MS = 25_000;

// Representative Corn Belt points (the MARKET weather region, not a single farm).
const CORN_BELT: { st: string; lat: number; lon: number }[] = [
  { st: "IL", lat: 40.0, lon: -89.5 },
  { st: "IA", lat: 42.0, lon: -93.6 },
  { st: "IN", lat: 40.0, lon: -86.3 },
  { st: "NE", lat: 40.8, lon: -96.7 },
];

// DXY basket weights (ICE US Dollar Index).
const DXY_K = 50.14348112;

/**
 * Macro-bucket provider (Phase D). Crude oil (API Ninjas), US Dollar Index
 * (computed from ECB rates via Frankfurter — keyless), and Corn Belt market
 * weather (Open-Meteo aggregate). FAULT-TOLERANT per signal: one dead source is
 * logged and skipped, the others still return. These are second-order signals —
 * the frames carry the weight hint so the synthesis keeps them below core
 * supply/demand.
 */
export class MacroDataProvider implements MacroProvider {
  readonly name = "macro";
  private readonly ninjasKey = process.env.API_NINJAS_KEY;

  async getBundles(): Promise<MacroBundle[]> {
    const settled = await Promise.allSettled([
      this.crude(),
      this.dollar(),
      this.macroWeather(),
    ]);
    const out: MacroBundle[] = [];
    settled.forEach((r) => {
      if (r.status === "rejected") console.warn("[macro] signal failed", r.reason);
      else if (r.value) out.push(r.value);
    });
    return out;
  }

  // ── Crude oil (API Ninjas) ─────────────────────────────────────────────────
  private async crude(): Promise<MacroBundle | null> {
    if (!this.ninjasKey) return null;
    const data = (await getJson(`${NINJAS}?name=crude_oil`, {
      "X-Api-Key": this.ninjasKey,
    })) as {
      price?: number | string;
      change_24h?: number | string;
      change_24h_percent?: number | string;
      updated?: number;
    } | null;
    const price = num(data?.price);
    if (price == null) return null;
    const d = num(data?.change_24h);
    const dPct = num(data?.change_24h_percent);
    const dir = dPct == null ? "neutral" : dPct > 0.5 ? "up" : dPct < -0.5 ? "down" : "neutral";
    const frame: MacroFrame = {
      label: "WTI crude oil",
      value: round(price, 2),
      unit: "$/bbl",
      deltaPrior: d != null ? round(d, 2) : null,
      deltaPriorPct: dPct != null ? round(dPct, 2) : null,
      trend: dPct == null ? null : `${dPct >= 0 ? "+" : ""}${round(dPct, 1)}% on the day`,
      direction: dir,
      chain:
        "crude up → firmer ethanol economics + higher input/energy costs → mild support for corn; crude down → the reverse (esp. corn via ethanol)",
      note: "Second-order signal (MEDIUM weight) — a routine daily move should not drive the read. Multi-week trend accrues as daily readings are stored.",
    };
    return {
      signalType: "crude",
      asOf: data?.updated ? new Date(data.updated * 1000).toISOString().slice(0, 10) : todayUtc(),
      sourceUrl: "https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm",
      weight: "medium",
      frames: [frame],
    };
  }

  // ── US Dollar Index (Frankfurter / ECB — keyless) ──────────────────────────
  private async dollar(): Promise<MacroBundle | null> {
    const sym = "EUR,JPY,GBP,CAD,SEK,CHF";
    const latest = (await getJson(`${FRANKFURTER}/latest?base=USD&symbols=${sym}`)) as
      | { date?: string; rates?: Record<string, number> }
      | null;
    if (!latest?.rates) return null;
    const now = dxy(latest.rates);
    if (now == null) return null;

    // ~4 weeks ago for the trend
    const past = isoDaysAgo(latest.date ?? todayUtc(), 28);
    const histResp = (await getJson(`${FRANKFURTER}/${past}?base=USD&symbols=${sym}`)) as
      | { rates?: Record<string, number> }
      | null;
    const prior = histResp?.rates ? dxy(histResp.rates) : null;
    const d = prior != null ? now - prior : null;
    const dPct = prior != null && prior !== 0 ? (d! / prior) * 100 : null;
    const dir = dPct == null ? "neutral" : dPct > 0.5 ? "down" : dPct < -0.5 ? "up" : "neutral";

    const frame: MacroFrame = {
      label: "US Dollar Index (DXY)",
      value: round(now, 2),
      unit: "index",
      deltaPrior: d != null ? round(d, 2) : null,
      deltaPriorPct: dPct != null ? round(dPct, 2) : null,
      trend:
        dPct == null
          ? null
          : `${Math.abs(round(dPct, 1))}% ${dPct >= 0 ? "stronger" : "weaker"} over ~4 weeks → dollar ${dPct >= 0 ? "strengthening" : "weakening"}`,
      direction: dir,
      chain:
        "stronger dollar → US grain pricier abroad → export headwind → pressuring (down); weaker dollar → cheaper exports → supportive (up)",
      note: "Slow, second-order signal (MEDIUM weight). DXY computed from ECB daily reference rates (Frankfurter) — a directional read, not a live tick.",
    };
    return {
      signalType: "dollar",
      asOf: latest.date ?? todayUtc(),
      sourceUrl: "https://www.frankfurter.dev/",
      weight: "medium",
      frames: [frame],
    };
  }

  // ── Corn Belt market weather (Open-Meteo aggregate) ────────────────────────
  private async macroWeather(): Promise<MacroBundle | null> {
    const end = todayUtc();
    const start = isoDaysAgo(end, 29);
    const pcts: number[] = [];
    const anoms: number[] = [];
    const fcPrecip: number[] = [];

    for (const p of CORN_BELT) {
      try {
        const [rec, normals, fc] = await Promise.all([
          fetchArchive(p.lat, p.lon, start, end),
          getNormals(p.lat, p.lon, `macrowx:${p.st}`),
          fetchForecast(p.lat, p.lon),
        ]);
        if (!rec?.daily || !normals) continue;
        const recP = sum(rec.daily.precipitation_sum);
        const recT = mean(rec.daily.temperature_2m_max);
        // normal precip + tmax over the same 30-day window (ordinal slots)
        const ords = ordRange(start, end);
        const normP = ords.reduce((s, o) => s + (normals.precipNormal[o] ?? 0), 0);
        const normT = mean(ords.map((o) => normals.tmaxNormal[o] ?? null));
        if (normP > 0) pcts.push((recP / normP) * 100);
        if (recT != null && normT != null) anoms.push(recT - normT);
        // next 7 days forecast precip
        const fdaily = fc?.daily?.precipitation_sum;
        if (fdaily) fcPrecip.push(sum(fdaily.slice(0, 7) as (number | null)[]));
      } catch (e) {
        console.warn(`[macro] weather point ${p.st} failed`, e);
      }
    }
    if (pcts.length === 0) return null;

    const pctNormal = Math.round(mean(pcts) ?? 100);
    const tempAnom = round(mean(anoms) ?? 0, 1);
    const fc7 = round(mean(fcPrecip) ?? 0, 2);
    // dry + dry forecast → supply risk (UP); wet/ample → comfortable (neutral/down)
    const dry = pctNormal < 75;
    const wet = pctNormal > 130;
    const dir = dry && fc7 < 0.5 ? "up" : wet ? "down" : "neutral";

    const frame: MacroFrame = {
      label: "Corn Belt 30-day precipitation",
      value: pctNormal,
      unit: "% of normal",
      deltaPrior: null,
      deltaPriorPct: null,
      trend: `temp ${tempAnom >= 0 ? "+" : ""}${tempAnom}°F vs normal; next-7-day precip ~${fc7}" (forecast)`,
      direction: dir,
      chain: dry
        ? "below-normal moisture in the growing region → crop stress / supply risk → supportive (up)"
        : wet
          ? "ample/surplus moisture → comfortable supply outlook → mild pressure (down)"
          : "near-normal moisture → no clear supply signal → neutral",
      note: `${CORN_BELT.map((p) => p.st).join("/")} aggregate. This is MARKET weather (whole region), HIGH weight in summer pollination/pod-fill. Forecasts beyond ~7 days are low-confidence — treat the trend, not the daily detail.`,
    };
    return {
      signalType: "macro_weather",
      asOf: end,
      sourceUrl: "https://open-meteo.com/",
      weight: "high",
      frames: [frame],
    };
  }
}

export const macroProvider: MacroProvider = new MacroDataProvider();

// ── DXY from a USD-base rate map (units per 1 USD) ────────────────────────────
function dxy(r: Record<string, number>): number | null {
  const { EUR, JPY, GBP, CAD, SEK, CHF } = r;
  if ([EUR, JPY, GBP, CAD, SEK, CHF].some((v) => v == null || v <= 0)) return null;
  const eurUsd = 1 / EUR;
  const gbpUsd = 1 / GBP;
  return (
    DXY_K *
    Math.pow(eurUsd, -0.576) *
    Math.pow(JPY, 0.136) *
    Math.pow(gbpUsd, -0.119) *
    Math.pow(CAD, 0.091) *
    Math.pow(SEK, 0.042) *
    Math.pow(CHF, 0.036)
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function ordRange(startIso: string, endIso: string): number[] {
  const out: number[] = [];
  const d = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  while (d <= end) {
    out.push(ordinal(d.getUTCMonth() + 1, d.getUTCDate()) - 1);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
function sum(a: (number | null)[] | undefined): number {
  return (a ?? []).reduce<number>((s, v) => s + (v ?? 0), 0);
}
function mean(a: (number | null)[] | undefined): number | null {
  const v = (a ?? []).filter((x): x is number => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
function num(v: number | string | undefined | null): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}
function round(n: number, p: number): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoDaysAgo(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
async function getJson(
  url: string,
  headers?: Record<string, string>,
): Promise<unknown | null> {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FurrowBot/1.0", Accept: "application/json", ...headers },
      cache: "no-store",
      signal: c.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
