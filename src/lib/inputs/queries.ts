import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Crop } from "@/lib/types/database";

/** The farmer's marketing position, with the derived fields the personal read
 *  cares about (exposure). Available now for the outlook/personal layer to fuse
 *  into the read — the data is real; deep read-text fusion is the follow-up. */
export type CropPositionRead = {
  crop: Crop;
  totalProductionBu: number | null;
  bushelsSold: number | null;
  bushelsRemaining: number | null; // produced − sold (the exposure)
  pctSold: number | null; // 0–100
  avgSoldPrice: number | null;
};

export async function getCropPosition(
  farmId: string,
  crop: Crop,
): Promise<CropPositionRead | null> {
  try {
    const db = createServiceRoleClient();
    const { data } = await db
      .from("crop_positions")
      .select("total_production_bu, bushels_sold, avg_sold_price")
      .eq("farm_id", farmId)
      .eq("crop", crop)
      .maybeSingle();
    if (!data) return null;
    const produced = data.total_production_bu;
    const sold = data.bushels_sold ?? 0;
    const remaining =
      produced != null ? Math.max(0, Math.round((produced - sold) * 10) / 10) : null;
    const pctSold =
      produced != null && produced > 0
        ? Math.min(100, Math.max(0, Math.round((sold / produced) * 100)))
        : null;
    return {
      crop,
      totalProductionBu: produced,
      bushelsSold: data.bushels_sold,
      bushelsRemaining: remaining,
      pctSold,
      avgSoldPrice: data.avg_sold_price,
    };
  } catch {
    return null;
  }
}
