-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0009: Demand bucket (Phase B)                                   ║
-- ║ Weekly Export Sales (+ China), ethanol grind, and soybean crush — each   ║
-- ║ reference-framed at ingestion (pace-vs-target the headline frame) and     ║
-- ║ stored as a HISTORICAL time series (one row per period — never overwrite)  ║
-- ║ for the future backtest. Global derived data → RLS on, NO policies        ║
-- ║ (service-role only), same as the other caches.                            ║
-- ╚════════════════════════════════════════════════════════════════════════╝

create table if not exists public.usda_demand_cache (
  id            uuid primary key default gen_random_uuid(),
  data_type     text not null,        -- 'export_sales'|'flash_sale'|'ethanol'|'crush'
  crop          public.crop not null,
  marketing_year text not null,
  period        text not null,        -- 'week ending 2026-06-19' / 'APR 2026' (history key)
  payload       jsonb not null,       -- framed values (raw + frames)
  source_url    text,
  released_at   timestamptz,
  fetched_at    timestamptz not null default now(),
  unique (data_type, crop, period)
);
create index if not exists usda_demand_cache_lookup_idx
  on public.usda_demand_cache (data_type, crop, fetched_at desc);

alter table public.usda_demand_cache enable row level security;
-- (no policies on purpose — service-role only)
