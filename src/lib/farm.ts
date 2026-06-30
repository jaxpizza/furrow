import { cookies } from "next/headers";

import { IMPERSONATE_COOKIE } from "@/lib/constants";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Farm, Profile } from "@/lib/types/database";

export type FarmSummary = Pick<Farm, "id" | "name" | "state"> & {
  role: "owner" | "member";
};

/** Set on the context when an admin is viewing the app AS another user. */
export type Impersonation = {
  targetId: string;
  targetName: string | null;
  targetEmail: string | null;
  adminId: string;
};

type Membership = { role: "owner" | "member"; farms: Pick<Farm, "id" | "name" | "state"> | null };

function mapFarms(memberships: Membership[] | null): FarmSummary[] {
  return (memberships ?? [])
    .map((m) => {
      const farm = m.farms as unknown as Pick<Farm, "id" | "name" | "state"> | null;
      if (!farm) return null;
      return { ...farm, role: m.role };
    })
    .filter((f): f is FarmSummary => f !== null);
}

/**
 * Loads the signed-in user, their profile, and the farms they belong to.
 * Returns `user: null` when unauthenticated.
 *
 * `isAdmin` always reflects the REAL signed-in user (so requireAdmin can't be
 * fooled by impersonation). When an admin is viewing-as another user, `profile`
 * and `farms` are the TARGET's (resolved via the service-role client, since the
 * admin's RLS scope is their own) and `impersonating` is populated — that's what
 * makes the farmer pages render the tester's world. `user` stays the admin's
 * auth user: auth.uid() never changes, so this is an overlay, not a takeover.
 */
export async function getSessionContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      farms: [] as FarmSummary[],
      isAdmin: false,
      impersonating: null as Impersonation | null,
    };
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("farm_members")
      .select("role, farms (id, name, state)")
      .order("created_at", { ascending: true }),
  ]);

  const realProfile = (profile as Profile | null) ?? null;
  const realFarms = mapFarms(memberships as Membership[] | null);
  const isAdmin = realProfile?.is_admin ?? false;

  // Admin "view-as" overlay — only for a real admin, only when the cookie names
  // a different user. Loads that user's identity + farms with the service-role
  // client so the farmer pages below render their data.
  if (isAdmin) {
    const targetId = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
    if (targetId && targetId !== user.id) {
      const overlay = await loadImpersonation(targetId, user.id);
      if (overlay) {
        return { user, profile: overlay.profile, farms: overlay.farms, isAdmin, impersonating: overlay.info };
      }
    }
  }

  return { user, profile: realProfile, farms: realFarms, isAdmin, impersonating: null };
}

async function loadImpersonation(
  targetId: string,
  adminId: string,
): Promise<{ profile: Profile | null; farms: FarmSummary[]; info: Impersonation } | null> {
  try {
    const svc = createServiceRoleClient();
    const [{ data: tProfile }, { data: tMems }, { data: authData }] = await Promise.all([
      svc.from("profiles").select("*").eq("id", targetId).maybeSingle(),
      svc.from("farm_members").select("role, farms (id, name, state)").eq("user_id", targetId),
      svc.auth.admin.getUserById(targetId),
    ]);
    if (!tProfile) return null; // unknown user — ignore the cookie
    return {
      profile: tProfile as Profile,
      farms: mapFarms(tMems as Membership[] | null),
      info: {
        targetId,
        targetName: (tProfile as Profile).full_name,
        targetEmail: authData?.user?.email ?? null,
        adminId,
      },
    };
  } catch {
    return null;
  }
}
