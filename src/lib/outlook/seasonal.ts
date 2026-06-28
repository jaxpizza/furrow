import type { UpcomingReport } from "./econ-ingest";

/**
 * Seasonal weighting framework (v1) as ACTIVE scaffolding for the synthesis —
 * the implementation of SEASONAL_WEIGHTING_FRAMEWORK.md. Computes, for today's
 * date + the report calendar, which buckets LEAD the read right now (HIGH),
 * which are secondary (MEDIUM), and which are minor (LOW), plus event overlays
 * (an imminent report spikes its bucket). This is a strong default the engine
 * reasons within — it may deviate when a low-weighted signal is doing something
 * extreme, but must say so. Attention allocation, NOT a price forecast.
 */
export type Emphasis = "high" | "medium" | "low";
export type SeasonBucket =
  | "supply"
  | "demand"
  | "moneyFlow"
  | "macro"
  | "weather"
  | "conditions"
  | "technicals"
  | "price";
export type Season = "Winter" | "Spring" | "Summer" | "Fall";

export type SeasonalWeighting = {
  season: Season;
  monthLabel: string; // "Late June"
  dominantQuestion: string;
  emphasis: Record<SeasonBucket, Emphasis>;
  imminentEvents: string[]; // "Acreage in 3 days"
  line: string; // the human-readable seasonalContext
};

const BASE: Record<Season, Record<SeasonBucket, Emphasis>> = {
  // Winter — old crop in the bin; market trades demand + South America
  Winter: { supply: "high", demand: "high", moneyFlow: "medium", macro: "medium", weather: "low", conditions: "low", technicals: "low", price: "medium" },
  // Spring — the coming crop: acres + planting pace + early weather
  Spring: { supply: "high", demand: "medium", moneyFlow: "medium", macro: "low", weather: "medium", conditions: "medium", technicals: "low", price: "medium" },
  // Summer — weather is king (pollination / pod-fill); late-June acreage
  Summer: { supply: "high", demand: "medium", moneyFlow: "medium", macro: "low", weather: "high", conditions: "high", technicals: "low", price: "medium" },
  // Fall — actual yields + harvest pressure
  Fall: { supply: "high", demand: "medium", moneyFlow: "medium", macro: "low", weather: "low", conditions: "low", technicals: "low", price: "medium" },
};

const DOMINANT_Q: Record<Season, string> = {
  Winter: "Is demand strong enough to draw down old-crop stocks, and is South America's crop coming in big or short?",
  Spring: "How many acres of each, and is planting going smoothly or getting delayed?",
  Summer: "Is the weather making or breaking this crop right now?",
  Fall: "How big is the crop actually, and how much harvest pressure is on price?",
};

const SHORT_LABEL: Record<SeasonBucket, string> = {
  supply: "USDA supply reports",
  demand: "demand (exports/ethanol/crush)",
  moneyFlow: "fund positioning",
  macro: "macro (dollar/crude)",
  weather: "Corn Belt weather",
  conditions: "crop conditions",
  technicals: "technicals",
  price: "price/basis trend",
};

const ORDER: SeasonBucket[] = [
  "supply", "weather", "conditions", "demand", "moneyFlow", "price", "macro", "technicals",
];

function seasonOf(month0: number): Season {
  if (month0 === 11 || month0 <= 1) return "Winter";
  if (month0 <= 4) return "Spring";
  if (month0 <= 7) return "Summer";
  return "Fall";
}

function partOfMonth(day: number): string {
  return day <= 10 ? "Early" : day <= 20 ? "Mid" : "Late";
}

/** Which bucket does an upcoming report spike? */
function eventBucket(r: UpcomingReport): SeasonBucket | null {
  const s = `${r.reportType} ${r.description}`.toLowerCase();
  if (/export/.test(s)) return "demand";
  if (/cot|commitment|traders/.test(s)) return "moneyFlow";
  if (/acre|planting|prospective|stocks|wasde|production|crop production/.test(s)) return "supply";
  return null;
}

function shortEvent(r: UpcomingReport): string {
  const when = r.daysUntil <= 0 ? "today" : r.daysUntil === 1 ? "tomorrow" : `in ${r.daysUntil} days`;
  const name = r.description.split("—")[0].split("(")[0].trim() || r.reportType;
  return `${name} ${when}`;
}

const RANK: Record<Emphasis, number> = { low: 0, medium: 1, high: 2 };
const bump = (a: Emphasis, b: Emphasis): Emphasis => (RANK[a] >= RANK[b] ? a : b);

export function computeSeasonalWeighting(
  now: Date,
  upcoming: UpcomingReport[] = [],
  eventWindowDays = 7,
): SeasonalWeighting {
  const month0 = now.getUTCMonth();
  const day = now.getUTCDate();
  const monthName = now.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const season = seasonOf(month0);
  const monthLabel = `${partOfMonth(day)} ${monthName}`;

  // start from the season base, then apply year-round floors
  const emphasis: Record<SeasonBucket, Emphasis> = { ...BASE[season] };
  emphasis.moneyFlow = bump(emphasis.moneyFlow, "medium");
  emphasis.demand = bump(emphasis.demand, "medium");
  emphasis.price = bump(emphasis.price, "medium");

  // event overlays — an imminent report spikes its bucket
  const imminentEvents: string[] = [];
  for (const r of upcoming) {
    if (r.daysUntil < 0 || r.daysUntil > eventWindowDays) continue;
    const b = eventBucket(r);
    if (b) emphasis[b] = "high";
    imminentEvents.push(shortEvent(r));
  }

  const leads = ORDER.filter((b) => emphasis[b] === "high");
  const secondary = ORDER.filter((b) => emphasis[b] === "medium");
  const minor = ORDER.filter((b) => emphasis[b] === "low");
  const join = (a: SeasonBucket[]) => a.map((b) => SHORT_LABEL[b]).join(", ");

  const eventClause = imminentEvents.length
    ? `, with ${imminentEvents.slice(0, 3).join(" & ")} imminent (supply spikes)`
    : "";
  const line =
    `${monthLabel} — ${join(leads)} lead${eventClause}` +
    (secondary.length ? `; ${join(secondary)} secondary` : "") +
    (minor.length ? `; ${join(minor)} minor` : "") +
    ".";

  return {
    season,
    monthLabel,
    dominantQuestion: DOMINANT_Q[season],
    emphasis,
    imminentEvents,
    line,
  };
}

export { SHORT_LABEL as SEASON_BUCKET_LABEL };
