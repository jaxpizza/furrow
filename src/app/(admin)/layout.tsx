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
      <header className="flex items-center justify-between border-b border-[var(--border,#292524)] px-4 py-2">
        <div className="flex items-baseline gap-3">
          <Link href="/admin/telemetry" className="font-semibold tracking-tight">
            FURROW
          </Link>
          <span className="text-[var(--accent,#d97706)]">· telemetry console</span>
          <span className="rounded bg-[var(--accent,#d97706)]/15 px-1.5 py-0.5 text-[10px] uppercase text-[var(--accent,#d97706)]">
            admin
          </span>
        </div>
        <span className="text-[11px] text-[var(--text-tertiary,#78716c)]">
          instrument panel · not farmer-facing
        </span>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
