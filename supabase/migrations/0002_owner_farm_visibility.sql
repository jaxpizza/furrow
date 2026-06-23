-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0002: an owner can always see their own farm                    ║
-- ╚════════════════════════════════════════════════════════════════════════╝
--
-- The 0001 farms SELECT policy was `is_farm_member(id)` only. A farm's owner
-- membership is created by the on_farm_created AFTER INSERT trigger, which fires
-- *after* Postgres evaluates the SELECT policy against an INSERT ... RETURNING
-- row. That made `insert(...).select()` on farms fail RLS for the very user who
-- just created the farm. Adding `owner_id = auth.uid()` makes a freshly-created
-- farm visible to its owner immediately (and is correct on its own merits — an
-- owner should always see their farm even if the membership row were missing).
--
-- The app (onboarding) no longer depends on RETURNING here, so this is safe to
-- apply at any time; it hardens the policy for any future insert-returning code.

drop policy if exists "farms: select member" on public.farms;

create policy "farms: select member"
  on public.farms for select
  using (owner_id = auth.uid() or public.is_farm_member(id));
