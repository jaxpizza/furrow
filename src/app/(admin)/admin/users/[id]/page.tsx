import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel, Stat, YesNo, ago, fmtDate } from "@/components/admin/ui";
import { UserManage } from "@/components/admin/user-manage";
import { requireAdmin } from "@/lib/admin";
import { getUserDetail } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · User" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAdmin();
  const d = await getUserDetail(id);
  if (!d) notFound();

  const isSelf = ctx.user!.id === d.user.id;

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="text-[11px] text-[var(--text-tertiary,#78716c)] hover:text-[var(--accent,#d97706)]">
        ← all users
      </Link>

      {/* identity + manage */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold">{d.user.fullName ?? "(no name)"}</h1>
            {d.user.isAdmin && (
              <span className="rounded bg-[var(--accent,#d97706)]/15 px-1.5 py-0.5 text-[10px] uppercase text-[var(--accent,#d97706)]">
                admin
              </span>
            )}
            {isSelf && <span className="text-[10px] text-[var(--text-tertiary,#78716c)]">(you)</span>}
          </div>
          <div className="text-[12px] text-[var(--text-secondary,#a8a29e)]">{d.user.email ?? "—"}</div>
          <div className="text-[11px] text-[var(--text-tertiary,#78716c)]">
            joined {fmtDate(d.user.createdAt)} · last active {ago(d.user.lastSignInAt)} · <span className="font-mono">{d.user.id}</span>
          </div>
        </div>
        <UserManage
          targetUserId={d.user.id}
          targetName={d.user.fullName ?? ""}
          isAdmin={d.user.isAdmin}
          isSelf={isSelf}
        />
      </div>

      {/* setup checklist — the "stuck tester" signal */}
      <Panel title="Setup progress" hint="what they've actually populated">
        <div className="flex flex-wrap gap-1.5">
          <YesNo ok={d.setup.hasFarm} label="Farm" />
          <YesNo ok={d.setup.hasFields} label="Fields" />
          <YesNo ok={d.setup.hasBreakeven} label="Break-even" />
          <YesNo ok={d.setup.hasExpenses} label="Expenses" />
          <YesNo ok={d.setup.hasHarvest} label="Harvest" />
          <YesNo ok={d.setup.hasSales} label="Sales" />
          <YesNo ok={d.setup.hasAlerts} label="Alerts" />
        </div>
      </Panel>

      {/* counts */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Farms" value={d.farms.length} />
        <Stat label="Fields" value={d.farms.reduce((s, f) => s + f.fieldCount, 0)} />
        <Stat label="Cost logged" value={`$${d.ledger.expenseTotal.toLocaleString()}`} sub={`${d.ledger.expenseCount} entries`} />
        <Stat label="Harvest" value={`${d.ledger.harvestBushels.toLocaleString()} bu`} sub={`${d.ledger.harvestCount} loads`} />
        <Stat label="Sales" value={`${d.ledger.salesBushels.toLocaleString()} bu`} sub={`$${d.ledger.salesRevenue.toLocaleString()} · ${d.ledger.salesCount}`} />
        <Stat label="Alerts" value={d.alertCount} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* farms */}
        <Panel title="Farms & fields">
          {d.farms.length === 0 ? (
            <p className="text-[11px] text-[var(--text-tertiary,#78716c)]">No farm created yet.</p>
          ) : (
            <ul className="space-y-1 text-[11px]">
              {d.farms.map((f) => (
                <li key={f.id} className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--text-secondary,#a8a29e)]">
                    {f.name} <span className="text-[var(--text-tertiary,#78716c)]">({f.state}) · {f.role}</span>
                  </span>
                  <span className="tabular-nums text-[var(--text-tertiary,#78716c)]">{f.fieldCount} fields</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* break-evens */}
        <Panel title="Break-even targets">
          {d.breakevens.length === 0 ? (
            <p className="text-[11px] text-[var(--text-tertiary,#78716c)]">None set.</p>
          ) : (
            <ul className="space-y-1 text-[11px]">
              {d.breakevens.map((b, i) => (
                <li key={`${b.farmId}-${b.crop}-${i}`} className="flex items-baseline justify-between gap-2">
                  <span className="capitalize text-[var(--text-secondary,#a8a29e)]">{b.crop}</span>
                  <span className="tabular-nums">
                    {b.effective != null ? `$${b.effective.toFixed(2)}/bu` : <span className="text-[var(--text-tertiary,#78716c)]">no value</span>}
                    <span className="ml-2 text-[var(--text-tertiary,#78716c)]">{b.entryMode}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {d.ledger.cropYears.length > 0 && (
            <div className="mt-2 border-t border-[var(--border,#292524)]/50 pt-2 text-[11px] text-[var(--text-tertiary,#78716c)]">
              {d.ledger.cropYears.map((c, i) => (
                <div key={i} className="tabular-nums">
                  {c.crop} {c.cropYear}: {c.acres ?? "—"} ac · {c.expectedYield ?? "—"} bu/ac
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
