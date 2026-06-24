-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0004: Weather caches                                            ║
-- ║ Global derived-data caches (Open-Meteo), keyed by a rounded lat/lon cell ║
-- ║ so nearby fields share a fetch. Weather for a lat/lon isn't farm-private,║
-- ║ so RLS is enabled with NO policies — service-role (server) only.         ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- Forecast (current + hourly + daily). Revalidate a few times a day.
create table if not exists public.weather_forecast_cache (
  cell_key    text primary key,           -- "<lat.1>,<lon.1>" rounded to ~0.1°
  payload     jsonb not null,
  fetched_at  timestamptz not null default now()
);

-- 1991-2020 daily climatology + per-year cumulative precip (for percentile).
-- Normals barely change — compute once, cache long.
create table if not exists public.weather_normals_cache (
  cell_key     text primary key,
  payload      jsonb not null,
  computed_at  timestamptz not null default now()
);

-- This-season daily actuals (archive). Revalidate daily.
create table if not exists public.weather_actuals_cache (
  cell_key    text not null,
  year        int  not null,
  payload     jsonb not null,
  fetched_at  timestamptz not null default now(),
  primary key (cell_key, year)
);

alter table public.weather_forecast_cache enable row level security;
alter table public.weather_normals_cache  enable row level security;
alter table public.weather_actuals_cache   enable row level security;
-- (no policies on purpose — service-role only)
