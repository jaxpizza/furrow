-- 0020_app_mode.sql
-- Per-user app mode: 'simple' (the calm one-screen default) or 'full' (the whole
-- app). New users start in SIMPLE. Existing testers who already carry real data
-- are moved to FULL so nothing they set up disappears — it's one toggle away.

alter table public.profiles
  add column if not exists app_mode text not null default 'simple'
  check (app_mode in ('simple', 'full'));

-- Least-disruptive backfill: anyone whose farm already holds ledger / break-even /
-- crop-year data is an existing tester → keep them in the full app.
update public.profiles p
set app_mode = 'full'
where p.app_mode <> 'full'
  and p.id in (
    select fm.user_id
    from public.farm_members fm
    where fm.farm_id in (
      select farm_id from public.expense_entries
      union select farm_id from public.harvest_entries
      union select farm_id from public.sale_entries
      union select farm_id from public.breakeven_targets
      union select farm_id from public.crop_year_settings
    )
  );

-- RLS is unchanged: the existing profiles policies (id = auth.uid()) already scope
-- reads/writes of this column to the owning user. No new policy needed.
