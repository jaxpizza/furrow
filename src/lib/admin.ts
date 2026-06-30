import "server-only";

import { notFound, redirect } from "next/navigation";

import { getSessionContext } from "@/lib/farm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

/**
 * Server-side admin gate. A non-admin gets notFound() — a 404, never a hint the
 * console exists. (The DB-level RLS is the real wall; this is the UI wall.)
 * Returns the admin session context when authorized.
 *
 * Checks the REAL signed-in user's admin flag (`ctx.isAdmin`), not the effective
 * profile — so view-as impersonation can never grant or revoke admin access.
 */
export async function requireAdmin() {
  const ctx = await getSessionContext();
  if (!ctx.user) redirect("/sign-in");
  if (!ctx.isAdmin) notFound();
  return ctx;
}

/**
 * Data-layer admin backstop. Throws (not a 404 — a hard error) if the caller is
 * not a real admin, so a service-role admin query can never run from an ungated
 * context, even if a page forgets to gate. Defense in depth behind requireAdmin.
 */
export async function assertAdmin() {
  const ctx = await getSessionContext();
  if (!ctx.isAdmin) throw new Error("forbidden: admin required");
  return ctx;
}

/**
 * Append a row to the admin audit log. Best-effort (a missing table degrades to a
 * no-op rather than failing the action), written with the service-role client so
 * it can't be blocked by RLS. The audit-log RLS keeps READS admin-only.
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetUserId: string | null,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    const db = createServiceRoleClient();
    await db.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action,
      target_user_id: targetUserId,
      detail: (detail ?? null) as Json,
    });
  } catch {
    // audit is best-effort; never block the action it records
  }
}
