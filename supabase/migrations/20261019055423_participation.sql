-- Speak up registration recipes (owner: P4). Section 16, "Participation", and section 13.

create table public.registration_methods (
  id uuid primary key default gen_random_uuid(),
  body_id text not null references public.bodies (id) on update cascade,
  meeting_type text,
  channel text not null check (channel in ('online_form', 'email', 'phone', 'card_at_meeting', 'written', 'remote')),
  opens_rule jsonb,
  closes_rule jsonb,
  required_fields jsonb not null default '[]',
  url text,
  email text,
  phone text,
  word_limit_subject int,
  minutes_per_speaker numeric,
  reduced_minutes_rule jsonb,
  agenda_only boolean,
  confirmation_type text,
  remote_allowed boolean,
  translation_request_rule text,
  priority_groups text[],
  handouts_accepted boolean,
  policy_url text,
  last_verified date
);
create index registration_methods_body_idx on public.registration_methods (body_id);

alter table public.registration_methods enable row level security;
