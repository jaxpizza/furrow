import type { Crop } from "@/lib/types/database";

/**
 * PLACEHOLDER news feed — NOT real aggregation. Real headline aggregation is the
 * next phase. These are illustrative, evergreen, clearly-labeled stand-ins fed
 * to the outlook model as context; the prompt tells the model they're
 * illustrative and not to over-weight them or quote figures from them.
 */
export type StubHeadline = { source: string; headline: string };

const CORN: StubHeadline[] = [
  {
    source: "USDA (sample)",
    headline: "Weekly export inspections for corn run ahead of the prior week",
  },
  {
    source: "DTN (sample)",
    headline: "Drier pattern forecast for the eastern Corn Belt over the next week",
  },
  {
    source: "Reuters (sample)",
    headline: "Ethanol production holds steady; corn grind near seasonal norms",
  },
  {
    source: "Bloomberg (sample)",
    headline: "Lower diesel and input costs ease pressure on new-crop margins",
  },
];

const SOY: StubHeadline[] = [
  {
    source: "USDA (sample)",
    headline: "Soybean export sales mixed as South American harvest pressures price",
  },
  {
    source: "Reuters (sample)",
    headline: "Crush margins firm on steady domestic meal demand",
  },
  {
    source: "DTN (sample)",
    headline: "Basis at central-Illinois processors holds near seasonal average",
  },
  {
    source: "Bloomberg (sample)",
    headline: "Currency moves in Brazil weigh on U.S. soybean competitiveness",
  },
];

export function stubHeadlines(crop: Crop): StubHeadline[] {
  return crop === "corn" ? CORN : SOY;
}
