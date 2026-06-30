import { UsersTable } from "@/components/admin/users-table";
import { requireAdmin } from "@/lib/admin";
import { listUsers } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Users" };

export default async function UsersPage() {
  // Gate BEFORE the service-role fetch (see /admin/page.tsx) — prevents leaking
  // user data into the RSC payload under the layout's 404.
  await requireAdmin();
  const users = await listUsers();
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h1 className="text-[15px] font-semibold">Users</h1>
        <span className="text-[11px] text-[var(--text-tertiary,#78716c)]">{users.length} total</span>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
