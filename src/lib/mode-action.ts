"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { AppMode } from "@/lib/app-mode";

/**
 * Persist the signed-in user's app mode to their profile (RLS scopes the write to
 * their own row). Used by the Simple ⇄ Detailed toggle in both surfaces; the
 * preference sticks across sessions and devices because it lives in the DB.
 */
export async function setAppMode(mode: AppMode): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("profiles").update({ app_mode: mode }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // Root routing reads the mode, so revalidate the whole tree.
  revalidatePath("/", "layout");
  return { ok: true };
}
