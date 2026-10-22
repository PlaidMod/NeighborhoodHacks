# P1 HCAD and boundary data loading

The loaders are dry-run-first and only accept working files under the ignored `tmp/scratch/hcad/` directory. Do not commit HCAD extracts or print parcel rows. The normalized parcel staging contract is intentionally limited to `account`, `site_address_norm`, `legal_description`, `longitude`, and `latitude`; the second CSV contains only `account,hcad_code`. Do not include owner, mailing, valuation, phone, or exemption fields.

## HCAD parcels

**Quickest path (no large files on a laptop):** run the **HCAD lookup slice** workflow (`.github/workflows/hcad-slice.yml`) from the Actions tab, or with `gh workflow run hcad-slice.yml -f year=2026 -f zips=77002,77004`. GitHub's runner downloads `Real_acct_owner.zip` and `Real_jur_exempt.zip`, stages only the chosen ZIP codes, dry-runs the loader, and uploads the small slice as a 3-day private artifact. Download it into `tmp/scratch/hcad/` (`gh run download <run id> -D tmp/scratch/hcad/slice-2026`), then run `npm run load:hcad -- --input tmp/scratch/hcad/slice-2026 --source-year 2026 --source-url https://hcad.org/pdata/pdata-property-downloads.html --apply`.

Parcel points are optional: without `parcel-centroids.geojson`, staging writes empty coordinates and the lookup uses the Census point. When the Census can't place an address that HCAD has (often a new street), the lookup still answers from the tax codes and skips only the boundary check. The loader keeps street addresses shared by several accounts (condos; the lookup accepts them when their tax codes match) and codes with no curated body (the lookup lists them by HCAD's official name, from `data/hcad-jurisdictions.json`). It skips parcels with no tax codes.

The manual steps below still work if you have the files locally.

