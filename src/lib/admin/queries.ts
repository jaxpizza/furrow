import "server-only";

import { assertAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Admin reads run with the service-role client, in code that is only reachable
// behind requireAdmin() (the (admin) layout) — a non-admin 404s before any of
// this executes, and cannot read the underlying tables directly either (RLS).

export type AdminUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  isAdmin: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  farms: { id: string; name: string; state: string; role: string }[];
};

type FarmRow = { id: string; name: string; state: string };
type MemberRow = { user_id: string; role: string; farms: FarmRow | null };

/** All users — auth metadata (email/created/last-sign-in) + profile + their farms. */
export async function listUsers(): Promise<AdminUser[]> {
  await assertAdmin();
  const db = createServiceRoleClient();
  const [{ data: auth }, { data: profiles }, { data: members }] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("profiles").select("id, full_name, is_admin, created_at"),
    db.from("farm_members").select("user_id, role, farms (id, name, state)"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const farmsByUser = new Map<string, AdminUser["farms"]>();
  for (const m of (members ?? []) as unknown as MemberRow[]) {
    if (!m.farms) continue;
    const list = farmsByUser.get(m.user_id) ?? [];
    list.push({ id: m.farms.id, name: m.farms.name, state: m.farms.state, role: m.role });
    farmsByUser.set(m.user_id, list);
  }

  return (auth?.users ?? []).map((u) => {
    const p = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? null,
      fullName: p?.full_name ?? null,
      isAdmin: p?.is_admin ?? false,
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      farms: farmsByUser.get(u.id) ?? [],
    };
  });
}

export type UserDetail = {
  user: AdminUser;
  farms: { id: string; name: string; state: string; role: string; fieldCount: number }[];
  breakevens: { farmId: string; crop: string; effective: number | null; entryMode: string; expectedYield: number | null }[];
  ledger: {
    expenseTotal: number;
    expenseCount: number;
    harvestBushels: number;
    harvestCount: number;
    salesBushels: number;
    salesCount: number;
    salesRevenue: number;
    storageCount: number;
    cropYears: { crop: string; cropYear: number; acres: number | null; expectedYield: number | null }[];
  };
  alertCount: number;
  setup: {
    hasFarm: boolean;
    hasFields: boolean;
    hasBreakeven: boolean;
    hasExpenses: boolean;
    hasHarvest: boolean;
    hasSales: boolean;
    hasAlerts: boolean;
  };
};

/** Deep view of one user — their farms, break-evens, ledger totals, alerts, and
 *  which parts of setup they've actually populated (the "stuck tester" signal). */
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  await assertAdmin();
  const db = createServiceRoleClient();
  const [{ data: authData }, { data: profile }, { data: members }] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from("profiles").select("id, full_name, is_admin, created_at").eq("id", userId).maybeSingle(),
    db.from("farm_members").select("user_id, role, farms (id, name, state)").eq("user_id", userId),
  ]);
  if (!authData?.user && !profile) return null;

  const memberRows = (members ?? []) as unknown as MemberRow[];
  const farmIds = memberRows.map((m) => m.farms?.id).filter((id): id is string => !!id);

  const empty = { data: [] as never[] };
  const [exp, harv, sal, stor, cys, be, fld, alerts] = farmIds.length
    ? await Promise.all([
        db.from("expense_entries").select("line_total").in("farm_id", farmIds),
        db.from("harvest_entries").select("bushels").in("farm_id", farmIds),
        db.from("sale_entries").select("bushels, price").in("farm_id", farmIds),
        db.from("storage_locations").select("id").in("farm_id", farmIds),
        db.from("crop_year_settings").select("crop, crop_year, acres, expected_yield").in("farm_id", farmIds),
        db.from("breakeven_targets").select("farm_id, crop, effective_breakeven, entry_mode, expected_yield").in("farm_id", farmIds),
        db.from("fields").select("id, farm_id").in("farm_id", farmIds),
        db.from("price_alerts").select("id").in("farm_id", farmIds),
      ])
    : [empty, empty, empty, empty, empty, empty, empty, empty];

  const expenseTotal = (exp.data ?? []).reduce((s, e: { line_total: number | null }) => s + (Number(e.line_total) || 0), 0);
  const harvestBushels = (harv.data ?? []).reduce((s, h: { bushels: number }) => s + (Number(h.bushels) || 0), 0);
  const salesBushels = (sal.data ?? []).reduce((s, x: { bushels: number }) => s + (Number(x.bushels) || 0), 0);
  const salesRevenue = (sal.data ?? []).reduce((s, x: { bushels: number; price: number }) => s + (Number(x.bushels) || 0) * (Number(x.price) || 0), 0);
  const fieldCountByFarm = new Map<string, number>();
  for (const f of (fld.data ?? []) as { id: string; farm_id: string }[]) {
    fieldCountByFarm.set(f.farm_id, (fieldCountByFarm.get(f.farm_id) ?? 0) + 1);
  }

  const user: AdminUser = {
    id: userId,
    email: authData?.user?.email ?? null,
    fullName: profile?.full_name ?? null,
    isAdmin: profile?.is_admin ?? false,
    createdAt: authData?.user?.created_at ?? null,
    lastSignInAt: authData?.user?.last_sign_in_at ?? null,
    farms: memberRows.filter((m) => m.farms).map((m) => ({ id: m.farms!.id, name: m.farms!.name, state: m.farms!.state, role: m.role })),
  };

  return {
    user,
    farms: memberRows
      .filter((m) => m.farms)
      .map((m) => ({ id: m.farms!.id, name: m.farms!.name, state: m.farms!.state, role: m.role, fieldCount: fieldCountByFarm.get(m.farms!.id) ?? 0 })),
    breakevens: (be.data ?? []).map((b: { farm_id: string; crop: string; effective_breakeven: number | null; entry_mode: string; expected_yield: number | null }) => ({
      farmId: b.farm_id,
      crop: b.crop,
      effective: b.effective_breakeven,
      entryMode: b.entry_mode,
      expectedYield: b.expected_yield,
    })),
    ledger: {
      expenseTotal: Math.round(expenseTotal * 100) / 100,
      expenseCount: (exp.data ?? []).length,
      harvestBushels,
      harvestCount: (harv.data ?? []).length,
      salesBushels,
      salesCount: (sal.data ?? []).length,
      salesRevenue: Math.round(salesRevenue),
      storageCount: (stor.data ?? []).length,
      cropYears: (cys.data ?? []).map((c: { crop: string; crop_year: number; acres: number | null; expected_yield: number | null }) => ({
        crop: c.crop,
        cropYear: c.crop_year,
        acres: c.acres,
        expectedYield: c.expected_yield,
      })),
    },
    alertCount: (alerts.data ?? []).length,
    setup: {
      hasFarm: farmIds.length > 0,
      hasFields: (fld.data ?? []).length > 0,
      hasBreakeven: (be.data ?? []).some((b: { effective_breakeven: number | null }) => b.effective_breakeven != null),
      hasExpenses: (exp.data ?? []).length > 0,
      hasHarvest: (harv.data ?? []).length > 0,
      hasSales: (sal.data ?? []).length > 0,
      hasAlerts: (alerts.data ?? []).length > 0,
    },
  };
}

