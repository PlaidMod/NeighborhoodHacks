-- P3: news coverage perspectives (.plans/news-coverage-perspectives-spec.md §5).
-- One row per agenda item. Holds short quotes, neutral summaries and source links
-- only: never article text. Like every table, RLS is on with no anon policies.

create table public.item_perspectives (
  item_id uuid primary key references public.items (id) on delete cascade,
  articles_hash text not null,
  state text not null check (state in ('ok', 'sources_only')),
  groups jsonb not null default '[]',
  sources jsonb not null default '[]',
  outlet_count int not null default 0,
  one_sided boolean not null default false,
  dropped_count int not null default 0,
  extract_model text,
  judge_model text,
  generated_at timestamptz not null default now(),
  frozen_at timestamptz not null
);

alter table public.item_perspectives enable row level security;
