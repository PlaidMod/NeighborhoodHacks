# P1 HCAD and boundary data loading

The loaders are dry-run-first and only accept working files under the ignored `tmp/scratch/hcad/` directory. Do not commit HCAD extracts or print parcel rows. The normalized parcel staging contract is intentionally limited to `account`, `site_address_norm`, `legal_description`, `longitude`, and `latitude`; the second CSV contains only `account,hcad_code`. Do not include owner, mailing, valuation, phone, or exemption fields.

## HCAD parcels

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

The load refuses ambiguous normalized addresses, parcels without jurisdictions, or unknown jurisdiction codes. Add an unknown code only after its HCAD jurisdiction name and canonical body have been source-checked and added to `data/hcad-jurisdiction-map.yaml` and `data/bodies.yaml`.

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

P5 must apply `20261020160000_p1_lookup_support.sql`, seed the canonical body catalog, and provide the Supabase service key in the ignored `.env.local`. Then seed mappings and apply reviewed staging data. Live lookup remains unverified until P1 selects two demo addresses/ZIPs, loads the corresponding data, and checks the full returned body set against official parcel records.
