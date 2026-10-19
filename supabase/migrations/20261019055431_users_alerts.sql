-- Users and text alerts (owner: P3). Section 16, "Users and alerts", and section 11.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  address_point extensions.geometry (Point, 4326),
  stakes text[] not null default '{}',
  phone text unique,
  phone_verified boolean not null default false,
  language text not null default 'en' check (language in ('en', 'es')),
  is_minor boolean not null default false,
  parent_consent boolean not null default false,
  sms_opted_out boolean not null default false
);

create table public.user_bodies (
  user_id uuid not null references public.users (id) on delete cascade,
  body_id text not null references public.bodies (id) on update cascade on delete cascade,
  primary key (user_id, body_id)
);

create table public.reminders (
  user_id uuid not null references public.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- item_id is nullable: the HCAD protest-deadline reminder has no agenda item.
create table public.alert_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  item_id uuid references public.items (id) on delete cascade,
  rule text not null,
  scheduled_for timestamptz not null
);
create index alert_queue_scheduled_idx on public.alert_queue (scheduled_for);

-- "nulls not distinct" so a null item_id still blocks a duplicate send.
create table public.alerts_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  item_id uuid references public.items (id) on delete cascade,
  rule text not null,
  sent_at timestamptz not null default now(),
  unique nulls not distinct (user_id, item_id, rule)
);

alter table public.users enable row level security;
alter table public.user_bodies enable row level security;
alter table public.reminders enable row level security;
alter table public.alert_queue enable row level security;
alter table public.alerts_sent enable row level security;
