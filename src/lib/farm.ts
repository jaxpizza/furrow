import { createClient } from "@/lib/supabase/server";
import type { Farm, Profile } from "@/lib/types/database";

export type FarmSummary = Pick<Farm, "id" | "name" | "state"> & {
  role: "owner" | "member";
};

/**
 * Loads the signed-in user, their profile, and the farms they belong to.
 * Returns `user: null` when unauthenticated. Used by the protected shell to
 * gate onboarding and populate the farm switcher.
 */
export async function getSessionContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, farms: [] as FarmSummary[] };
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("farm_members")
      .select("role, farms (id, name, state)")
      .order("created_at", { ascending: true }),
  ]);

  const farms: FarmSummary[] = (memberships ?? [])
    .map((m) => {
      const farm = m.farms as unknown as Pick<
        Farm,
        "id" | "name" | "state"
      > | null;
      if (!farm) return null;
      return { ...farm, role: m.role };
    })
    .filter((f): f is FarmSummary => f !== null);

  return {
    user,
    profile: (profile as Profile | null) ?? null,
    farms,
  };
}
