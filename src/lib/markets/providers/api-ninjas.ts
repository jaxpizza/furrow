import "server-only";

import { SYMBOL_TO_NINJAS_NAME } from "../symbols";
import type {
  History,
  Interval,
  PriceProvider,
  PricePoint,
  Quote,
  Range,
  Symbol,
} from "../types";

const BASE = "https://api.api-ninjas.com/v1";

const RANGE_DAYS: Record<Range, number> = {
  "1M": 31,
  "3M": 93,
  "6M": 186,
  "1Y": 372,
};

/**
 * API Ninjas implementation of PriceProvider. PURE vendor fetch — no caching
 * here. Returns `null` on any failure (missing key, network error, or the free
 * tier having rotated this commodity out for the week) so the service layer can
 * fall back to the last cached value. Never throws to the caller.
 *
 * Swap to another vendor = a new class implementing PriceProvider; nothing
 * downstream changes.
 */
export class ApiNinjasPriceProvider implements PriceProvider {
  readonly name = "api-ninjas";
  private readonly key: string | undefined;

  constructor(key = process.env.API_NINJAS_KEY) {
    this.key = key;
  }

  private async get(path: string): Promise<unknown | null> {
    if (!this.key) return null;
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "X-Api-Key": this.key },
        // Server-side cache layer owns freshness; bypass Next's fetch cache here.
        cache: "no-store",
      });
      if (!res.ok) return null; // 400/404 → commodity unavailable this week, etc.
      return await res.json();
    } catch {
      return null;
    }
  }

  async getQuote(symbol: Symbol): Promise<Quote | null> {
    const name = SYMBOL_TO_NINJAS_NAME[symbol];
    const data = (await this.get(`/commodityprice?name=${name}`)) as {
      price?: number | string;
      currency_unit?: string;
      change_24h?: number | string;
      change_24h_percent?: number | string;
      previous_close?: number | string;
      updated?: number;
    } | null;
    if (!data || data.price == null) return null;

    // CME grains quote in US cents (currency_unit "USX"). Convert cents → $/bu.
    const toDollars = (v: number) =>
      data.currency_unit === "USX" ? v / 100 : v;

    const price = toDollars(Number(data.price));
    if (!Number.isFinite(price)) return null;

    const change =
      data.change_24h != null ? toDollars(Number(data.change_24h)) : undefined;
    const changePercent =
      data.change_24h_percent != null
        ? Number(data.change_24h_percent)
        : undefined;
    const prevClose =
      data.previous_close != null
        ? toDollars(Number(data.previous_close))
        : undefined;
    const asOf = data.updated
      ? new Date(data.updated * 1000).toISOString()
      : new Date().toISOString();

    return {
      symbol,
      price,
      currency: "USD",
      change: Number.isFinite(change as number) ? change : undefined,
      changePercent: Number.isFinite(changePercent as number)
        ? changePercent
        : undefined,
      prevClose: Number.isFinite(prevClose as number) ? prevClose : undefined,
      asOf,
      stale: false,
      source: this.name,
    };
  }

  async getHistory(
    symbol: Symbol,
    _interval: Interval,
    range: Range,
  ): Promise<History | null> {
    const name = SYMBOL_TO_NINJAS_NAME[symbol];
    // Pull daily bars; the service stores the longest range and slices for UI.
    const data = (await this.get(
      `/commoditypricehistorical?name=${name}&period=1d`,
    )) as Array<{ time?: number; close?: number | string }> | null;
    if (!Array.isArray(data) || data.length === 0) return null;

    const cutoffMs = Date.now() - RANGE_DAYS[range] * 86_400_000;
    // CME corn & soybeans (the only mapped commodities) quote in US CENTS (USX):
    // a close of 421.75 means $4.2175/bu. The quote endpoint reports currency_unit
    // and converts there; the historical endpoint omits it, so convert here too —
    // without this, real history reads 100× high (e.g. $421 instead of $4.21).
    const points: PricePoint[] = data
      .map((bar) => {
        const close = Number(bar.close) / 100;
        const ms = (bar.time ?? 0) * 1000;
        if (!Number.isFinite(close) || !ms) return null;
        return { time: new Date(ms).toISOString().slice(0, 10), value: close };
      })
      .filter((p): p is PricePoint => p !== null)
      .filter((p) => new Date(p.time).getTime() >= cutoffMs)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (points.length === 0) return null;
    return {
      symbol,
      points,
      asOf: points[points.length - 1].time,
      stale: false,
      source: this.name,
    };
  }
}