export type UsageOverview = {
  userCount: number;
  farmCount: number;
  activeLast7d: number; // users who signed in within 7 days
  generations: { total: number; last24h: number; errors: number; sampleData: number; avgLatencyMs: number | null };
  signalDist: Record<string, number>;
};

/** Platform health: user/farm counts, sign-in activity, and recent engine
 *  generation stats (reusing the telemetry table) — "is it working for people". */
export async function getUsageOverview(): Promise<UsageOverview> {
  await assertAdmin();
  const db = createServiceRoleClient();
  const sevenDaysAgoMs = 7 * 24 * 60 * 60 * 1000;
  const dayAgoMs = 24 * 60 * 60 * 1000;
  const [{ data: auth }, { count: userCount }, { count: farmCount }, { data: tel }] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("profiles").select("*", { head: true, count: "exact" }),
    db.from("farms").select("*", { head: true, count: "exact" }),
    db.from("outlook_telemetry").select("generated_at, signal, latency_ms, sample_data, failed_sources, gaps").order("generated_at", { ascending: false }).limit(300),
  ]);

  const now = Date.now();
  const activeLast7d = (auth?.users ?? []).filter((u) => u.last_sign_in_at && now - Date.parse(u.last_sign_in_at) < sevenDaysAgoMs).length;

  const rows = tel ?? [];
  const lat: number[] = [];
  const signalDist: Record<string, number> = {};
  let errors = 0;
  let sampleData = 0;
  let last24h = 0;
  for (const r of rows as { generated_at: string; signal: string; latency_ms: number | null; sample_data: boolean; failed_sources: unknown; gaps: unknown }[]) {
    signalDist[r.signal] = (signalDist[r.signal] ?? 0) + 1;
    if (r.latency_ms != null) lat.push(r.latency_ms);
    if (r.sample_data) sampleData++;
    if (now - Date.parse(r.generated_at) < dayAgoMs) last24h++;
    const fs = Array.isArray(r.failed_sources) ? r.failed_sources.length : 0;
    const gp = Array.isArray(r.gaps) ? r.gaps.length : 0;
    if (fs > 0 || gp > 0) errors++;
  }

  return {
    userCount: userCount ?? 0,
    farmCount: farmCount ?? 0,
    activeLast7d,
    generations: {
      total: rows.length,
      last24h,
      errors,
      sampleData,
      avgLatencyMs: lat.length ? Math.round(lat.reduce((s, v) => s + v, 0) / lat.length) : null,
    },
    signalDist,
  };
}

export type AuditEntry = {
  id: string;
  action: string;
  adminUserId: string;
  adminName: string | null;
  targetUserId: string | null;
  targetName: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

/** Recent admin actions from the audit log (impersonation, toggles, deletes). */
export async function getAuditLog(limit = 50): Promise<AuditEntry[]> {
  await assertAdmin();
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("admin_audit_log")
    .select("id, action, admin_user_id, target_user_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return []; // table not yet migrated → empty

  const ids = [...new Set(data.flatMap((r) => [r.admin_user_id, r.target_user_id]).filter((x): x is string => !!x))];
  const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return data.map((r) => ({
    id: r.id,
    action: r.action,
    adminUserId: r.admin_user_id,
    adminName: nameById.get(r.admin_user_id) ?? null,
    targetUserId: r.target_user_id,
    targetName: r.target_user_id ? (nameById.get(r.target_user_id) ?? null) : null,
    detail: (r.detail as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at,
  }));
}
