-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0015: Inputs as a transaction LEDGER (expenses / harvest / sales) ║
-- ║ Replaces the single-row calculator (input_cost_items + crop_positions) with  ║
-- ║ logged entries the app tallies. Everything per crop + CROP YEAR (tagged from   ║
-- ║ day one for year-over-year later). The expense-ledger SUM still feeds the        ║
-- ║ existing breakeven_targets.cost_per_acre — the SAME break-even markets/terminal/  ║
-- ║ alerts read; not forked. Farm-scoped via is_farm_member, like everything else.    ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- Retire the single-row approach — superseded by the logged ledgers below.
drop table if exists public.input_cost_items;
drop table if exists public.crop_positions;

-- ── storage locations (farm-wide; grain is logged in/out of these) ───────────
create table if not exists public.storage_locations (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references public.farms (id) on delete cascade,
  name        text not null,
  kind        text not null default 'owned' check (kind in ('owned', 'commercial')),
  capacity_bu numeric(14, 1),
  -- commercial only: what it costs to keep grain here
  storage_cost_cents_per_bu_month numeric(8, 2),
  created_at  timestamptz not null default now()
);
create index if not exists storage_locations_farm_idx on public.storage_locations (farm_id);
alter table public.storage_locations enable row level security;
create policy "storage_locations: all for member" on public.storage_locations
  for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));

-- ── per crop-year settings: acres + expected yield (drive the break-even) ─────
create table if not exists public.crop_year_settings (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid not null references public.farms (id) on delete cascade,
  crop           public.crop not null,
  crop_year      integer not null,
  acres          numeric(10, 1),
  expected_yield numeric(8, 2),
  updated_at     timestamptz not null default now(),
  unique (farm_id, crop, crop_year)
);
create index if not exists crop_year_settings_farm_idx on public.crop_year_settings (farm_id);
alter table public.crop_year_settings enable row level security;
create policy "crop_year_settings: all for member" on public.crop_year_settings
  for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));

-- ── LEDGER 1: expense entries (line_total = unit_cost × quantity, computed) ───
create table if not exists public.expense_entries (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references public.farms (id) on delete cascade,
  crop        public.crop not null,
  crop_year   integer not null,
  category    text not null,
  description text,
  unit_cost   numeric(14, 4) not null default 0,
  quantity    numeric(14, 2) not null default 1,
  line_total  numeric(18, 2) generated always as (round(unit_cost * quantity, 2)) stored,
  entry_date  date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists expense_entries_lookup_idx
  on public.expense_entries (farm_id, crop, crop_year);
alter table public.expense_entries enable row level security;
create policy "expense_entries: all for member" on public.expense_entries
  for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));

-- ── LEDGER 2: harvest entries (grain logged INTO a storage location) ─────────
create table if not exists public.harvest_entries (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references public.farms (id) on delete cascade,
  crop                public.crop not null,
  crop_year           integer not null,
  bushels             numeric(16, 1) not null,
  storage_location_id uuid references public.storage_locations (id) on delete set null,
  entry_date          date not null default current_date,
  moisture            numeric(5, 2),
  notes               text,
  created_at          timestamptz not null default now()
);
create index if not exists harvest_entries_lookup_idx
  on public.harvest_entries (farm_id, crop, crop_year);
alter table public.harvest_entries enable row level security;
create policy "harvest_entries: all for member" on public.harvest_entries
  for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));

-- ── LEDGER 3: sale entries (grain logged OUT OF a storage location) ──────────
create table if not exists public.sale_entries (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references public.farms (id) on delete cascade,
  crop                public.crop not null,
  crop_year           integer not null,
  bushels             numeric(16, 1) not null,
  storage_location_id uuid references public.storage_locations (id) on delete set null,
  price               numeric(10, 4) not null,
  buyer               text,
  entry_date          date not null default current_date,
  created_at          timestamptz not null default now()
);
create index if not exists sale_entries_lookup_idx
  on public.sale_entries (farm_id, crop, crop_year);
alter table public.sale_entries enable row level security;
create policy "sale_entries: all for member" on public.sale_entries
  for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));
