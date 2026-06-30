-- 0017_admin.sql
-- Platform-admin panel: an audit log for sensitive admin actions (esp. view-as
-- impersonation) and admin-scoped RLS on the farmer tables so an admin can read
-- a tester's data (view-as) and help set them up. All admin access is gated by
-- the existing is_admin() SECURITY DEFINER predicate (0013); non-admins keep only
-- their is_farm_member() access, so the wall holds.

-- ── audit log ────────────────────────────────────────────────────────────────
-- Every sensitive admin action lands here: impersonate_start / impersonate_end,
-- toggle_admin, delete_user, edit_user. Read is admin-only; rows are written by
-- the service-role client from requireAdmin()-gated server actions.
create table if not exists public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  admin_user_id  uuid not null references auth.users (id) on delete cascade,
  action         text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  detail         jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
create policy "audit admin read" on public.admin_audit_log
  for select using (public.is_admin());
create policy "audit admin write" on public.admin_audit_log
  for insert with check (public.is_admin());

-- ── admin RLS on the farmer tables ───────────────────────────────────────────
-- Additive is_admin() policies. Postgres ORs policies for the same command, so a
-- row is reachable when is_farm_member(farm_id) OR is_admin(). Non-admins are
-- unaffected (is_admin() returns false for them). These let the admin's own
-- session read any tester's data during view-as and write on their behalf when
-- helping them get set up.

-- read + write (view-as + help-them-setup edits the farmer forms write):
create policy "breakeven_targets admin all" on public.breakeven_targets
  for all using (public.is_admin()) with check (public.is_admin());
create policy "basis_entries admin all" on public.basis_entries
  for all using (public.is_admin()) with check (public.is_admin());
create policy "expense_entries admin all" on public.expense_entries
  for all using (public.is_admin()) with check (public.is_admin());
create policy "harvest_entries admin all" on public.harvest_entries
  for all using (public.is_admin()) with check (public.is_admin());
create policy "sale_entries admin all" on public.sale_entries
  for all using (public.is_admin()) with check (public.is_admin());
create policy "storage_locations admin all" on public.storage_locations
  for all using (public.is_admin()) with check (public.is_admin());
create policy "crop_year_settings admin all" on public.crop_year_settings
  for all using (public.is_admin()) with check (public.is_admin());
create policy "price_alerts admin all" on public.price_alerts
  for all using (public.is_admin()) with check (public.is_admin());
create policy "alert_state admin all" on public.alert_state
  for all using (public.is_admin()) with check (public.is_admin());
create policy "fields admin all" on public.fields
  for all using (public.is_admin()) with check (public.is_admin());

-- read only (context for the panel + view-as; structural changes stay service-role):
create policy "farms admin read" on public.farms
  for select using (public.is_admin());
create policy "farm_members admin read" on public.farm_members
  for select using (public.is_admin());
create policy "plantings admin read" on public.plantings
  for select using (public.is_admin());
create policy "harvests admin read" on public.harvests
  for select using (public.is_admin());
