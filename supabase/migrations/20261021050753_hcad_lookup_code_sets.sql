-- lookup_hcad_parcel returns one account for each different set of tax codes at a street address,
-- instead of the first two accounts. A condo building can have hundreds of accounts at one address;
-- the lookup needs every different code set there to know whether the address's governments are
-- certain (app/api/lookup/route.ts, resolveSharedAddress). Same signature and columns as before.
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
  with parcels as (
    select
      p.account,
      p.legal_description,
      p.centroid,
      coalesce(array_agg(j.hcad_code order by j.hcad_code) filter (where j.hcad_code is not null), array[]::text[]) as codes
    from public.hcad_parcels as p
    left join public.hcad_jurisdictions as j on j.account = p.account
    where p.site_address_norm = p_site_address_norm
    group by p.account, p.legal_description, p.centroid
  ),
  one_per_code_set as (
    select distinct on (codes) account, legal_description, centroid, codes
    from parcels
    order by codes, account
  )
  select
    o.account,
    o.legal_description,
    case when o.centroid is null then null else extensions.st_x(o.centroid) end,
    case when o.centroid is null then null else extensions.st_y(o.centroid) end,
    o.codes
  from one_per_code_set as o
  order by o.account;
$$;

revoke execute on function public.lookup_hcad_parcel(text)
  from public, anon, authenticated;
grant execute on function public.lookup_hcad_parcel(text)
  to service_role;
