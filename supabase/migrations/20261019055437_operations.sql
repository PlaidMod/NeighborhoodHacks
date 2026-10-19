-- Operations tables (owner: P5). Section 16, "Operations".

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

create table public.demo_cache (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
alter table public.demo_cache enable row level security;
