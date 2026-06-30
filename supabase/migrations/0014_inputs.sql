-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0014: Inputs (itemized costs + holdings/position)               ║
-- ║ The farmer's real cost + position layer. Itemized per-acre costs sum into  ║
-- ║ breakeven_targets.cost_per_acre (entry_mode=per_acre_yield) — the SAME      ║
-- ║ break-even the markets card / terminal / alerts already read. Holdings give  ║
-- ║ the personal read the farmer's exposure (% sold / bushels remaining).         ║
-- ║ Both farm-scoped via the standard is_farm_member RLS, like breakeven_targets. ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── itemized per-acre cost of production, per (farm, crop) ───────────────────
-- The SUM of these line items is what gets written to breakeven_targets.cost_per_acre.
-- We keep the breakdown here so the farmer can edit individual categories; the
-- rolled-up break-even stays the single source of truth in breakeven_targets.
create table if not exists public.input_cost_items (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null references public.farms (id) on delete cascade,
  crop            public.crop not null,
  -- all $/acre, nullable (empty until the farmer enters their real numbers)
  seed            numeric(10, 2),
  fertilizer      numeric(10, 2),
  chemicals       numeric(10, 2),
  fuel_oil        numeric(10, 2),
  machinery       numeric(10, 2),
  labor           numeric(10, 2),
  land            numeric(10, 2),
  crop_insurance  numeric(10, 2),
  drying_storage  numeric(10, 2),
  interest        numeric(10, 2),
  other           numeric(10, 2),
  updated_at      timestamptz not null default now(),
  unique (farm_id, crop)
);
create index if not exists input_cost_items_farm_id_idx
  on public.input_cost_items (farm_id);

alter table public.input_cost_items enable row level security;
create policy "input_cost_items: all for member"
  on public.input_cost_items for all
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

-- ── holdings / marketing position, per (farm, crop) ──────────────────────────
-- bushels remaining (= produced − sold) and % sold are derived, not stored, so
-- they stay consistent. Available to the personal read layer (exposure).
create table if not exists public.crop_positions (
  id                   uuid primary key default gen_random_uuid(),
  farm_id              uuid not null references public.farms (id) on delete cascade,
  crop                 public.crop not null,
  total_production_bu  numeric(12, 1),
  bushels_sold         numeric(12, 1),
  avg_sold_price       numeric(10, 4),
  updated_at           timestamptz not null default now(),
  unique (farm_id, crop)
);
create index if not exists crop_positions_farm_id_idx
  on public.crop_positions (farm_id);

alter table public.crop_positions enable row level security;
create policy "crop_positions: all for member"
  on public.crop_positions for all
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));
