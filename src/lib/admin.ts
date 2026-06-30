import "server-only";

import { notFound, redirect } from "next/navigation";

import { getSessionContext } from "@/lib/farm";

/**
 * Server-side admin gate. A non-admin gets notFound() — a 404, never a hint the
 * console exists. (The DB-level RLS is the real wall; this is the UI wall.)
 * Returns the admin session context when authorized.
 */
export async function requireAdmin() {
  const ctx = await getSessionContext();
  if (!ctx.user) redirect("/sign-in");
  if (!ctx.profile?.is_admin) notFound();
  return ctx;
}
