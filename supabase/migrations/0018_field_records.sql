-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0018: per-field records — tag a harvest to the field it came from     ║
-- ║ Adds an OPTIONAL field_id to the harvest ledger (harvest_entries) so a farmer   ║
-- ║ can build per-field yield history — bushels, and bu/acre from fields.acreage.   ║
-- ║ Planting-per-field already exists (public.plantings, from 0001).                ║
-- ║                                                                                  ║
-- ║ Field selection stays OPTIONAL: field_id is nullable and defaults to null, so    ║
-- ║ farm-level harvest logging (quick-add + Inputs) is unchanged — a harvest with a  ║
-- ║ field still counts toward the SAME farm position (harvest_entries is the one      ║
-- ║ ledger, not forked). Harvest RLS stays farm-scoped (is_farm_member); the field    ║
-- ║ picker only offers the farm's own fields. on delete set null: dropping a field    ║
-- ║ never deletes the harvest, it just un-tags it.                                    ║
-- ╚════════════════════════════════════════════════════════════════════════════════╝

alter table public.harvest_entries
  add column if not exists field_id uuid references public.fields (id) on delete set null;

create index if not exists harvest_entries_field_idx
  on public.harvest_entries (field_id);
