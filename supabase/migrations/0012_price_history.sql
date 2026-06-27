-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0012: Price history (Phase E — Technicals)                     ║
-- ║ An append-only daily close series per crop, so technicals and the future  ║
-- ║ backtest have a REAL time series (the market_history_cache is a TTL'd blob   ║
-- ║ that gets overwritten). `source` records real vs sample per row — when a     ║
-- ║ paid/real feed arrives, real rows upsert over sample ones. RLS on, no         ║
-- ║ policies (service-role only).                                                 ║
-- ╚════════════════════════════════════════════════════════════════════════╝

create table if not exists public.price_history (
  id      uuid primary key default gen_random_uuid(),
  crop    public.crop not null,
  date    date not null,
  close   numeric not null,
  open    numeric,
  high    numeric,
  low     numeric,
  source  text not null,            -- 'sample' | live provider name
  unique (crop, date)
);
create index if not exists price_history_lookup_idx
  on public.price_history (crop, date desc);

alter table public.price_history enable row level security;
-- (no policies on purpose — service-role only)
