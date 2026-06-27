import type { Crop } from "@/lib/types/database";

/** Internal commodity symbol (decoupled from any vendor's naming). */
export type Symbol = "corn" | "soybean";

export type Range = "1M" | "3M" | "6M" | "1Y";
export type Interval = "daily";

/** A point on a price series. `time` is an ISO date (YYYY-MM-DD). */
export type PricePoint = { time: string; value: number };

export type Quote = {
  symbol: Symbol;
  /** Front-month futures price, $/bushel (converted from the vendor's unit). */
  price: number;
  currency: string;
  /** Day change in $/bushel, when the feed provides it (history is premium). */
  change?: number;
  changePercent?: number;
  prevClose?: number;
  /** When the underlying data is "as of" (provider timestamp). */
  asOf: string;
  /** True when we're serving a cached value because a fresh fetch failed/was
   *  unavailable (e.g. the free tier rotated this commodity out this week). */
  stale: boolean;
  /** Which provider produced it — 'api-ninjas' | 'sample'. */
  source: string;
};

export type History = {
  symbol: Symbol;
  points: PricePoint[];
  asOf: string;
  stale: boolean;
  source: string;
};

/**
 * FUTURES PROVIDER — swap this seam to change vendors (API Ninjas → Barchart →
 * …) without touching any UI. Implementations are PURE vendor fetches; caching
 * and graceful degradation live in the service layer.
 */
export interface PriceProvider {
  readonly name: string;
  getQuote(symbol: Symbol): Promise<Quote | null>;
  getHistory(
    symbol: Symbol,
    interval: Interval,
    range: Range,
  ): Promise<History | null>;
}

export type CashPrice = {
  crop: Crop;
  /** futures + basis, $/bushel. null when no basis is set yet. */
  cashPrice: number | null;
  /** the farmer's basis in cents (may be negative). null when unset. */
  basisCents: number | null;
  /** when the farmer last set/updated their basis (ISO). null for sample basis. */
  basisUpdatedAt: string | null;
  elevatorName: string | null;
  /** the futures leg the cash price is built on. */
  futuresRef: {
    symbol: Symbol;
    price: number;
    contractMonth: string;
    asOf: string;
    stale: boolean;
    source: string;
    /** day change in $/bushel from the live feed, when available */
    change?: number;
    changePercent?: number;
  } | null;
  /** which source produced the cash number — 'manual-basis' | (later) 'barchart' */
  source: string;
  hasBasis: boolean;
};

/**
 * CASH-PRICE PROVIDER — a separate seam from futures. The rest of the app calls
 * getCashPrice() and NEVER knows whether the number came from the farmer's
 * manual basis or (later) a live Barchart getGrainBids feed.
 */
export interface CashBidProvider {
  readonly name: string;
  getCashPrice(crop: Crop, farmId: string): Promise<CashPrice>;
}
