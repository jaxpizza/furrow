-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0006: Outlook Engine, Stage 1 — grounded data sources          ║
-- ║ Caches the REAL corpus a later synthesis step reasons over: USDA NASS    ║
-- ║ report data and ag-news RSS items. Every row is grounded — a source URL  ║
-- ║ and timestamp. Global derived data (not farm-private), so RLS is enabled ║
-- ║ with NO policies — service-role (server) only, like the market/weather   ║
-- ║ caches.                                                                  ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── usda_reports_cache : NASS Quick Stats, one row per query result ──────────
-- Keyed by (report type, crop, geography, period); payload is the normalized
-- data points. Refreshed daily — USDA figures don't change intraday.
create table if not exists public.usda_reports_cache (
  id           uuid primary key default gen_random_uuid(),
  report_type  text not null,          -- 'condition' | 'progress' | 'yield' | 'production'
  crop         public.crop not null,
  geography    text not null,          -- 'IL' | 'US'
  period       text not null,          -- marketing year, e.g. '2026'
  payload      jsonb not null,         -- normalized ReportDataPoint[]
  source_url   text,                   -- keyless, reproducible NASS query URL
  fetched_at   timestamptz not null default now(),
  unique (report_type, crop, geography, period)
);

alter table public.usda_reports_cache enable row level security;
-- (no policies on purpose — service-role only)

-- ── news_items_cache : ag-news RSS items, deduped by link ────────────────────
-- Refreshed a few times a day. The unique link is the dedup key so the same
-- article is never stored twice.
create table if not exists public.news_items_cache (
  id            uuid primary key default gen_random_uuid(),
  link          text not null unique,         -- dedup key
  source        text not null,
  title         text not null,
  summary       text,
  published_at  timestamptz,
  crop_tags     jsonb not null default '[]'::jsonb,  -- ['corn','soybean','grain']
  fetched_at    timestamptz not null default now()
);
create index if not exists news_items_published_idx
  on public.news_items_cache (published_at desc);

alter table public.news_items_cache enable row level security;
-- (no policies on purpose — service-role only)
