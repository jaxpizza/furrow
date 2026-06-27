import "server-only";

import type { Crop } from "@/lib/types/database";

import { readBasis } from "./cache";
import { SAMPLE_BASIS_CENTS } from "./sample";
import { getFuturesQuote } from "./service";
import {
  contractMonths,
  CROP_TO_SYMBOL,
  formatContractMonth,
} from "./symbols";
import type { CashBidProvider, CashPrice } from "./types";

/**
 * MANUAL-BASIS cash provider: cash = futures + the farmer's entered basis.
 * Reads the basis the farmer stored for their farm (basis_entries). This is the
 * seam we later swap for a live Barchart getGrainBids feed — the rest of the app
 * only sees `CashPrice` and never learns which source produced the number.
 *
 * When no basis is set yet, we still surface a cash figure using a clearly-
 * labeled SAMPLE basis (`source: "sample-basis"`, `hasBasis: false`) so the card
 * isn't blank, and the UI prompts the farmer to enter their real basis.
 */
export class ManualBasisCashProvider implements CashBidProvider {
  readonly name = "manual-basis";

  async getCashPrice(crop: Crop, farmId: string): Promise<CashPrice> {
    const symbol = CROP_TO_SYMBOL[crop];
    const now = new Date();
    const quote = await getFuturesQuote(symbol, now);
    const front = contractMonths(symbol, now)[0];

    const futuresRef = {
      symbol,
      price: quote.price,
      contractMonth: formatContractMonth(front),
      asOf: quote.asOf,
      stale: quote.stale,
      source: quote.source,
      change: quote.change,
      changePercent: quote.changePercent,
    };

    const stored = await readBasis(farmId, crop);
    const hasBasis = stored != null;
    const basisCents = hasBasis ? stored.basis_cents : SAMPLE_BASIS_CENTS[symbol];
    const cashPrice =
      Math.round((quote.price + basisCents / 100) * 10000) / 10000;

    return {
      crop,
      cashPrice,
      basisCents,
      basisUpdatedAt: stored?.updated_at ?? null,
      elevatorName: stored?.elevator_name ?? null,
      futuresRef,
      source: hasBasis ? this.name : "sample-basis",
      hasBasis,
    };
  }
}

export const cashProvider: CashBidProvider = new ManualBasisCashProvider();
