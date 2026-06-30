"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

/** Annotate a telemetry record (admin-only — the RLS insert policy + requireAdmin
 *  both gate it). This is the tuning-loop closer: a labeled record of when the
 *  engine read well vs poorly and why. */
export async function annotate(formData: FormData) {
  const ctx = await requireAdmin();
  const telemetryId = String(formData.get("telemetryId") ?? "");
  const rating = String(formData.get("rating") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!telemetryId || !rating) return;

  const db = await createClient();
  await db.from("telemetry_annotation").insert({
    telemetry_id: telemetryId,
    rating,
    notes: notes || null,
    annotated_by: ctx.user?.id ?? null,
  });
  revalidatePath(`/admin/telemetry/${telemetryId}`);
}
