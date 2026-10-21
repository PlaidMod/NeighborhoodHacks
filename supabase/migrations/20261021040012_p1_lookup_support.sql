-- P1 lookup support, coordinated through the shared handoff with P5.
-- GIS bodies are matched at an address point; this RPC returns only body IDs.
alter table public.tax_rates
  add column last_vote_date date;

-- Small idempotent import batches keep HCAD source rows out of client-visible APIs.
create or replace function public.load_hcad_batch(p_parcels jsonb, p_jurisdictions jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_parcels) <> 'array' or jsonb_typeof(p_jurisdictions) <> 'array' then
    raise exception 'HCAD batch inputs must be JSON arrays';
  end if;

  insert into public.hcad_parcels (account, site_address_norm, legal_description, centroid)
  select p.account, p.site_address_norm, nullif(p.legal_description, ''),
    case when p.longitude is null or p.latitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p.longitude, p.latitude), 4326)
    end
  from jsonb_to_recordset(p_parcels) as p(
    account text, site_address_norm text, legal_description text,
    longitude double precision, latitude double precision
  )
  on conflict (account) do update set
    site_address_norm = excluded.site_address_norm,
    legal_description = excluded.legal_description,
    centroid = excluded.centroid;

  delete from public.hcad_jurisdictions as j
  using jsonb_to_recordset(p_parcels) as p(account text)
  where j.account = p.account;

  insert into public.hcad_jurisdictions (account, hcad_code)
  select j.account, j.hcad_code
  from jsonb_to_recordset(p_jurisdictions) as j(account text, hcad_code text)
  on conflict do nothing;
end;
$$;

revoke execute on function public.load_hcad_batch(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.load_hcad_batch(jsonb, jsonb)
  to service_role;

create or replace function public.replace_hcad_boundary_layer(p_body_ids text[], p_boundaries jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted integer;
begin
  if coalesce(cardinality(p_body_ids), 0) = 0 or exists (
    select 1 from unnest(p_body_ids) as body_id
    where not exists (select 1 from public.bodies where id = body_id)
  ) then
    raise exception 'Boundary body list is empty or includes an unknown body';
  end if;
  if jsonb_typeof(p_boundaries) <> 'array' then
    raise exception 'Boundary input must be a JSON array';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_boundaries) as b(value)
    where not (b.value->>'body_id' = any(p_body_ids))
      or jsonb_typeof(b.value->'geometries') <> 'array'
      or jsonb_array_length(b.value->'geometries') = 0
  ) or exists (
    select 1 from jsonb_array_elements(p_boundaries) as b(value),
      jsonb_array_elements(b.value->'geometries') as g(value)
    where not extensions.st_isvalid(
      extensions.st_multi(extensions.st_force2d(extensions.st_setsrid(extensions.st_geomfromgeojson(g.value::text), 4326)))
    )
  ) then
    raise exception 'Boundary layer contains an invalid feature';
  end if;

  delete from public.boundaries where body_id = any(p_body_ids);
  insert into public.boundaries (body_id, geom)
  select b.value->>'body_id',
    extensions.st_multi(extensions.st_force2d(extensions.st_setsrid(extensions.st_geomfromgeojson(g.value::text), 4326)))::extensions.geometry(MultiPolygon, 4326)
  from jsonb_array_elements(p_boundaries) as b(value),
    jsonb_array_elements(b.value->'geometries') as g(value);
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke execute on function public.replace_hcad_boundary_layer(text[], jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_hcad_boundary_layer(text[], jsonb)
  to service_role;

create or replace function public.lookup_hcad_parcel(p_site_address_norm text)
returns table (
  account text,
  legal_description text,
  longitude double precision,
  latitude double precision,
  jurisdiction_codes text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.account,
    p.legal_description,
    case when p.centroid is null then null else extensions.st_x(p.centroid) end,
    case when p.centroid is null then null else extensions.st_y(p.centroid) end,
    coalesce(array_agg(j.hcad_code) filter (where j.hcad_code is not null), array[]::text[])
  from public.hcad_parcels as p
  left join public.hcad_jurisdictions as j on j.account = p.account
  where p.site_address_norm = p_site_address_norm
  group by p.account, p.legal_description, p.centroid
  order by p.account
  limit 2;
$$;

revoke execute on function public.lookup_hcad_parcel(text)
  from public, anon, authenticated;
grant execute on function public.lookup_hcad_parcel(text)
  to service_role;

create or replace function public.lookup_boundary_bodies(p_longitude double precision, p_latitude double precision)
returns table (body_id text)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct b.body_id
  from public.boundaries as b
  where extensions.st_covers(
    b.geom,
    extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)
  )
  order by b.body_id;
$$;

revoke execute on function public.lookup_boundary_bodies(double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.lookup_boundary_bodies(double precision, double precision)
  to service_role;

create or replace function public.lookup_hoa_candidates(p_subdivision text)
returns table (
  subdivision_name text,
  hoa_body_id text,
  master_hoa_body_id text,
  source_url text,
  verified boolean,
  match_score real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    h.subdivision_name,
    h.hoa_body_id,
    h.master_hoa_body_id,
    h.source_url,
    h.verified,
    extensions.similarity(h.subdivision_name, p_subdivision)::real as match_score
  from public.hoa_matches as h
  where extensions.similarity(h.subdivision_name, p_subdivision) >= 0.4
  order by match_score desc, h.verified desc, h.subdivision_name
  limit 5;
$$;

revoke execute on function public.lookup_hoa_candidates(text)
  from public, anon, authenticated;
grant execute on function public.lookup_hoa_candidates(text)
  to service_role;
