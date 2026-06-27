/**
 * Macro bucket (Phase D) — second-order, contextual signals: US dollar, crude
 * oil, and Corn Belt "market weather" (distinct from a single farm's field
 * weather). Per the seasonal-weighting framework these are MEDIUM weight
 * (dollar/crude) — they must NOT dominate the core supply/demand read — while
 * macro weather spikes to HIGH in the summer growing season.
 */
export type MacroSignalType = "dollar" | "crude" | "macro_weather";

export type MacroFrame = {
  label: string;
  value: number | null;
  unit: string;
  deltaPrior: number | null;
  deltaPriorPct: number | null;
  trend: string | null; // "strengthening over 4 weeks", "down on the day"
  direction: "up" | "down" | "neutral"; // price direction implied (with the chain)
  chain: string; // the directional logic, stated
  note: string | null; // humility / caveat
};

export type MacroBundle = {
  signalType: MacroSignalType;
  asOf: string | null;
  sourceUrl: string;
  weight: "high" | "medium" | "low"; // seasonal weight hint for the synthesis
  frames: MacroFrame[];
};

export type MacroProvider = {
  readonly name: string;
  getBundles(): Promise<MacroBundle[]>;
};

export const MACRO_LABEL: Record<MacroSignalType, string> = {
  dollar: "US Dollar Index",
  crude: "Crude Oil",
  macro_weather: "Corn Belt Weather",
};