Use the official [HCAD property downloads](https://hcad.org/pdata/pdata-property-downloads.html), [import instructions](https://hcad.org/hcad-online-services/pdata/pdata-help/), and [codebook](https://hcad.org/assets/uploads/pdf/pdataCodebook.pdf). HCAD describes its property data as text files for import into user databases. The codebook identifies `real_acct.txt` fields `acct`, `site_addr_1`, `site_addr_2`, `site_addr_3`, and `lgl_1`–`lgl_4`; jurisdiction membership comes from `jur_value.txt` (`acct`, `tax_district`). Keep the original raw files outside the repo. Convert only the selected demo ZIP slice into the two normalized CSVs. Assemble the address from the site-address fields and legal-description lines; normalize the address with `normalizeHcadAddress` conventions. Derive an approximate point from the HCAD parcel geometry by joining GIS `HCAD_NUM` to the parcel account, and keep only the point. The demo ZIPs and addresses are not selected yet, so no extracts are staged.

Convert the countywide tab-delimited PDATA tables to a ZIP-limited, privacy-filtered stage with the streaming converter. The official import guide says the text files include headers. Export only centroid points from the HCAD `Parcels` GIS layer (not owner/mail fields) and reproject during export:

```sh
ogr2ogr -f GeoJSON -t_srs EPSG:4326 -dialect SQLite -sql "SELECT HCAD_NUM, Zip, ST_Centroid(geometry) AS geometry FROM Parcels WHERE Zip IN ('77004','77433')" tmp/scratch/hcad/raw-2026/parcel-centroids.geojson <hcad-gis.gdb>
npm run stage:hcad -- --source-dir tmp/scratch/hcad/raw-2026 --output tmp/scratch/hcad/demo-slice --source-year 2026 --zips 77004,77433
```

Before applying, check the map with `npm run seed:hcad-jurisdictions -- --check`, then inspect and dry-run the staged slice:

```sh
npm run load:hcad -- --input tmp/scratch/hcad/<slice> --source-year 2026 --source-url https://hcad.org/pdata/pdata-property-downloads.html
npm run load:hcad -- --input tmp/scratch/hcad/<slice> --source-year 2026 --source-url https://hcad.org/pdata/pdata-property-downloads.html --apply
```

The load keeps shared street addresses and codes with no curated body, and skips parcels with no tax codes (see above). To track a new government, source-check its HCAD jurisdiction name and canonical body, add them to `data/hcad-jurisdiction-map.yaml` and `data/bodies.yaml`, and run the two seed scripts; no reload is needed.

**Shared street addresses.** `lookup_hcad_parcel` returns one account for each different set of tax codes at an address (migration `20261021050753`). The lookup confirms the address when every account has the same *tracked* codes (often only commercial units pay a management district), and lists only the untracked governments every account shares. When tracked codes differ, it uses the Census answer. Codes with no name in HCAD's public list aren't shown.

## Boundaries

HCAD's [GIS download page](https://hcad.org/pdata/pdata-gis-downloads.html) lists the City, School, Emergency, Fire, Special, Utility and Water District layers. The [2026 GIS dictionary](https://hcad.org/assets/uploads/pdf/resources/2026/GIS-ReadMeV2-2.pdf) documents `Code` and `Name`; it says the source data uses EPSG:2278 (NAD83 Texas State Plane South Central, US feet). City and School entries are matched by `Code` to the reviewed jurisdiction map. Other HCAD layers remain out until their body types and IDs have been curated.

Convert the chosen source layer to WGS84 GeoJSON before running the boundary loader:

```sh
ogr2ogr -f GeoJSON -t_srs EPSG:4326 -lco RFC7946=YES tmp/scratch/hcad/city.geojson <source.gdb-or-shp> City
npm run load:boundaries -- --input tmp/scratch/hcad/city.geojson --layer City --source-year 2026 --source-url https://hcad.org/pdata/pdata-gis-downloads.html
npm run load:boundaries -- --input tmp/scratch/hcad/city.geojson --layer City --source-year 2026 --source-url https://hcad.org/pdata/pdata-gis-downloads.html --apply
```

Use `--layer School` for school districts and `--layer College` for college districts. The loader imports only source codes linked to a compatible curated body, logs skipped feature counts plus the staged-file SHA-256, validates polygon rings and Harris County coordinate bounds, and relies on PostGIS validity checks before atomically replacing each body's boundary. A zero-match input fails closed. HCAD boundaries do not cover council single-member districts, ESD stories, METRO, or regional bodies; those need their own reviewed sources and loaders.

## Apply prerequisites

Done on Oct 21, 2026:
- Migrations `20261021040012_p1_lookup_support.sql` and `20261021050753_hcad_lookup_code_sets.sql` are applied.
- The body catalog (11 rows) and the jurisdiction map (9 codes) are seeded.
- HCAD 2026 parcels for 30 ZIPs are loaded through the workflow above: 385,337 parcels and 3,435,567 tax-code rows.
  - First run: 77002, 77003, 77004, 77006, 77007, 77008, 77019, 77021, 77098 and 77433 (142,406 parcels).
  - Second run (39686003192): 77009, 77011, 77018, 77023, 77025, 77027, 77030, 77054, 77056, 77096, 77065, 77070, 77095 and 77429 (164,767 parcels).
  - Third run (39703086677): 77020, 77022, 77026, 77040, 77041 and 77064 (78,164 parcels).
- **Space:** the quota is at 435 MB of the 500 MB free-plan limit. Above 500 MB the database becomes read-only.
  - The quota counts all of the project's databases, including Postgres's two template databases (about 15 MB together).
  - The tax-code index was rebuilt between the second and third runs, shrinking it from 155 MB to 107 MB. The third run grew it to 156 MB.
  - Don't load more ZIPs without freeing space first. An average ZIP (about 13,000 parcels) adds about 16 MB, and rebuilding the index again (below) would return about 20 MB.
- HCAD code `012`, HOUSTON ISD (FORMERLY NFISD), isn't in the jurisdiction map. No loaded parcel has it. In ZIPs where it appears, the lookup would list it as an untracked government instead of showing the HISD board. Source-check it and add it to the map before loading those ZIPs.

**Rebuilding the tax-code index.** Run these as two separate runs in the SQL editor. A plain `REINDEX` keeps the old index until the new one is built, so it needs room for both, and so does putting both statements in one run.

```sql
-- Run 1: drop the old index (lookups stay correct but slow until run 2 finishes)
set lock_timeout = '10s';
alter table public.hcad_jurisdictions drop constraint hcad_jurisdictions_pkey;

-- Run 2: build it fresh with the migration's definition
set statement_timeout = '10min';
alter table public.hcad_jurisdictions add constraint hcad_jurisdictions_pkey primary key (account, hcad_code);
```

Addresses elsewhere in Harris County use the Census fallback until their ZIP is loaded. To add ZIPs, run the workflow with just the new ZIPs: the loader updates by account and keeps what's already loaded. Reloading is safe.

Boundaries (the GIS layers) are not loaded. The Census point and HCAD codes cover the lookup without them.
