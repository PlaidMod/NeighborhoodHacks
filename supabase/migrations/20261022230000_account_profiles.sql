-- Saved governments for people who sign in with Google (owner: P3, Oct 22, 2026).
-- Signing in is optional: guests keep their governments in a browser cookie (bodies_token).
-- A signed-in person's body IDs and stakes are saved here so they follow them to other
-- devices. Never an address or coordinates (tech plan §19): only the IDs a bodies_token
-- carries. Deleting the auth user deletes the row.
create table public.account_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  body_ids text[] not null default '{}',
  stakes text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- RLS on with no policies: only the server (service role) reads and writes, after it has
-- checked the signed-in session. No anon or authenticated access.
alter table public.account_profiles enable row level security;
