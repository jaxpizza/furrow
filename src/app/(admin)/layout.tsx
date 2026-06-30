import Link from "next/link";

import { requireAdmin } from "@/lib/admin";

/**
 * Admin chrome — deliberately NOT the farmer shell (no farm switcher, no nav).
 * requireAdmin() 404s any non-admin before anything renders.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-dvh bg-[var(--surface,#0c0a09)] font-mono text-sm text-[var(--text,#e7e5e4)]">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--border,#292524)] px-4 py-2">
        <Link href="/admin" className="font-semibold tracking-tight">
          FURROW
        </Link>
        <span className="rounded bg-[var(--accent,#d97706)]/15 px-1.5 py-0.5 text-[10px] uppercase text-[var(--accent,#d97706)]">
          admin
        </span>
        <nav className="flex items-center gap-3 text-[12px]">
          <Link href="/admin" className="hover:text-[var(--accent,#d97706)]">
            overview
          </Link>
          <Link href="/admin/users" className="hover:text-[var(--accent,#d97706)]">
            users
          </Link>
          <Link href="/admin/telemetry" className="hover:text-[var(--accent,#d97706)]">
            telemetry
          </Link>
        </nav>
        <span className="ml-auto flex items-center gap-3 text-[11px] text-[var(--text-tertiary,#78716c)]">
          <span className="hidden sm:inline">instrument panel · not farmer-facing</span>
          <Link href="/dashboard" className="hover:text-[var(--accent,#d97706)]">
            ← app
          </Link>
        </span>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
