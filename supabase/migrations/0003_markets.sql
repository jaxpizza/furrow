-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0003: Markets                                                   ║
-- ║ Farmer-entered basis (farm-scoped, RLS) + server-side market caches.     ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── basis_entries : the farmer's known basis per crop (futures + basis = cash) ─
-- This is the MANUAL-BASIS seam. Later swapped for a live Barchart feed, but the
-- table stays as the user's own override. One row per (farm, crop) — upserted.
create table if not exists public.basis_entries (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references public.farms (id) on delete cascade,
  crop          public.crop not null,
  basis_cents   numeric(8, 2) not null,            -- cents vs futures; may be negative
  elevator_name text,
  updated_at    timestamptz not null default now(),
  unique (farm_id, crop)
);
create index if not exists basis_entries_farm_id_idx on public.basis_entries (farm_id);

alter table public.basis_entries enable row level security;

create policy "basis_entries: all for member"
  on public.basis_entries for all
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

-- ════════════════════════════════════════════════════════════════════════════
-- MARKET CACHES (global, not farm-scoped — shared market data)
-- RLS is enabled with NO policies, so only the service-role key (used by the
-- server's market service) can read or write them. The browser never touches
-- these; pages fetch market data server-side.
-- ════════════════════════════════════════════════════════════════════════════

-- Last-known futures quote per symbol. Survives the free tier rotating a
-- commodity out for the week — we keep serving the last value with its timestamp.
create table if not exists public.market_quote_cache (
  symbol      text primary key,                    -- 'corn' | 'soybean'
  price       numeric(12, 4) not null,
  currency    text not null default 'USD',
  as_of       timestamptz not null,                -- provider's "updated" time
  fetched_at  timestamptz not null default now(),
  source      text not null default 'api-ninjas'   -- 'api-ninjas' | 'sample'
);

-- Daily close history per symbol (≈1y), stored so the chart always has data
-- even when a live fetch fails.
create table if not exists public.market_history_cache (
  symbol      text primary key,                    -- 'corn' | 'soybean'
  points      jsonb not null,                       -- [{ "t": "YYYY-MM-DD", "c": 4.81 }, ...]
  as_of       timestamptz not null,
  fetched_at  timestamptz not null default now(),
  source      text not null default 'api-ninjas'
);

-- The Claude sell/hold outlook per crop. Regenerated a few times a day, not per
-- page load, to control API cost.
create table if not exists public.market_outlook_cache (
  crop          public.crop primary key,
  signal        text not null,                      -- 'favorable' | 'mixed' | 'unfavorable'
  summary       text not null,
  factors       jsonb not null,                     -- [{ "text": "...", "direction": "up|down|neutral" }]
  model         text not null,
  generated_at  timestamptz not null default now()
);

alter table public.market_quote_cache   enable row level security;
alter table public.market_history_cache enable row level security;
alter table public.market_outlook_cache enable row level security;
-- (no policies on purpose — service-role only)
