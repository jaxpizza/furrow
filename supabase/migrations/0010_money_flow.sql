-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0010: Money Flow bucket (Phase C)                              ║
-- ║ CFTC Commitment of Traders — Managed Money net position for corn & soy.  ║
-- ║ The percentile of the net position in its own multi-year history is the   ║
-- ║ headline frame (extreme = crowded trade, often contrarian). Stored as a    ║
-- ║ HISTORICAL time series (one row per weekly report — never overwrite) for    ║
-- ║ the backtest. Global derived data → RLS on, NO policies (service-role only).  ║
-- ╚════════════════════════════════════════════════════════════════════════╝

create table if not exists public.cot_cache (
  id           uuid primary key default gen_random_uuid(),
  crop         public.crop not null,
  report_date  date not null,        -- positions as of this Tuesday
  payload      jsonb not null,       -- managed-money long/short/net + OI + frames + percentile
  source_url   text,
  released_at  timestamptz,
  fetched_at   timestamptz not null default now(),
  unique (crop, report_date)
);
create index if not exists cot_cache_lookup_idx
  on public.cot_cache (crop, report_date desc);

alter table public.cot_cache enable row level security;
-- (no policies on purpose — service-role only)
