-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0005: Break-Even Alert Engine                                  ║
-- ║ The farmer sets a per-crop break-even (and optional profit target); the ║
-- ║ engine watches the LOCAL CASH PRICE (futures + basis, from the markets  ║
-- ║ layer) and fires a one-time alert the moment cash crosses up through a  ║
-- ║ threshold. Hysteresis state lives in alert_state so a price hovering at ║
-- ║ the line never spams. All three tables are farm-private → RLS via       ║
-- ║ is_farm_member(farm_id), same pattern as basis_entries.                 ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.alert_entry_mode as enum ('per_bushel', 'per_acre_yield');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_threshold_type as enum ('breakeven', 'profit_target');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_status as enum ('unread', 'read', 'dismissed');
exception when duplicate_object then null; end $$;

-- ── breakeven_targets : the farmer's cost / target per crop ───────────────────
create table if not exists public.breakeven_targets (
  id                       uuid primary key default gen_random_uuid(),
  farm_id                  uuid not null references public.farms (id) on delete cascade,
  crop                     public.crop not null,
  entry_mode               public.alert_entry_mode not null default 'per_bushel',
  cost_per_bushel          numeric(10, 4),   -- used when entry_mode = 'per_bushel'
  cost_per_acre            numeric(12, 2),   -- used when entry_mode = 'per_acre_yield'
  expected_yield           numeric(8, 2),    -- bu/acre, divides cost_per_acre
  profit_target_per_bushel numeric(10, 4),   -- optional: alert above break-even by this much
  -- single source of truth for the effective break-even ($/bushel). Derived in
  -- the DB so it can never drift from the inputs, whichever entry mode is used.
  effective_breakeven      numeric(10, 4) generated always as (
    case
      when entry_mode = 'per_bushel' then cost_per_bushel
      when expected_yield is not null and expected_yield > 0
        then round(cost_per_acre / expected_yield, 4)
      else null
    end
  ) stored,
  active                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (farm_id, crop)
);
create index if not exists breakeven_targets_farm_id_idx
  on public.breakeven_targets (farm_id);

alter table public.breakeven_targets enable row level security;

create policy "breakeven_targets: all for member"
  on public.breakeven_targets for all
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

-- ── alert_state : per-threshold hysteresis ledger (engine-internal) ───────────
-- One row per (target, threshold_type). `armed` = eligible to fire on the next
-- upward cross. After a fire we DISARM; we re-arm only when the cash price has
-- dropped meaningfully below the line OR a cooldown window has elapsed. This is
-- what makes the engine fire once per genuine crossing instead of spamming
-- while the price hovers at break-even.
create table if not exists public.alert_state (
  id                   uuid primary key default gen_random_uuid(),
  target_id            uuid not null references public.breakeven_targets (id) on delete cascade,
  farm_id              uuid not null references public.farms (id) on delete cascade,
  threshold_type       public.alert_threshold_type not null,
  armed                boolean not null default true,
  last_fired_at        timestamptz,
  last_threshold_price numeric(10, 4),
  updated_at           timestamptz not null default now(),
  unique (target_id, threshold_type)
);
create index if not exists alert_state_farm_id_idx on public.alert_state (farm_id);

alter table public.alert_state enable row level security;

create policy "alert_state: all for member"
  on public.alert_state for all
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

-- ── price_alerts : the fired-alert feed (newest first) ────────────────────────
create table if not exists public.price_alerts (
  id                 uuid primary key default gen_random_uuid(),
  farm_id            uuid not null references public.farms (id) on delete cascade,
  target_id          uuid not null references public.breakeven_targets (id) on delete cascade,
  crop               public.crop not null,
  threshold_type     public.alert_threshold_type not null,
  threshold_price    numeric(10, 4) not null,   -- the line the cash price crossed
  cash_price_at_fire numeric(10, 4) not null,
  basis_at_fire      numeric(8, 2),
  futures_at_fire    numeric(10, 4),
  fired_at           timestamptz not null default now(),
  status             public.alert_status not null default 'unread',
  -- ['in_app'] now; 'email' / 'sms' slot in later without a schema change.
  delivered_channels jsonb not null default '["in_app"]'::jsonb
);
create index if not exists price_alerts_farm_fired_idx
  on public.price_alerts (farm_id, fired_at desc);
create index if not exists price_alerts_unread_idx
  on public.price_alerts (farm_id) where status = 'unread';

alter table public.price_alerts enable row level security;

create policy "price_alerts: all for member"
  on public.price_alerts for all
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));
