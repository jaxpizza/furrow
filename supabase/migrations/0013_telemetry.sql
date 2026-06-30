-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0013: Instrumentation & Admin Telemetry (F2-A)                  ║
-- ║ Makes the engine observable + tunable. Every outlook generation records   ║
-- ║ its complete inputs, output, and reasoning linkage — readable ONLY by      ║
-- ║ admin accounts, genuinely walled at the DB level (not just hidden in UI).   ║
-- ║ Completely invisible to farmers; logs IN ADDITION to market_outlook_v2.      ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── admin role ───────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Security-definer predicate: is the CURRENT user an admin? (mirrors
-- is_farm_member's pattern.) Used by every telemetry RLS policy.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ── telemetry record (one per generation) ────────────────────────────────────
create table if not exists public.outlook_telemetry (
  id            uuid primary key default gen_random_uuid(),
  -- queryable top-level columns (easy filtering)
  crop          public.crop not null,
  generated_at  timestamptz not null,
  signal        text not null,              -- favorable | mixed | unfavorable
  trigger       text not null,              -- initial | new-corpus | max-age | forced
  corpus_hash   text not null,
  model         text not null,
  latency_ms    integer,
  sample_data   boolean not null default false,
  -- structured payloads (full reconstruction of "what it saw + concluded")
  input_snapshot jsonb not null,            -- per-bucket framed data + freshness + seasonal frame
  corpus_text    text,                      -- the exact corpus the model received
  output         jsonb not null,            -- the complete OutlookV2
  reasoning      jsonb not null,            -- per-bucket driver/watched linkage + lean
  gaps           jsonb,                     -- active data gaps per bucket
  failed_sources jsonb,                     -- buckets/sub-sources absent this run
  created_at     timestamptz not null default now()
);
create index if not exists outlook_telemetry_feed_idx
  on public.outlook_telemetry (crop, generated_at desc);
create index if not exists outlook_telemetry_signal_idx
  on public.outlook_telemetry (signal);
create index if not exists outlook_telemetry_trigger_idx
  on public.outlook_telemetry (trigger);

-- ── human-judgment annotation (the tuning-loop closer) ───────────────────────
create table if not exists public.telemetry_annotation (
  id            uuid primary key default gen_random_uuid(),
  telemetry_id  uuid not null references public.outlook_telemetry (id) on delete cascade,
  rating        text not null,             -- good | too-bullish | too-bearish | missed-something | off
  notes         text,
  annotated_by  uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index if not exists telemetry_annotation_lookup_idx
  on public.telemetry_annotation (telemetry_id, created_at desc);

-- ── RLS: admin-only, enforced at the DB ──────────────────────────────────────
-- Telemetry rows are INSERTED by the service-role client (bypasses RLS); a farmer
-- account literally cannot SELECT them. Annotations are written by admins via
-- their own session.
alter table public.outlook_telemetry enable row level security;
create policy "telemetry admin read"
  on public.outlook_telemetry for select using (public.is_admin());

alter table public.telemetry_annotation enable row level security;
create policy "annotation admin read"
  on public.telemetry_annotation for select using (public.is_admin());
create policy "annotation admin write"
  on public.telemetry_annotation for insert with check (public.is_admin());

-- ── Enable an admin account (run this yourself, replace the email) ───────────
-- update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
