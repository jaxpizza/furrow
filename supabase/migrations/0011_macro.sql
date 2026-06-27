-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0011: Macro bucket (Phase D)                                   ║
-- ║ Second-order context signals: US dollar index, crude oil, and Corn Belt   ║
-- ║ "market weather" (distinct from a single farm's field weather). Each is     ║
-- ║ reference-framed at ingestion with its directional logic and stored as a     ║
-- ║ HISTORICAL time series (one row per signal per as-of date — never overwrite). ║
-- ║ Global derived data → RLS on, NO policies (service-role only).               ║
-- ╚════════════════════════════════════════════════════════════════════════╝

create table if not exists public.macro_cache (
  id          uuid primary key default gen_random_uuid(),
  signal_type text not null,        -- 'dollar' | 'crude' | 'macro_weather'
  as_of       date not null,
  payload     jsonb not null,       -- { weight, frames[] } (raw + directional frames)
  source_url  text,
  fetched_at  timestamptz not null default now(),
  unique (signal_type, as_of)
);
create index if not exists macro_cache_lookup_idx
  on public.macro_cache (signal_type, as_of desc);

alter table public.macro_cache enable row level security;
-- (no policies on purpose — service-role only)
