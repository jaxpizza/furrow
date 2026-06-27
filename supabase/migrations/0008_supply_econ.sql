-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0008: Supply bucket (Phase A)                                   ║
-- ║ USDA WASDE balance sheet + Grain Stocks + Acreage, each reference-framed  ║
-- ║ at ingestion and stored as a HISTORICAL time series (one row per release  ║
-- ║ — never overwrite a prior month) so the future backtest can mine it. Plus ║
-- ║ a report calendar seeded with the public 2026 schedule so the UI can      ║
-- ║ count down to the next market-mover and the synthesis can cite it.        ║
-- ║ Global derived data → RLS enabled, NO policies (service-role only).       ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── usda_econ_cache : framed supply figures, one row per release (history) ───
create table if not exists public.usda_econ_cache (
  id            uuid primary key default gen_random_uuid(),
  report_type   text not null,        -- 'wasde'|'grain_stocks'|'acreage'|'prospective_plantings'
  crop          public.crop not null,
  marketing_year text not null,       -- '2026/27' (WASDE) or '2026' (stocks/acreage)
  payload       jsonb not null,       -- raw figures + computed reference frames
  source_url    text,
  released_at   timestamptz not null, -- when USDA published it (the history key)
  fetched_at    timestamptz not null default now(),
  unique (report_type, crop, marketing_year, released_at)
);
create index if not exists usda_econ_cache_lookup_idx
  on public.usda_econ_cache (report_type, crop, released_at desc);

alter table public.usda_econ_cache enable row level security;
-- (no policies on purpose — service-role only)

-- ── report_calendar : public USDA release schedule ───────────────────────────
create table if not exists public.report_calendar (
  id           uuid primary key default gen_random_uuid(),
  report_type  text not null,
  release_date date not null,
  description  text not null,
  unique (report_type, release_date)
);
create index if not exists report_calendar_date_idx
  on public.report_calendar (release_date);

alter table public.report_calendar enable row level security;
-- (no policies on purpose — service-role only)

-- ── seed: public 2026 USDA schedule ──────────────────────────────────────────
-- (Weekly Export Sales — Thursdays — is handled as a computed "next Thursday" in
--  code rather than 52 rows.)
insert into public.report_calendar (report_type, release_date, description) values
  ('prospective_plantings', '2026-03-31', 'Prospective Plantings — farmer planting intentions for the new crop'),
  ('grain_stocks',          '2026-01-12', 'Quarterly Grain Stocks — Dec 1 on-farm + off-farm bushels'),
  ('grain_stocks',          '2026-03-31', 'Quarterly Grain Stocks — Mar 1 bushels'),
  ('grain_stocks',          '2026-06-30', 'Quarterly Grain Stocks — Jun 1 bushels'),
  ('grain_stocks',          '2026-09-30', 'Quarterly Grain Stocks — Sep 1 bushels'),
  ('acreage',               '2026-06-30', 'June Acreage — actual planted acres vs. March intentions'),
  ('wasde', '2026-01-12', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-02-11', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-03-11', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-04-09', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-05-12', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-06-11', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-07-10', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-08-12', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-09-11', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-10-09', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-11-10', 'WASDE — World Agricultural Supply & Demand Estimates'),
  ('wasde', '2026-12-09', 'WASDE — World Agricultural Supply & Demand Estimates')
on conflict (report_type, release_date) do nothing;
