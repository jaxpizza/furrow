// Pure parser for the USDA WASDE machine-readable XML (USDA ESMIS feed). No app
// imports, so it can be tested in isolation against a real WASDE file. The XML is
// large and oddly-nested (per-matrix `mN_` element prefixes), but strictly
// pre-order, so a linear token walk that tracks the latest market_year /
// forecast_month / value yields clean tuples.
//
// One WASDE file carries, for the active projection marketing year, BOTH this
// month's and last month's columns, plus the prior year's estimate — so MoM,
// Δ-year, and stocks-to-use all come from a single file.

export type WasdeMetric = {
  unit: string;
  /** current marketing year, e.g. "2026/27" */
  marketingYear: string;
  /** latest forecast month value for the projection year */
  current: { month: string; value: number } | null;
  /** prior forecast month value (same projection year) — for MoM */
  prior: { month: string; value: number } | null;
  /** prior marketing year's value (the "Est." year) — for Δ year */
  priorYear: { marketingYear: string; value: number } | null;
};

export type WasdeCropFigures = {
  endingStocks: WasdeMetric | null;
  production: WasdeMetric | null;
  supplyTotal: WasdeMetric | null;
  useTotal: WasdeMetric | null;
  avgFarmPrice: WasdeMetric | null;
  // demand targets (Phase B pace-vs-target): exports (both crops),
  // ethanol-for-corn (corn only), crushings (soy only)
  exports: WasdeMetric | null;
  ethanolUse: WasdeMetric | null;
  crushUse: WasdeMetric | null;
};

function norm(s: string): string {
  return s
    .replace(/&#x[0-9A-Fa-f]+;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toNum(s: string): number | null {
  const n = Number(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/** The sub-report region between this title and the next sub_report_title. */
function subRegion(xml: string, title: string): string {
  const i = xml.indexOf(title);
  if (i < 0) return "";
  const next = xml.indexOf("sub_report_title=", i + 10);
  return xml.slice(i, next > 0 ? next : i + 120_000);
}

type Cell = { my: string; month: string; value: number | null };

/** All <attributeN attributeN="LABEL"> blocks (any matrix suffix) for a label. */
function attributeBlocks(region: string, label: string): Cell[][] {
  const out: Cell[][] = [];
  const re = /<attribute(\d) attribute\1="([^"]*)">([\s\S]*?)<\/attribute\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region))) {
    // prefix match — WASDE row labels carry footnote suffixes ("Ethanol &
    // by-products 3/", "Avg. Farm Price ($/bu) 4/").
    if (!norm(m[2]).startsWith(label)) continue;
    const inner = m[3];
    const cells: Cell[] = [];
    const tre = /(market_year|forecast_month|cell_value)\d="([^"]*)"/g;
    let t: RegExpExecArray | null;
    let my = "";
    let month = "";
    while ((t = tre.exec(inner))) {
      if (t[1] === "market_year") my = norm(t[2]);
      else if (t[1] === "forecast_month") month = norm(t[2]);
      else cells.push({ my, month, value: toNum(t[2]) });
    }
    out.push(cells);
  }
  return out;
}

/**
 * Extract one metric for one commodity table. A sub-report can contain several
 * tables in different units (corn in mil bu sits next to the feed-grains
 * aggregate in MMT; soybeans next to oil/meal), so we pick the block whose
 * projection value lands in the commodity's plausible bushel/price/acre range.
 * Range-based selection is grounded in known US balance-sheet magnitudes.
 */
function extractMetric(
  region: string,
  label: string,
  unit: string,
  range: [number, number],
): WasdeMetric | null {
  const blocks = attributeBlocks(region, label).map((cells) =>
    cells.filter((c) => c.my),
  );

  for (const cells of blocks) {
    const proj = cells.filter((c) => /Proj/i.test(c.my) && c.value != null);
    if (proj.length === 0) continue;
    // latest forecast month = current; prior month = the earlier one
    const current = proj[proj.length - 1];
    if (current.value == null || current.value < range[0] || current.value > range[1])
      continue; // wrong table (units/commodity) — keep looking

    const prior = proj.length > 1 ? proj[proj.length - 2] : null;
    const est = cells.find((c) => /Est/i.test(c.my) && c.value != null) ?? null;

    return {
      unit,
      marketingYear: current.my.replace(/\s*(Proj\.?|Est\.?)\s*/i, "").trim(),
      current: { month: current.month, value: current.value },
      prior:
        prior && prior.value != null
          ? { month: prior.month, value: prior.value }
          : null,
      priorYear:
        est && est.value != null
          ? {
              marketingYear: est.my.replace(/\s*Est\.?\s*/i, "").trim(),
              value: est.value,
            }
          : null,
    };
  }
  return null;
}

const CORN_SUBREPORT = "U.S. Feed Grain and Corn Supply and Use";
const SOY_SUBREPORT = "U.S. Soybeans and Products Supply and Use";

// metric → [exact label, unit, corn range, soy range]
const METRICS: [
  keyof WasdeCropFigures,
  string,
  string,
  [number, number],
  [number, number],
][] = [
  ["endingStocks", "Ending Stocks", "mil bu", [300, 5000], [50, 1500]],
  ["production", "Production", "mil bu", [8000, 20000], [2500, 6000]],
  ["supplyTotal", "Supply, Total", "mil bu", [10000, 25000], [3000, 8000]],
  ["useTotal", "Use, Total", "mil bu", [8000, 20000], [2500, 6500]],
  ["avgFarmPrice", "Avg. Farm Price ($/bu)", "$/bu", [2, 9], [6, 20]],
  // demand targets for pace-vs-target (impossible range on the wrong crop → null)
  ["exports", "Exports", "mil bu", [1000, 4000], [800, 3000]],
  ["ethanolUse", "Ethanol & by-products", "mil bu", [4000, 7000], [-1, -1]],
  ["crushUse", "Crushings", "mil bu", [-1, -1], [1500, 3500]],
];

function parseCrop(region: string, rangeIdx: 0 | 1): WasdeCropFigures {
  const out: WasdeCropFigures = {
    endingStocks: null,
    production: null,
    supplyTotal: null,
    useTotal: null,
    avgFarmPrice: null,
    exports: null,
    ethanolUse: null,
    crushUse: null,
  };
  for (const [key, label, unit, cornRange, soyRange] of METRICS) {
    const range = rangeIdx === 0 ? cornRange : soyRange;
    out[key] = extractMetric(region, label, unit, range);
  }
  return out;
}

export function parseWasdeXml(xml: string): {
  corn: WasdeCropFigures;
  soybean: WasdeCropFigures;
} {
  return {
    corn: parseCrop(subRegion(xml, CORN_SUBREPORT), 0),
    soybean: parseCrop(subRegion(xml, SOY_SUBREPORT), 1),
  };
}
