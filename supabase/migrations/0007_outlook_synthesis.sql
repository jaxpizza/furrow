-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0007: Outlook Engine, Stage 2 — grounded synthesis cache        ║
-- ║ Stores the structured market read Claude produces over the Stage 1       ║
-- ║ corpus. Keyed by (crop, corpus_hash): a given corpus state for a crop    ║
-- ║ has exactly one cached read, so a meaningful corpus change (new USDA     ║
-- ║ week or substantial new news → new hash) naturally busts the cache.      ║
-- ║ Global derived data → RLS enabled, NO policies (service-role only).      ║
-- ╚════════════════════════════════════════════════════════════════════════╝

create table if not exists public.market_outlook_v2 (
  id           uuid primary key default gen_random_uuid(),
  crop         public.crop not null,
  corpus_hash  text not null,        -- content hash of the inputs the read was built on
  payload      jsonb not null,       -- the full structured OutlookV2 (signal, summary, factors, …)
  model        text not null,
  generated_at timestamptz not null default now(),
  unique (crop, corpus_hash)
);
create index if not exists market_outlook_v2_crop_idx
  on public.market_outlook_v2 (crop, generated_at desc);

alter table public.market_outlook_v2 enable row level security;
-- (no policies on purpose — service-role only)
