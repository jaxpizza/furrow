"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { logAdminAction, requireAdmin } from "@/lib/admin";
import { IMPERSONATE_COOKIE } from "@/lib/constants";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Start viewing-as a user. Sets an httpOnly cookie (so it can't be forged
 * client-side), audits the action, and drops the admin into the farmer app as
 * that user. auth.uid() never changes — getSessionContext overlays their farms.
 */
export async function startImpersonation(targetUserId: string, to = "/dashboard") {
  const ctx = await requireAdmin();
  if (targetUserId === ctx.user!.id) return; // no self-impersonation

  const svc = createServiceRoleClient();
  const { data } = await svc.auth.admin.getUserById(targetUserId);
  if (!data?.user) return; // unknown user

  const store = await cookies();
  store.set(IMPERSONATE_COOKIE, targetUserId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour — support sessions are short
  });
  await logAdminAction(ctx.user!.id, "impersonate_start", targetUserId, { email: data.user.email, landed: to });
  // only ever land on an in-app relative path
  redirect(to.startsWith("/") && !to.startsWith("//") ? to : "/dashboard");
}

/** Exit view-as and return to the admin's own account + the console. */
export async function stopImpersonation() {
  const ctx = await requireAdmin();
  const store = await cookies();
  const targetUserId = store.get(IMPERSONATE_COOKIE)?.value ?? null;
  store.delete(IMPERSONATE_COOKIE);
  if (targetUserId) await logAdminAction(ctx.user!.id, "impersonate_end", targetUserId);
  redirect(targetUserId ? `/admin/users/${targetUserId}` : "/admin/users");
}

/** Grant or revoke admin on a user. Audited. */
export async function toggleAdmin(targetUserId: string, makeAdmin: boolean) {
  const ctx = await requireAdmin();
  if (targetUserId === ctx.user!.id) return; // can't change your own admin flag
  const svc = createServiceRoleClient();
  await svc.from("profiles").update({ is_admin: makeAdmin }).eq("id", targetUserId);
  await logAdminAction(ctx.user!.id, "toggle_admin", targetUserId, { isAdmin: makeAdmin });
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");
}

/** Edit a user's display name on their behalf. Audited. */
export async function updateUserName(targetUserId: string, fullName: string) {
  const ctx = await requireAdmin();
  const name = fullName.trim();
  const svc = createServiceRoleClient();
  await svc.from("profiles").update({ full_name: name || null }).eq("id", targetUserId);
  await logAdminAction(ctx.user!.id, "edit_user", targetUserId, { fullName: name });
  revalidatePath(`/admin/users/${targetUserId}`);
}

/** DESTRUCTIVE — remove a user entirely (auth + cascading profile/farms/data).
 *  Audited. Cannot remove yourself. */
export async function deleteUser(targetUserId: string) {
  const ctx = await requireAdmin();
  if (targetUserId === ctx.user!.id) return; // never delete yourself

  const svc = createServiceRoleClient();
  const { data } = await svc.auth.admin.getUserById(targetUserId);
  await svc.auth.admin.deleteUser(targetUserId);
  await logAdminAction(ctx.user!.id, "delete_user", targetUserId, { email: data?.user?.email ?? null });
  redirect("/admin/users");
}
