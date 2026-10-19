-- Agenda tables (owners: P2 and P3). Section 16, "Agendas", plus P2's additions
-- (.plans/agent-scraper-spec.md, P2-A and handoff note 12.2).

create table public.sources (
  id text primary key,
  body_id text references public.bodies (id) on update cascade,
  adapter text not null check (adapter in ('legistar', 'boardbook', 'primegov', 'llm_extract', 'manual')),
  config jsonb not null default '{}',
  last_checked timestamptz,
  last_success timestamptz,
  expected_max_gap_days int,
  last_flags text[] not null default '{}',
  last_error text,
  results_max_days int not null default 45,
  comment_rules_hash text,
  comment_rules_text text
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.sources (id) on update cascade on delete cascade,
  fetched_at timestamptz not null default now(),
  raw text,
  content_hash text,
  url text,
  kind text check (kind in ('json', 'html', 'pdf_text', 'llm_output')),
  meeting_external_id text
);
create index documents_source_url_idx on public.documents (source_id, url);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.sources (id) on update cascade,
  external_id text not null,
  body_id text references public.bodies (id) on update cascade,
  date timestamptz not null,
  end_date timestamptz,
  type text check (type in ('regular', 'special')),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  agenda_url text,
  source_url_es text,
  video_url text,
  content_hash text,
  minutes_url text,
  previous_date timestamptz,
  last_results_check timestamptz,
  is_demo boolean not null default false,
  comment_rules_text text,
  unique (source_id, external_id)
);
create index meetings_body_date_idx on public.meetings (body_id, date);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  -- source_id is not in section 16. P2's upsert key (source_id, external_id) needs it.
  source_id text not null references public.sources (id) on update cascade,
  meeting_id uuid references public.meetings (id) on delete cascade,
  external_id text not null,
  body_id text references public.bodies (id) on update cascade,
  meeting_body_id text references public.bodies (id) on update cascade,
  agenda_number text,
  title text not null,
  section text,
  description text,
  matter_type text,
  item_type text,
  status text not null check (status in ('upcoming', 'awaiting_result', 'decided')),
  action text,
  vote_result text check (vote_result in ('passed', 'failed', 'no_action')),
  tier text check (tier in ('sms', 'weekly', 'timeline')),
  rule_fired text,
  -- Null for sources that skip review: Legistar, BoardBook and manual entry.
  review_status text check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  source_quote text,
  quote_verified boolean,
  amounts jsonb not null default '[]',
  attachments jsonb not null default '[]',
  contains_private_person boolean not null default false,
  needs_story boolean not null default true,
  story_en jsonb,
  story_es jsonb,
  story_source text check (story_source in ('ai', 'template')),
  source_url text not null,
  content_hash text,
  first_seen_at timestamptz not null default now(),
  removed_at timestamptz,
  is_demo boolean not null default false,
  unique (source_id, external_id)
);
create index items_meeting_idx on public.items (meeting_id);
create index items_body_idx on public.items (body_id);

create table public.p2_notices (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('tax_rate_item_seen', 'comment_rules_changed', 'comment_rules_missing')),
  source_id text references public.sources (id) on update cascade on delete cascade,
  body_id text references public.bodies (id) on update cascade,
  item_id uuid references public.items (id) on delete cascade,
  payload jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by text,
  unique nulls not distinct (kind, source_id, item_id)
);

-- News "might come up" box (scraper spec D26). Headline links only: no article text,
-- and nothing here feeds items, alerts or stories.
create table public.news_mentions (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  outlet text,
  headline text,
  url text,
  published_at timestamptz,
  forward_looking boolean,
  matched_terms text[],
  fetched_at timestamptz not null default now()
);

create table public.news_mention_bodies (
  mention_id uuid not null references public.news_mentions (id) on delete cascade,
  body_id text not null references public.bodies (id) on update cascade on delete cascade,
  primary key (mention_id, body_id)
);

create table public.news_mention_items (
  mention_id uuid not null references public.news_mentions (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  score numeric,
  linked_at timestamptz not null default now(),
  primary key (mention_id, item_id)
);

alter table public.sources enable row level security;
alter table public.documents enable row level security;
alter table public.meetings enable row level security;
alter table public.items enable row level security;
alter table public.p2_notices enable row level security;
alter table public.news_mentions enable row level security;
alter table public.news_mention_bodies enable row level security;
alter table public.news_mention_items enable row level security;
