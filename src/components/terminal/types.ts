import type { PositionFusion } from "@/lib/fusion/position-fusion";
import type { CashPrice } from "@/lib/markets/types";
import type { CotBundle } from "@/lib/outlook/cot-types";
import type { DemandBundle } from "@/lib/outlook/demand-types";
import type { EconBundle } from "@/lib/outlook/econ-types";
import type { MacroBundle } from "@/lib/outlook/macro-types";
import type { OutlookV2 } from "@/lib/outlook/synthesis";
import type { TechnicalsBundle } from "@/lib/outlook/technicals-types";
import type { ReportBundle } from "@/lib/outlook/types";
import type { Crop } from "@/lib/types/database";

export type NextMover = {
  reportType: string;
  releaseDate: string;
  description: string;
  daysUntil: number;
};

export type ChartPoint = { time: string; value: number };

export type TerminalData = {
  crop: Crop;
  nowMs: number;
  apiKeyMissing: boolean;
  outlook: OutlookV2 | null;
  cash: CashPrice | null;
  breakeven: { effective: number | null; profitTargetPrice: number | null };
  /** Personal-position fusion (design §5) — null when no ledger data. */
  fusion: PositionFusion | null;
  pricePoints: ChartPoint[];
  priceSample: boolean;
  nextMover: NextMover | null;
  buckets: {
    supply: EconBundle[];
    supplyFetched: number | null;
    demand: DemandBundle[];
    demandFetched: number | null;
    moneyflow: CotBundle | null;
    moneyflowFetched: number | null;
    macro: MacroBundle[];
    macroFetched: number | null;
    technicals: TechnicalsBundle | null;
    conditions: ReportBundle[];
  };
};
