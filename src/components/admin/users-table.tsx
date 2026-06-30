"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { ago, fmtDate } from "@/components/admin/ui";
import type { AdminUser } from "@/lib/admin/queries";

type SortKey = "created" | "active" | "name";

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [q, setQ] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("active");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (adminOnly && !u.isAdmin) return false;
      if (!needle) return true;
      return (
        (u.email ?? "").toLowerCase().includes(needle) ||
        (u.fullName ?? "").toLowerCase().includes(needle) ||
        u.farms.some((f) => f.name.toLowerCase().includes(needle))
      );
    });
    const ts = (s: string | null) => (s ? Date.parse(s) : 0);
    return filtered.sort((a, b) => {
      if (sort === "name") return (a.fullName ?? a.email ?? "").localeCompare(b.fullName ?? b.email ?? "");
      if (sort === "created") return ts(b.createdAt) - ts(a.createdAt);
      return ts(b.lastSignInAt) - ts(a.lastSignInAt);
    });
  }, [users, q, adminOnly, sort]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search name / email / farm…"
          className="rounded border border-[var(--border,#292524)] bg-[var(--elevated,#1c1917)]/40 px-2 py-1 outline-none focus:border-[var(--accent,#d97706)]"
        />
        <label className="flex items-center gap-1 text-[var(--text-secondary,#a8a29e)]">
          <input type="checkbox" checked={adminOnly} onChange={(e) => setAdminOnly(e.target.checked)} />
          admins only
        </label>
        <span className="ml-auto text-[var(--text-tertiary,#78716c)]">sort:</span>
        {(["active", "created", "name"] as SortKey[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className="rounded border px-1.5 py-0.5"
            style={{
              borderColor: sort === s ? "var(--accent,#d97706)" : "var(--border,#292524)",
              color: sort === s ? "var(--accent,#d97706)" : "var(--text-secondary,#a8a29e)",
            }}
          >
            {s === "active" ? "last active" : s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded border border-[var(--border,#292524)]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border,#292524)] text-left text-[10px] uppercase text-[var(--text-tertiary,#78716c)]">
              <th className="px-3 py-1.5 font-medium">user</th>
              <th className="px-3 py-1.5 font-medium">email</th>
              <th className="px-3 py-1.5 font-medium">farms</th>
              <th className="px-3 py-1.5 font-medium">signed up</th>
              <th className="px-3 py-1.5 font-medium">last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border,#292524)]/50 hover:bg-[var(--elevated,#1c1917)]/60">
                <td className="px-3 py-1.5">
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-1.5 hover:text-[var(--accent,#d97706)]">
                    <span className="font-medium">{u.fullName ?? "—"}</span>
                    {u.isAdmin && (
                      <span className="rounded bg-[var(--accent,#d97706)]/15 px-1 text-[9px] uppercase text-[var(--accent,#d97706)]">
                        admin
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-[var(--text-secondary,#a8a29e)]">{u.email ?? "—"}</td>
                <td className="px-3 py-1.5 text-[var(--text-secondary,#a8a29e)]">
                  {u.farms.length === 0 ? <span className="text-[var(--text-tertiary,#78716c)]">none</span> : u.farms.map((f) => `${f.name} (${f.state})`).join(", ")}
                </td>
                <td className="px-3 py-1.5 tabular-nums text-[var(--text-secondary,#a8a29e)]">{fmtDate(u.createdAt)}</td>
                <td className="px-3 py-1.5 tabular-nums text-[var(--text-secondary,#a8a29e)]">{ago(u.lastSignInAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--text-tertiary,#78716c)]">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
