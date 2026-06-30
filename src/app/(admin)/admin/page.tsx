import Link from "next/link";

import { ago, Panel, Stat } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { getAuditLog, getUsageOverview } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Overview" };

const SIGNAL_COLOR: Record<string, string> = {
  favorable: "#65a30d",
  mixed: "#d97706",
  unfavorable: "#dc2626",
};

export default async function AdminOverview() {
  // Gate BEFORE any service-role fetch — the layout's notFound() alone doesn't
  // stop this page from rendering + fetching, which would leak data into the RSC
  // payload even under a 404.
  await requireAdmin();
  const [usage, audit] = await Promise.all([getUsageOverview(), getAuditLog(20)]);
  const sigEntries = Object.entries(usage.signalDist).sort((a, b) => b[1] - a[1]);
  const sigMax = Math.max(1, ...sigEntries.map((e) => e[1]));

  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold">Platform overview</h1>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Users" value={usage.userCount} />
        <Stat label="Farms" value={usage.farmCount} />
        <Stat label="Active 7d" value={usage.activeLast7d} sub="signed in" />
        <Stat label="Reads 24h" value={usage.generations.last24h} sub="engine reads" />
        <Stat
          label="Read issues"
          value={usage.generations.errors}
          tone={usage.generations.errors > 0 ? "#dc2626" : undefined}
          sub="gaps / failed sources"
        />
        <Stat
          label="Avg latency"
          value={usage.generations.avgLatencyMs != null ? `${(usage.generations.avgLatencyMs / 1000).toFixed(1)}s` : "—"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Engine signal mix" hint={`${usage.generations.total} recent reads`}>
          {sigEntries.length === 0 ? (
            <p className="text-[11px] text-[var(--text-tertiary,#78716c)]">No generations yet.</p>
          ) : (
            <ul className="space-y-1">
              {sigEntries.map(([sig, n]) => (
                <li key={sig} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 shrink-0 capitalize text-[var(--text-secondary,#a8a29e)]">{sig}</span>
                  <span className="relative h-3 flex-1 rounded-sm bg-[var(--border,#292524)]/40">
                    <span
                      className="absolute inset-y-0 left-0 rounded-sm"
                      style={{ width: `${(n / sigMax) * 100}%`, background: SIGNAL_COLOR[sig] ?? "#78716c" }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/telemetry"
            className="mt-3 inline-block text-[11px] text-[var(--accent,#d97706)] hover:underline"
          >
            → deep engine analysis (telemetry console)
          </Link>
        </Panel>

        <Panel title="Admin audit log" hint="sensitive actions">
          {audit.length === 0 ? (
            <p className="text-[11px] text-[var(--text-tertiary,#78716c)]">
              No admin actions logged yet (or the audit table isn&apos;t migrated).
            </p>
          ) : (
            <ul className="space-y-1.5">
              {audit.map((a) => (
                <li key={a.id} className="flex items-baseline gap-2 text-[11px]">
                  <span className="w-16 shrink-0 text-right text-[var(--text-tertiary,#78716c)]">{ago(a.createdAt)}</span>
                  <span
                    className="shrink-0 rounded px-1 text-[10px] uppercase"
                    style={{
                      background: a.action.startsWith("impersonate") ? "#d9770622" : a.action === "delete_user" ? "#dc262622" : "#44403c55",
                      color: a.action.startsWith("impersonate") ? "#d97706" : a.action === "delete_user" ? "#dc2626" : "#a8a29e",
                    }}
                  >
                    {a.action.replace(/_/g, " ")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text-secondary,#a8a29e)]">
                    {a.adminName ?? a.adminUserId.slice(0, 8)}
                    {a.targetName || a.targetUserId ? ` → ${a.targetName ?? a.targetUserId?.slice(0, 8)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
