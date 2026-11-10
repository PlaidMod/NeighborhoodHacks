# Regional Bodies Addition Spec

**Purpose:** Add the six “Regional: coming soon” bodies from Project_Plan.md to the app with geography-gated lookup, full data integration, and empty-state UI, mirroring the MUD/school-district rollout pattern.

**Scope bodies:** H-GAC Transportation Policy Council, TxDOT Houston District, TCEQ, Public Utility Commission of Texas, Harris-Galveston Subsidence District, San Jacinto River Authority.

## Decisions captured

* Data model: static curated list, entries in `data/bodies.yaml` with `category: regional_coming_soon`, `sms_eligible: false`, low `impact_rank` 200-250.
* UI: bodies appear on results like tracked bodies, with separate full body page using full layout with empty states and coming-soon banner.
* Geography: boundaries loaded now, point-in-polygon gating via existing boundary loader.
* Token: IDs included in `bodies_token` when address is inside boundary.
* Quiz: excluded from “Who governs you?” quiz.
* i18n: English descriptions now, Spanish later.
* Sorting: impact_rank.
* Weekly integration: show everywhere (glance, weekly lists) with empty states.
* URLs: verified official meeting_info_url and source_url before seeding.
* Tests: full test suite mirroring MUD checks.

## Phase 0 — Groundwork

**Owner:** P5 + P1

* Confirm shared contracts unchanged: `Meeting`, `Item`, `bodies_token`, `classify()`.
* Add `regional_coming_soon` bodies schema validation already exists in `lib/ingest/catalog.ts`. No schema change needed.
* Create spec file and handoff entry.
* Verify existing boundary loader supports loading six new polygons.

**Deliverables**
* Spec document
* Handoff log entry
* Boundary source URLs collected

## Phase 1 — Catalog & Data

**Owner:** P1

* Add six bodies to `data/bodies.yaml`:
  * `id`, `name`, `type: other`, `category: regional_coming_soon`
  * `sms_eligible: false`, `impact_rank` 200-250
  * `elected_or_appointed: 'Varies by board'`
  * `description_en` one-line, `description_es` placeholder
  * `meeting_info_url`, `source_url` verified
* Update `lib/ingest/catalog.ts` loader test to include regional bodies.
* Generate `supabase/migrations` seed if needed for initial bodies table.
* No Spanish now; add TODO comment.

**Acceptance**
* `npm run typecheck` passes
* `lib/ingest/catalog` loads six new bodies
* `npx vitest run tests/unit/ingest-bodies` passes

## Phase 2 — Boundaries & Lookup Gating

**Owner:** P1

* Add entries to `data/boundary-sources.yaml` for six bodies with official GIS sources.
* Load polygons via `scripts/load-boundaries.ts` with `--layer` and body IDs.
* Verify point-in-polygon returns correct bodies for demo addresses.
* Ensure lookup returns regional bodies in `bodies` array when inside boundary, with `verified: true` and `source_kind: 'gis'`.
* Ensure bodies_token includes regional IDs.

**Acceptance**
* `scripts/load-boundaries.ts` loads all six layers without errors
* Lookup for address inside each boundary returns body
* Lookup for address outside returns no regional body
* Rate limit and token tests pass

## Phase 3 — UI & Tests Integration

**Owner:** P1 + P5

* Results page: regional section rendered sorted by impact_rank, cards link to `/bodies/[id]?t=`.
* Body page: reuse tracked layout, show coming-soon banner, empty states for meetings/weekly/speak up, `agendas_read: false`.
* Weekly page: regional bodies appear in “Your governments at a glance” with empty states.
* Messages: add `Results.regional` label with teaching note.
* Tests:
  * Catalog parity test for six bodies
  * Boundary presence test
  * Lookup gating test
  * UI rendering test with empty states
* Handoff entry flagging contract changes: none.

**Acceptance**
* Manual check at 390px, no horizontal scroll
* `npm test` passes
* Contrast 4.5:1 maintained

## Phase 2 resolution (2026-11-10)

Phase 2 as written above was not built. It conflicted with the plan files, and the plan wins:
tech plan §4 says the regional list is "the static `regional_coming_soon` bodies", and
Project_Plan says "names and one-line descriptions only, with no data". So the six bodies stay
out of `bodies` and `bodies_token`, and `/api/lookup` keeps returning all six in `regional`, ungated.

- **Geography:** TCEQ and PUC are statewide, and TxDOT Houston District, H-GAC and the Subsidence
  District each cover all of Harris County, so a polygon would gate nothing. SJRA was the only
  candidate. The only official boundary found (TWDB `RA_SLD_Shapefile.zip`, data as of 2014) is
  mostly Montgomery County, and its Harris part is a thin strip down the Waller/Fort Bend edge
  that looks like a digitizing error (it put Katy inside and Spring, Kingwood and Humble outside).
  The teammate chose to show SJRA everywhere, like the other five.
- **Phase 3 follow-on:** the results page's regional section already renders from `regional`; the
  body-page and weekly items in Phase 3 that assume the IDs are in the token need revisiting.
- **To change this:** a teammate must agree to a plan change first, and SJRA needs a better boundary.

## Phase 3 resolution (2026-11-10)

Rescoped to fit the Phase 2 resolution and Project_Plan ("names and one-line descriptions only"):

- **Built:** the results page's regional section now shows each body's one-line description, a
  "Coming soon" tag, a teaching note (`Results.regionalNote`, en + es) and a link to its official
  meeting page. Order is `impact_rank` (the lookup query already sorts by it).
- **Test:** `tests/api/lookup-route.test.ts` checks that regional bodies come back with their
  descriptions and links, and that their IDs stay out of `bodies` and the signed `bodies_token`.
- **Not built (needs regional IDs in the token or real data, which the plan rules out):** body pages
  at `/bodies/[id]`, weekly "at a glance" rows, boundary and gating tests.
- Body descriptions are English only on the Spanish page until `description_es` is written.

## Plan change: regional bodies join the reader's governments (2026-11-10)

The teammate decided the six bodies should be part of the reader's governments, in their own tab.
This supersedes the "kept out of `bodies_token`" part of the Phase 2 and Phase 3 resolutions; both
plan files now say so (Project_Plan "Regional: coming soon", tech plan §4). Still ungated.

- `/api/lookup` adds the `regional` IDs to the signed `bodies_token`; `regional` stays a separate list.
- `resolveBodies` (lib/weekly/data.ts) reads `category` and `description_en`; `toBody` marks
  `regional_coming_soon` bodies as kind `regional` with `regional: true`.
- `/app/districts` has tabs "Local governments" and "Regional governments" (WAI-ARIA tabs, arrow keys).
- `/app/districts/[id]` shows a coming-soon page for regional bodies: description, "agendas not read" empty
  state, official meeting link. The timeline's per-body mute switches leave them out.
- Needs the six rows in Supabase `bodies` (`npm run ingest -- --seed`), or the IDs resolve to nothing.

## Open issues

* Spanish translation deferred
* Future agenda scraping for regional bodies not in scope
* Boundary sources may need manual simplification for PostGIS

## References

* Project_Plan.md §“Regional: coming soon”
* Technical_Implementation_Plan.md §16, §4
* MUD rollout pattern: `.plans/mud-scrapers-rollout-spec.md`, `.plans/district-coverage-plan.md`
