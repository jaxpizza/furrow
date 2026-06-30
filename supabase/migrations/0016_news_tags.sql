-- 0016_news_tags.sql
-- Per-article AI sentiment tags. Tagged ONCE at first encounter and stored, so the
-- page reads a cheap cached lookup instead of re-running the model on every load.
-- Global cache like news_items_cache: RLS on, no policies (service-role only).

create table if not exists public.news_article_tags (
  link            text primary key references public.news_items_cache (link) on delete cascade,
  corn_sentiment  text check (corn_sentiment in ('bullish', 'bearish', 'neutral')),
  soy_sentiment   text check (soy_sentiment in ('bullish', 'bearish', 'neutral')),
  takeaway        text,                              -- one-line "what this means for the market"
  model           text,                              -- which model produced the tag
  tagged_at       timestamptz not null default now()
);

create index if not exists news_article_tags_tagged_idx
  on public.news_article_tags (tagged_at desc);

alter table public.news_article_tags enable row level security;
-- (no policies on purpose — service-role only, same as news_items_cache)
