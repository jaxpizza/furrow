import type { ChartPoint } from "@/components/terminal/types";
import type { OutlookV2 } from "@/lib/outlook/synthesis";
import type { TechnicalsBundle } from "@/lib/outlook/technicals-types";
import type { Crop } from "@/lib/types/database";

/** A crop's at-a-glance price + read pulse, assembled server-side from the same
 *  real seams the terminal and markets use. */
export type CropPulse = {
  crop: Crop;
  label: string;
  // price chart (real close series + engine technicals overlay)
  points: ChartPoint[];
  tech: TechnicalsBundle | null;
  priceSample: boolean;
  // price stats
  cashPrice: number | null;
  hasBasis: boolean;
  basisCents: number | null;
  futuresPrice: number | null;
  contractMonth: string | null;
  futuresStale: boolean;
  priceAsOf: string | null;
  delta: { change: number; pct: number; direction: "up" | "down" | "flat" };
  // personal break-even
  breakeven: { effective: number | null; profitTargetPrice: number | null };
  // the cached market read (read-only; the dashboard never triggers generation)
  read: OutlookV2 | null;
  readUpdatedLabel: string | null;
};
