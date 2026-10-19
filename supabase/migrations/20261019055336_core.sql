-- Core tables (owner: P1). Technical_Implementation_Plan.md section 16, "Core".
-- Every table has RLS on with no policies: only the server's secret key can read or write.

create table public.bodies (
  id text primary key,
  name text not null,
  type text,
  category text not null check (category in ('tracked', 'ballot_list', 'not_government', 'regional_coming_soon')),
  elected_or_appointed text,
  sms_eligible boolean not null default false,
  impact_rank int,
  description_en text,
  description_es text,
  meeting_info_url text,
  tax_set_by_body_id text references public.bodies (id) on update cascade,
  operations_by_body_id text references public.bodies (id) on update cascade,
  regulated_by text,
  operator_name text
);

create table public.boundaries (
  id uuid primary key default gen_random_uuid(),
  body_id text not null references public.bodies (id) on update cascade on delete cascade,
  geom extensions.geometry (MultiPolygon, 4326) not null
);
create index boundaries_geom_idx on public.boundaries using gist (geom);
create index boundaries_body_idx on public.boundaries (body_id);

create table public.jurisdiction_map (
  hcad_code text primary key,
  body_id text not null references public.bodies (id) on update cascade
);

create table public.hcad_parcels (
  account text primary key,
  site_address_norm text not null,
  legal_description text,
  centroid extensions.geometry (Point, 4326)
);
create index hcad_parcels_site_address_idx on public.hcad_parcels (site_address_norm);

create table public.hcad_jurisdictions (
  account text not null references public.hcad_parcels (account) on delete cascade,
  hcad_code text not null,
  primary key (account, hcad_code)
);

create table public.hoa_matches (
  id uuid primary key default gen_random_uuid(),
  subdivision_name text not null,
  hoa_body_id text references public.bodies (id) on update cascade,
  master_hoa_body_id text references public.bodies (id) on update cascade,
  source_url text,
  filing_date date,
  verified boolean not null default false,
  last_checked timestamptz
);
create index hoa_matches_subdivision_trgm_idx on public.hoa_matches using gin (subdivision_name extensions.gin_trgm_ops);

create table public.hoa_corrections (
  id uuid primary key default gen_random_uuid(),
  subdivision_name text,
  suggested_hoa_name text,
  created_at timestamptz not null default now()
);

create table public.ballot_offices (
  id uuid primary key default gen_random_uuid(),
  body_id text references public.bodies (id) on update cascade,
  office_name text,
  holder_name text,
  next_election_date date,
  source_url text
);

create table public.tax_rates (
  body_id text not null references public.bodies (id) on update cascade,
  year int not null,
  adopted_rate numeric,
  no_new_revenue_rate numeric,
  voter_approval_rate numeric,
  source_url text,
  primary key (body_id, year)
);

create table public.elections (
  id uuid primary key default gen_random_uuid(),
  body_id text references public.bodies (id) on update cascade,
  date date,
  type text,
  votes_cast int,
  registered_voters int,
  result text,
  source_url text
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  body_id text references public.bodies (id) on update cascade,
  type text,
  date date,
  source_url text
);

create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  selected_types text[] not null,
  actual_types text[] not null,
  created_at timestamptz not null default now()
);

alter table public.bodies enable row level security;
alter table public.boundaries enable row level security;
alter table public.jurisdiction_map enable row level security;
alter table public.hcad_parcels enable row level security;
alter table public.hcad_jurisdictions enable row level security;
alter table public.hoa_matches enable row level security;
alter table public.hoa_corrections enable row level security;
alter table public.ballot_offices enable row level security;
alter table public.tax_rates enable row level security;
alter table public.elections enable row level security;
alter table public.deadlines enable row level security;
alter table public.quiz_responses enable row level security;
