-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — Phase 1 schema                                                  ║
-- ║ Multi-tenant from day one. PostGIS enabled. RLS on every table.          ║
-- ║ Tenancy boundary = the farm. Access is granted via farm_members.         ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type public.member_role as enum ('owner', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tenure as enum ('owned', 'cash_rent', 'crop_share');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.crop as enum ('corn', 'soybean');
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ════════════════════════════════════════════════════════════════════════════

-- profiles : 1:1 with auth.users
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- farms : a tenant
create table if not exists public.farms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  state       text not null default 'IL',
  created_at  timestamptz not null default now()
);
create index if not exists farms_owner_id_idx on public.farms (owner_id);

-- farm_members : who can access a farm, and in what role
create table if not exists public.farm_members (
  farm_id     uuid not null references public.farms (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.member_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique (farm_id, user_id)
);
create index if not exists farm_members_user_id_idx on public.farm_members (user_id);
create index if not exists farm_members_farm_id_idx on public.farm_members (farm_id);

-- fields : a parcel of ground. geom is nullable until the field map (Phase 2).
create table if not exists public.fields (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references public.farms (id) on delete cascade,
  name          text not null,
  geom          geometry(Polygon, 4326),
  acreage       numeric(10, 2),
  tenure        public.tenure not null default 'owned',
  rent_per_acre numeric(10, 2),
  created_at    timestamptz not null default now()
);
create index if not exists fields_farm_id_idx on public.fields (farm_id);
create index if not exists fields_geom_gix on public.fields using gist (geom);

-- plantings : crop per field per year (a field rotates crops). One per year.
create table if not exists public.plantings (
  id            uuid primary key default gen_random_uuid(),
  field_id      uuid not null references public.fields (id) on delete cascade,
  crop_year     int not null,
  crop          public.crop not null,
  planted_date  date,
  created_at    timestamptz not null default now(),
  unique (field_id, crop_year)
);
create index if not exists plantings_field_id_idx on public.plantings (field_id);

-- ── Stub tables (structure + RLS now; no UI until later phases) ──────────────

create table if not exists public.input_purchases (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null references public.farms (id) on delete cascade,
  crop_year       int,
  category        text,
  product         text,
  quantity        numeric(12, 2),
  unit            text,
  unit_cost       numeric(12, 2),
  total_cost      numeric(14, 2),
  purchased_date  date,
  created_at      timestamptz not null default now()
);
create index if not exists input_purchases_farm_id_idx on public.input_purchases (farm_id);

create table if not exists public.harvests (
  id              uuid primary key default gen_random_uuid(),
  field_id        uuid not null references public.fields (id) on delete cascade,
  crop_year       int not null,
  bushels         numeric(14, 2),
  moisture        numeric(5, 2),
  yield_per_acre  numeric(10, 2),
  harvested_date  date,
  created_at      timestamptz not null default now()
);
create index if not exists harvests_field_id_idx on public.harvests (field_id);

create table if not exists public.grain_sales (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid not null references public.farms (id) on delete cascade,
  crop_year         int,
  crop              public.crop,
  bushels           numeric(14, 2),
  price_per_bushel  numeric(10, 4),
  buyer             text,
  contract_type     text,
  sale_date         date,
  created_at        timestamptz not null default now()
);
create index if not exists grain_sales_farm_id_idx on public.grain_sales (farm_id);

create table if not exists public.elevator_basis (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null references public.farms (id) on delete cascade,
  elevator_name   text,
  crop            public.crop,
  basis           numeric(10, 4),
  delivery_month  text,
  quoted_date     date,
  created_at      timestamptz not null default now()
);
create index if not exists elevator_basis_farm_id_idx on public.elevator_basis (farm_id);

-- ════════════════════════════════════════════════════════════════════════════
-- REUSABLE MEMBERSHIP CHECKS
-- SECURITY DEFINER so they read farm_members WITHOUT triggering that table's
-- own RLS — this is what prevents the classic infinite-recursion on policies
-- that reference the same table they protect.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.is_farm_member(f_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_members m
    where m.farm_id = f_id
      and m.user_id = auth.uid()
  );
$$;

-- Field-scoped tables (plantings, harvests) carry field_id, not farm_id.
-- Resolve the owning farm, then defer to is_farm_member.
create or replace function public.is_field_member(fl_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.fields f
    join public.farm_members m on m.farm_id = f.farm_id
    where f.id = fl_id
      and m.user_id = auth.uid()
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════

-- New auth user → profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- New farm → owner membership. SECURITY DEFINER so the bootstrap membership is
-- created regardless of farm_members' (restrictive) insert policy. This lets the
-- onboarding flow do a single insert (the farm) and get owner access for free.
create or replace function public.handle_new_farm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.farm_members (farm_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (farm_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_farm_created on public.farms;
create trigger on_farm_created
  after insert on public.farms
  for each row execute function public.handle_new_farm();

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles        enable row level security;
alter table public.farms           enable row level security;
alter table public.farm_members    enable row level security;
alter table public.fields          enable row level security;
alter table public.plantings       enable row level security;
alter table public.input_purchases enable row level security;
alter table public.harvests        enable row level security;
alter table public.grain_sales     enable row level security;
alter table public.elevator_basis  enable row level security;

-- ── profiles : a user sees/edits only their own row ─────────────────────────
create policy "profiles: select own"
  on public.profiles for select using (id = auth.uid());
create policy "profiles: insert own"
  on public.profiles for insert with check (id = auth.uid());
create policy "profiles: update own"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ── farms : members read; owner creates/edits/deletes ───────────────────────
create policy "farms: select member"
  on public.farms for select using (public.is_farm_member(id));
create policy "farms: insert as owner"
  on public.farms for insert with check (owner_id = auth.uid());
create policy "farms: update owner"
  on public.farms for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "farms: delete owner"
  on public.farms for delete using (owner_id = auth.uid());

-- ── farm_members : members read; the farm owner manages the roster ──────────
create policy "farm_members: select member"
  on public.farm_members for select using (public.is_farm_member(farm_id));
create policy "farm_members: insert by owner"
  on public.farm_members for insert
  with check ((select f.owner_id from public.farms f where f.id = farm_id) = auth.uid());
create policy "farm_members: update by owner"
  on public.farm_members for update
  using ((select f.owner_id from public.farms f where f.id = farm_id) = auth.uid());
create policy "farm_members: delete by owner"
  on public.farm_members for delete
  using ((select f.owner_id from public.farms f where f.id = farm_id) = auth.uid());

-- ── Farm-scoped tables : full read/write for any member of the farm ─────────
-- Identical shape across every table carrying a farm_id, all via is_farm_member.

create policy "fields: all for member"
  on public.fields for all
  using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));

create policy "input_purchases: all for member"
  on public.input_purchases for all
  using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));

create policy "grain_sales: all for member"
  on public.grain_sales for all
  using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));

create policy "elevator_basis: all for member"
  on public.elevator_basis for all
  using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));

-- ── Field-scoped tables : resolve farm via field, then is_field_member ──────

create policy "plantings: all for member"
  on public.plantings for all
  using (public.is_field_member(field_id)) with check (public.is_field_member(field_id));

create policy "harvests: all for member"
  on public.harvests for all
  using (public.is_field_member(field_id)) with check (public.is_field_member(field_id));
