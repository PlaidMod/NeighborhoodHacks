# Agent handoff log

A shared log of changes made in this repo, so the next teammate or agent can catch up without reading every diff. Entries follow `INSTRUCTIONS.md`: record the teammate, never the agent or model.

## Rules for agents

1. **At the start of a session,** read the newest 3–5 entries below, plus any entry that touches the files you're about to change.
2. **After you add, edit or delete anything in the repo,** add one entry before you finish the task or commit. One entry per task, not per file.
3. **Put new entries at the top,** directly under "Entries." Never edit or delete someone else's entry. If an older entry is now wrong, say so in your new entry.
4. **Keep it short.** Aim for under 15 lines, and write for a teammate who hasn't seen the code.
5. **Flag shared-contract changes** in the "Contract changes" line. Other parts are built against these, so a silent change breaks them:
   - DB schema (Technical_Implementation_Plan.md §16)
   - `Meeting` and `Item` types (§6)
   - `bodies_token` format (§3)
   - the `classify()` signature (§8)
   - types in `lib/prototype/types.ts` (the `/app` screens' data shapes; moved from `web/src/lib/data/types.ts`)
6. **On a merge conflict in this file,** keep both entries, newest first.

## Entry template

```markdown
### YYYY-MM-DD: <short title>
- **Who:** <teammate> · <part, e.g. P3 News and Alerts>
- **Branch:** <branch>
- **What changed:** <1–3 sentences on what and why>
- **Files:** <main files or folders touched>
- **Contract changes:** None | <what changed and who it affects>
- **Checked:** <e.g. npm run lint, npx tsc --noEmit, manual check at 390px; or "not run" and why>
- **Open issues / next:** <anything unfinished, broken, or for the next person>
```

---

## Entries

### 2026-10-21: Verify OpenRouter, correct coach timing claims and assess deadline pace
- **Who:** BluePhoenix79 · P4 / release verification
- **Branch:** main, based on `79f4f91`
- **What changed:** Tested both configured models and the real coach route through OpenRouter. Live review caught a practice target being described as an official limit and incorrect generated duration prose. Preserved limit verification in the API/model context and made bilingual timing feedback deterministic. Added regression tests, the live results report and a dated owner-by-owner pace assessment; refreshed readiness and the testing guide. User requested commit/push of this work.
- **Files:** `app/api/coach/route.ts`, `lib/coach/{types,shared,service}.ts`, `tests/{coach/integration.test.ts,p4/coach.test.mjs}`, `docs/{openrouter-verification,project-pace,readiness,p4-status,testing-checklist}.md`, `agent_handoff.md`
- **Contract changes:** Internal `CoachItem.minutesVerified` is optional; unknown official minutes are null in provider context, with a separate practice target. Public response schema and database contracts are unchanged.
- **Checked:** Three new timing regressions and the strengthened integration assertion failed before the fix and pass afterward. Fresh full suite: 786 Vitest + 72 P4 (858), lint, typecheck and production build pass; initial full run hit the existing ESLint isolation timeout, then passed on rerun. Independent review found no blocking issue. Both `gemini-3.8-flash` and `gemini-4-argon` return structured JSON via OpenRouter. Ten post-fix EN/ES coach cases all return provider feedback with correct timing/practice labels, exact quotes and no-store; 5.9–12.5s, no local fallback. Twenty coach calls total across before/after checks may exhaust the local shared hourly allowance. No key values printed or edited; no SMS, quiz answers, registrations/comments, ingest or admin mutations submitted.
- **Open issues / next:** Core software works, but planned evidence/demo acceptance is behind: 636 of 646 items need stories, zero coverage/demo-cache rows, tax rates empty and one quiz response of unknown provenance. P4 must verify a current real participation route (Oct 22 HISD hearing is not confirmed open public comment), finish meeting-specific checks and retain real participation evidence. Other owners: stories/coverage, tax data, consenting SMS acceptance, demo/video/submission. Official Devpost deadline is Oct 24 00:00 CDT, after Friday night; older CST label is inaccurate. Legacy address storage and shell translation remain open. Plan stress test remains pending under the existing P4 implementation-spec exception.


### 2026-10-21: Pull current lookup and ingest work; refresh P4 test guide
- **Who:** BluePhoenix79 · P4 / integration verification
- **Branch:** main, fast-forwarded from `1e46631` to `79f4f91`
- **What changed:** Read the lookup, ingest, review and provider handoffs. Preserved the local October 20 audit in a recovery stash, resolved its handoff-only conflict, and replaced outdated readiness claims with current evidence. Added a full testing checklist with P4 steps, EN/ES coaching cases, public addresses and expected results; refreshed P4 status.
- **Files:** `docs/testing-checklist.md`, `docs/readiness.md`, `docs/p4-status.md`, `agent_handoff.md`
- **Contract changes:** None; no product code or environment changes.
- **Checked:** 786 Vitest + 69 P4 tests (855), lint, typecheck and production build pass. First test run hit the existing ESLint isolation timeout; full rerun passed. Live reads: 11 bodies, 7 sources, 6 meetings, 646 items, 142,406 parcels; tax_rates and demo_cache empty. City Hall and Bridgeland HS return HCAD matches; TSU returns Census fallback. Built cron routes reject with 401, review redirects to login, and coach rejects malformed/cross-origin input with 400/403 and no-store. Spanish 390px City Hall results and real P4 flow have no horizontal overflow; Wednesday Council registration stays unknown, synthetic draft restores, practice renders, and the real-item redirect works. No quiz/provider/SMS/admin/ingest or official participation actions performed; lookup uses normal quota bookkeeping.
- **Open issues / next:** OpenRouter and Twilio remain absent in this local env despite P5's owner/deployment setup; privately obtain current config. Finish live EN/ES evaluation and authentic participation. Legacy `/start` still persists the address, shell text remains partly English, and the root palette swapper is absent. Production promotion and tax/demo data remain owner work; see readiness. No commit or push.


### 2026-10-21: Lookup fix, parts 2–3: HCAD data for 10 ZIPs loaded; shared addresses resolved
- **Who:** PlaidMod · P5 Platform (P1's lookup data and RPC, decided by PlaidMod)
- **Branch:** main
- **What changed:**
  - **HCAD data without a laptop download.** New workflow `.github/workflows/hcad-slice.yml` (run by hand). GitHub's runner downloads HCAD's 2026 property files, keeps only the chosen ZIPs and the allowed columns (account, street address, legal description, tax codes; no owner, mail or value fields), dry-runs the loader, and uploads a 4.2 MB private artifact kept for 3 days. Run 39546716606 produced it. I loaded it from this computer with `npm run load:hcad -- --apply`.
  - **Loaded:** 142,406 parcels and 1,285,421 tax-code rows for ZIPs 77002, 77003, 77004, 77006, 77007, 77008, 77019, 77021, 77098 and 77433. The database is 159 MB of 500.
    - 1,853 accounts had no tax codes and were skipped.
    - 1 malformed row in HCAD's countywide file was skipped (`ff75cbc`).
    - Also seeded: P1's body catalog (11 rows; same IDs and texting flags as before, P1's names) and the jurisdiction map (9 codes). All 646 agenda items are unchanged.
  - **Loader and staging:** parcel points are optional (the lookup uses the Census point). `load:hcad` now keeps shared addresses and unmapped codes and skips parcels with no codes (`planHcadLoad`).
  - **Shared street addresses (condos, and one street address in two ZIPs):**
    - New migration `20261021050753_hcad_lookup_code_sets.sql`, applied. `lookup_hcad_parcel` returns one account per different tax-code set at an address, instead of the first 2 accounts. Before this, 219 addresses could get the wrong answer.
    - The route confirms an address when all its accounts share the same *tracked* codes, and lists only the untracked governments every account shares. When tracked codes differ it uses the Census answer instead of returning "not found".
    - Result: 3,750 of 3,799 shared addresses are confirmed; 49 use the Census answer.
  - **Names:**
    - Codes with no name in HCAD's public list are no longer shown. Ten such codes appear in these ZIPs; "HCAD tax code 888" told readers nothing.
    - HCAD abbreviations are spelled out ("Houston Downtown Management District").
- **Files:** `.github/workflows/hcad-slice.yml`, `scripts/{stage-hcad,load-hcad}.ts`, `lib/lookup/{hcadStaging,hcadSource,uncovered}.ts`, `app/api/lookup/route.ts`, `supabase/migrations/20261021050753_hcad_lookup_code_sets.sql`, `docs/p1-data-loading.md`, `tests/lookup/{hcadStaging,uncovered}.test.ts`, `tests/api/lookup-route.test.ts`
- **Contract changes (P1):**
  - `lookup_hcad_parcel` keeps its signature and columns, but its rows now mean "one per tax-code set", with no row limit. `lib/database.types.ts` is unchanged.
  - `uncoveredFromHcadCode` returns `null` for unnamed codes.
  - The route reads the whole `jurisdiction_map` up front.
  - P1's shared-address test now expects the Census answer, not a 404.
- **Checked:**
  - New tests failed first, then passed. `npm test`: 786 Vitest + 69 P4 pass. Typecheck, lint and build pass.
  - Built app against the real database:
    - 901 Bagby St (City Hall, 77002) is confirmed by HCAD, with 7 tracked governments plus the Hospital District, Department of Education and Downtown Management District.
    - 10707 Mason Rd (Bridgeland HS, 77433) is confirmed with CFISD, Lone Star and MUD 489, plus WCID 157, WCID 159 and ESD 9.
    - 3100 Cleburne St (TSU, 77004) has no exact HCAD street match, so it uses the Census answer.
    - Pasadena City Hall is outside the loaded ZIPs, so it uses the Census answer.
  - In the browser at 390 px: `/results` shows "Address match verified" for every body with no sideways scroll, and `/app` shows real City Council and HISD items with no "Sample data".
  - The Supabase security check shows nothing new.
- **Open issues / next:**
  - Production is still pinned to `showup-kljzsrb88` and needs promoting to a build with these changes.
  - Other ZIPs: rerun the workflow with the full list.
  - Boundaries (GIS) aren't loaded and aren't needed for the lookup.
  - ESDs, WCIDs and the countywide Hospital District and Department of Education are listed but not tracked.

### 2026-10-21: Lookup fix, part 1: never fails on governments we don't track; Census fallback
- **Who:** PlaidMod · P5 Platform (changes to P1's lookup, decided by PlaidMod)
- **Branch:** main
- **What changed:** Fixes problems 1 and 3–7 from the review entry below.
  - **Unknown governments:** HCAD codes with no curated body (043 Hospital District, 044 Department of Education, ESDs, other ISDs and cities) and Census places or districts outside the catalog no longer fail the lookup. They're listed in a new `uncovered` array by official name, typed for the quiz, and are never put in the token.
    - Names come from HCAD's public list, in `data/hcad-jurisdictions.json` (708 codes, names only; regenerate with `npx tsx scripts/fetch-hcad-jurisdictions.ts`).
    - The helpers are in `lib/lookup/uncovered.ts`.
  - **No HCAD parcel loaded:** the lookup falls back to the Census answer (city, school district, college district, and the countywide governments), sets `match: 'census'`, and puts every listed body in the token so the dashboard works. `/results` labels these "From the Census, not yet confirmed" and explains why.
  - **Several accounts at one address** (condos) are accepted when their tax codes match.
  - CenterPoint is listed once.
  - **The quiz:** `/api/quiz` also counts `uncovered_types`, which `BodyQuiz` now sends.
- **Files:** `app/api/lookup/route.ts`, `lib/contracts/lookup.ts`, `lib/lookup/uncovered.ts`, `data/hcad-jurisdictions.json`, `scripts/fetch-hcad-jurisdictions.ts`, `app/(public)/results/page.tsx`, `app/api/quiz/route.ts`, `components/flow/BodyQuiz.tsx`, `messages/{en,es}.json` (`Results`), `tests/api/{lookup,quiz}-route.test.ts`, `tests/lookup/uncovered.test.ts`, `tests/platform/lookupState.test.ts`
- **Contract changes:** `LookupResponse` gains `match: 'hcad' | 'census'` and `uncovered: LookupUncovered[]`. P1's tests that encoded fail-closed behavior now encode PlaidMod's decisions (list instead of fail; Census fallback).
- **Checked:**
  - The new tests failed first, then passed. `npm test`: 781 Vitest + 69 P4 pass. Typecheck, lint and build pass.
  - The built app against the real database (no HCAD data loaded yet):
    - 901 Bagby St gives `match: census` with 7 bodies, plus the Hospital District and Department of Education as uncovered.
    - Pasadena City Hall gives the countywide bodies, with Pasadena City Council and Pasadena ISD listed as uncovered.
  - In the browser, `/results` (Spanish, 390 px) shows the Census note, the "other governments" list and one CenterPoint, with no sideways scroll. The quiz wasn't submitted, to keep test rows out of `quiz_responses`.
- **Open issues / next:** Part 2 loads HCAD data for 10 ZIPs (77002, 77003, 77004, 77006, 77007, 77008, 77019, 77021, 77098, 77433) through a GitHub Actions run, so the big files never touch a laptop. `load:hcad` still refuses unknown codes and needs the same change. Production stays pinned to `showup-kljzsrb88` until the lookup is verified with real data.

### 2026-10-21: Review of P1's new lookup: problems not in P1's notes
- **Who:** PlaidMod · P5 Platform (review of `e26b379`, `app/api/lookup/route.ts` and `lib/lookup/`)
- **Branch:** main
- **What changed:** Docs only. These problems are on top of the open items P1 already listed (credentials, data loading, demo addresses, the unmapped-code decision). PlaidMod (P5) is fixing these next, so P1 doesn't need to.
- **Files:** `agent_handoff.md`
- **Contract changes:** None yet.
- **Checked:** Static review. HCAD's official code list was checked at `public.hcad.org/resources/jurlist.asp` on Oct 21. A local run against the real database returned 500 for 901 Bagby St (no HCAD data loaded).
- **Open issues / next, most severe first:**
  1. **Every real address fails.** Codes 043 (HARRIS COUNTY HOSPITAL DISTRICT) and 044 (HARRIS COUNTY DEPARTMENT OF EDUCATION) are countywide, so they should appear on every parcel (worth confirming against one real record). Neither is in `data/hcad-jurisdiction-map.yaml`, and any unmapped code throws "Some local taxing jurisdictions are not configured yet".
  2. **Unincorporated addresses fail.** They carry an ESD code (for example 633 = ESD 9, 640 = ESD 14), none is mapped, and the catalog has no ESD bodies. MUD 489 is unincorporated, so the demo MUD address would fail.
  3. **Anywhere outside Houston, HISD and CFISD fails with a 500 "Try again later".** Unmapped ISD and city codes cause it, and so do Census hints such as `katy_isd_board` or `pasadena_city_council` that aren't in the 11-entry catalog. Retrying can't help, and the classmate survey would hit this for most other addresses.
  4. **Only addresses whose HCAD data is loaded work.** P1 plans to load only the demo ZIP codes (the 500 MB limit), and there's no fallback. The previous Census-only lookup worked countywide.
  5. **Condos and townhomes fail.** Unit numbers are stripped, so several accounts share one key, and two or more matches throw "could not match that address to one parcel". These accounts normally have the same tax codes.
  6. **CenterPoint appears twice** once the catalog is seeded: it's hard-coded in the route and also read from `bodies` (`category: not_government`), giving duplicate cards and React keys.
  7. **The real reason never reaches the screen.** `components/flow/LookupProvider.tsx` (P5) keeps only the error code, so coverage gaps show as a generic server error.
  - P1's route tests mock a database in which every code is mapped, so none of these show up in the tests.

### 2026-10-21: P1's lookup migration applied; database types regenerated
- **Who:** PlaidMod · P5 Platform
- **Branch:** main
- **What changed:**
  - Applied P1's `p1_lookup_support` migration to Supabase. It recorded as version `20261021040012`, so I renamed the file from `20261020160000_p1_lookup_support.sql` to match. P1's entries that use the old name are out of date.
  - The migration adds `tax_rates.last_vote_date` and the service-role-only functions `load_hcad_batch`, `replace_hcad_boundary_layer`, `lookup_hcad_parcel`, `lookup_boundary_bodies` and `lookup_hoa_candidates`.
  - `lib/database.types.ts` now has the new column and functions, matching Supabase's generated types.
  - `docs/p1-data-loading.md` names the new file.
- **Files:** `supabase/migrations/20261021040012_p1_lookup_support.sql` (renamed), `lib/database.types.ts`, `docs/p1-data-loading.md`
- **Contract changes:** As in P1's entries: the new `tax_rates` column and the five functions. No new tables.
- **Checked:**
  - The migration applied cleanly. Its tables and columns were checked against `core.sql` first.
  - SQL: 0 tables without RLS, 0 policies. All five functions are `security invoker`, `anon` and `authenticated` can't execute them, and `service_role` can.
  - The security advisor shows nothing new (only the expected "RLS enabled, no policy" notices and the leaked-password setting).
  - `npm test`: 772 Vitest + 69 P4 pass. Typecheck and lint pass.
- **Open issues / next:**
  - **Production is pinned to `showup-kljzsrb88`** (a Vercel rollback after `3fc2599`). P1's new lookup still returns 500 for every address, because the HCAD parcels, `jurisdiction_map` and boundaries are empty. Promote a newer deploy only once the lookup works against the real database.
  - **For P1:**
    - run `npm run seed:bodies` and the HCAD / boundary loaders (`docs/p1-data-loading.md`)
    - pick the two demo addresses
    - get the team's decision on unmapped HCAD codes (fail closed vs. "other taxing unit")
  - P1 needs a copy of `.env.local`; ask PlaidMod privately.

### 2026-10-21: OpenRouter key is live; the Gemini key is gone
- **Who:** PlaidMod · P5 Platform
- **Branch:** main
- **What changed:**
  - **`OPENROUTER_API_KEY`:** set in the owner's `.env.local` and on Vercel (production and preview, stored as sensitive).
  - **Removed:** `GEMINI_API_KEY` and `GOOGLE_GENAI_USE_VERTEXAI`, from both.
  - **Live site:** redeployed. Every AI call (P2 extraction and news links, P3 stories and coverage, P4 coach) now goes through OpenRouter.
  - **Repo:** `.env.example` marks the Gemini-direct lines "not used"; `CLAUDE.md` says the key is set; `scripts/gemini-smoke.ts` now reports "OpenRouter" when that key is set.
- **Files:** `.env.example`, `CLAUDE.md`, `scripts/gemini-smoke.ts`
- **Contract changes:** None. Teammates' local `.env.local` copies need the new key; ask PlaidMod for it privately. Leave the Gemini lines blank.
- **Checked:**
  - The key is valid and on a paid plan, with a $10 spending cap.
  - With the Gemini key hidden from the process, these calls all worked: `generateJson` with `gemini-3.8-flash` and with `gemini-4-argon` (D17's fallback, which Vertex doesn't serve), and P2's `geminiFromEnv()` client.
  - After the redeploy, `/api/coach` answered from the AI (`provider: gemini`), and `/api/cron/stories` wrote 10 stories (9 AI, 1 template, 0 failed).
  - Cost so far: $0.08, about 0.8¢ a story.
- **Open issues / next:**
  - About 540 items still need stories. At 10 per run that takes many runs, and roughly $4–5 of the $10 cap. Raise the key's limit on OpenRouter if agenda reading and coverage also need room.
  - P3: putting upcoming meetings first in the story queue is still open (see the P2 Phase 2 part 1 entry).

### 2026-10-20: Pull OpenRouter changes and audit remaining readiness
- **Who:** BluePhoenix79 · P4 / integration audit
- **Branch:** main, clean fast-forward through `1e46631`
- **What changed:** Read the new provider/privacy/IP-limit handoffs and checked the root app against live table counts and actual routes. Added `docs/readiness.md` with prioritized owners, evidence needed and the legacy `/start` address-storage mismatch. No product-code or credential changes.
- **Files:** `docs/readiness.md`, `agent_handoff.md`
- **Contract changes:** None.
- **Checked:** 650 Vitest + 69 P4 tests (719), lint, typecheck and production build pass. Initial isolation-test timeout passed on the next full run. Built privacy/terms/Speak pages return 200; Spanish privacy text includes OpenRouter and coach cookie. Alerts cron rejects unauthorized requests (401); ingest and review routes return 404. Supabase reads succeed; ten civic/demo tables checked are empty.
- **Open issues / next:** Priorities: persisted ingestion and seeded data; real P1 lookup/quiz/tax receipt; OpenRouter key and live model checks; Twilio or explicit preview; review route; wired demo replay; evidence. Local provider remains Gemini-direct because the OpenRouter key is absent. `/start` still persists the address despite privacy copy. Deployment settings were not independently checked. No messages, submissions, writes to civic data, commit or push performed.

### 2026-10-20: P2 Phase 2, part 3: review queue, 3-hourly schedule, pitch line for D37
- **Who:** PlaidMod · P5 Platform, for P2
- **Branch:** main
- **What changed:**
  - **`/admin/review`** (spec P2-E, minimal): pending items with the quote, a "scanned, quote unverified" banner, the official source link, and Approve and Reject. Reject also sets tier `timeline`. A source health panel sits on top. Logic lives in `lib/review.ts`, and every action calls `requireAdmin()` and updates only rows that are still pending.
  - **`.github/workflows/ingest.yml`:** calls `/api/cron/ingest` every 3 hours, plus a manual run with an optional source and mode.
  - **Health fix:** `health()` no longer flags the manual source for having no meetings.
- **Files:** `app/admin/review/{page,actions}.tsx|ts`, `lib/review.ts`, `messages/{en,es}.json` (`Admin.review`), `lib/ingest/health.ts`, `.github/workflows/ingest.yml`, `.plans/scraper-progress.md`, `tests/platform/review.test.ts`, `tests/unit/health.test.ts`
- **Contract changes:** None.
- **Checked:**
  - The new tests failed first, then passed.
  - `npm test`: 721 Vitest + 69 P4 pass. Typecheck, lint and build pass, with no tracing warnings.
  - In the browser, `/admin/review` redirects to the login page when signed out (307). Signed in, it shows the health panel and an empty queue (no item needs review right now) in Spanish, with no sideways scroll at 390 px.
  - Approve and Reject weren't clicked against live data: the database edit that would have created a test item was blocked, so they're covered by unit tests only.
- **Open issues / next:**
  - **The owner should approve this replacement for the pitch answer in spec §12.22:** "For news sites we follow each site's robots.txt, name our bot, show only short quotes with links, and never get around paywalls. Government agendas are public records, so we fetch them even where a portal's robots.txt asks general crawlers to stay out (Houston's PrimeGov portal, Lone Star College's PDFs). We name our bot, wait between requests, check a few times a day, and link every item to the official source."
  - Disable the GitHub schedule after Oct 23.
  - **Not built:** review Edit and notices, the "Run now" button, the news read route, and the `news_articles` migration.

### 2026-10-20: P2 Phase 2, part 2: scheduled ingest route
- **Who:** PlaidMod · P5 Platform, for P2
- **Branch:** main
- **What changed:**
  - **New route `GET`/`POST /api/cron/ingest`** (spec P2-C). It runs `runScheduled` (`lib/ingest/scheduled.ts`) within 270 s:
    1. seed
    2. near-term sweep of every source (BoardBook skipped 00:00–05:00 Central; AI sources read at most 1 new document)
    3. rotation of the oldest-checked source
    4. results for up to 3 past meetings
    5. more rotation while time remains, at most one AI source per call
  - **Query options:** `?source=<id>&mode=rotation|near_term|results&meetings=a,b` runs one source.
  - **Auth and output:** it requires `CRON_SECRET` and returns counts and flags only. Vercel's daily cron already points here (`vercel.json`).
  - **Bundling:** `next.config.ts` ships `data/sources.yaml` and `data/manual/` with the route. Ignore comments on the two run-time file reads (`lib/adapters/manual.ts`, `lib/ingest/registry.ts`) stop Turbopack tracing the whole project: 681 traced files down to 151.
- **Files:** `app/api/cron/ingest/route.ts`, `next.config.ts`, `lib/adapters/manual.ts`, `lib/ingest/registry.ts`, `tests/unit/ingest-route.test.ts`
- **Contract changes:** None. The route path matches `vercel.json`.
- **Checked:**
  - The route tests failed first, then passed.
  - `npm test`: 715 Vitest + 69 P4 pass. Typecheck, lint and build pass, and the build shows no tracing warnings.
  - Part 1 is live: for 901 Bagby St, `/api/weekly` returns a City Council lead plus 6 coming up, with PrimeGov source links.
- **Open issues / next:** Part 3: the review page and the GitHub workflow.

### 2026-10-20: P2 Phase 2, part 1: agendas are saved to Supabase
- **Who:** PlaidMod · P5 Platform, building P2's Phase 2 at the owner's request (Iarush asked for help)
- **Branch:** main
- **What changed:**
  - **The robots.txt problem.** It wasn't specific to Gemini: our own bot downloads every page, and the model only reads what we pass it. The `*` group blocks every bot on City Council's PrimeGov site and on Lone Star's PDFs. Owner decision D37 (in `.plans/scraper-progress.md`): keep fetching these government records politely. News still follows D36.
  - **New ingest pipeline** (spec P2-B): `lib/ingest/run.ts`, with the store in `store.ts`, `supabaseStore.ts` and `memoryStore.ts` (tests). It upserts meetings and items, classifies with P3's `classify()`, sets review status, marks removed items, moves upcoming → awaiting_result, applies outcomes and stores documents. A second identical run writes nothing.
  - **Seeding:** `lib/ingest/bodies.ts` and `seed.ts` insert 10 body rows (insert-only) and mirror `data/sources.yaml` into `sources`.
  - **CLI:** `npm run ingest`.
  - **Adapter list:** `ADAPTERS` moved from `scripts/scrape.ts` to `lib/ingest/adapters.ts`.
  - **Adapters:** `llmExtract.ts` and `primegov.ts` accept `max_llm_docs`.
  - **Live backfill:** 646 items across 6 sources; per-source counts are in the progress log.
  - **Fixes to other parts' readers, which capped or dropped rows once real data arrived** (new `lib/paging.ts`):
    - P3's `loadItems` (`lib/weekly/data.ts`) took 500 unordered rows, so City Council and HISD vanished behind 493 Commissioners Court items. It now pages through all rows.
    - P3's `loadPerspectives` now asks for IDs in batches.
    - P4's `loadRegistrationWindows` now pages.
- **Files:**
  - `lib/ingest/{run,store,supabaseStore,memoryStore,bodies,seed,adapters}.ts`
  - `lib/paging.ts`, `scripts/ingest.ts`, `scripts/scrape.ts`, `lib/adapters/{llmExtract,primegov}.ts`
  - `lib/weekly/data.ts`, `lib/perspectives/job.ts`, `lib/registration/server.ts`
  - `package.json`, `CLAUDE.md`, `.plans/scraper-progress.md`
  - tests: `tests/unit/ingest-{run,scheduled,bodies}.test.ts`, `tests/platform/paging.test.ts`, plus new cases in the llmExtract and primegov tests
- **Contract changes:**
  - **For P1:** `bodies` now has rows for `houston_city_council`, `commissioners_court`, `flood_control`, `port_houston`, `hisd_board`, `cfisd_board`, `hcc_board`, `lone_star_board`, `hcmud_489` and `hcad`. They're inserted only when missing and never overwritten, so fill in the other columns freely, but don't rename the IDs.
  - **`sources`:** the table mirrors the YAML, and `sources.last_checked` now means "last rotation run".
  - **`items`:** the meeting columns and `review_status` follow spec P2-B.
- **Checked:**
  - New tests failed first, then passed. Breaking the retry rule on purpose made its test fail.
  - `npm test`: 709 Vitest + 69 P4 pass. Typecheck, lint and build pass.
  - Live, against Supabase: each source run twice, and the second run wrote nothing. SQL found 0 duplicate items or meetings and no names in redacted titles.
  - On production, the lookup for 901 Bagby St returned real bodies. `/api/weekly` showed no upcoming items because of the 500-row cap. Run locally with the fix, it gives a City Council lead story plus 6 coming up.
- **Open issues / next:**
  - Part 2: the `/api/cron/ingest` route and scheduler. Part 3: the review page, the GitHub workflow and the D37 pitch line.
  - **P3:** the story job takes the oldest meeting first, 10 per run, and every flagged item gets a story, so 493 past Commissioners Court items sit in front of upcoming ones. Consider putting upcoming meetings first.
  - BoardBook pages hash differently on every fetch, so each run stores 2 new document rows.
  - `gemini-4-argon` returns 404 on Vertex (fine once the OpenRouter key is set). The backfill used `gemini-3.1-pro-preview` as the fallback.
  - **Iarush:** pull before editing `lib/adapters/llmExtract.ts`, `lib/adapters/primegov.ts`, `scripts/scrape.ts` or `lib/ingest/`.
### 2026-10-20: Prepare P1 lookup implementation for P5 setup
- **Who:** Marie Gary Blueberry · P1 Lookup and Results
- **Branch:** main
- **What changed:** Prepared the P1 lookup and results implementation, source-backed jurisdiction loaders, route-level tests, and body, quiz, and tax-receipt flows for handoff to P5. P5 Supabase credentials, migration application, and source-data loading are still needed to continue live verification.
- **Files:** P1 lookup routes, contracts, data loaders, migration, results/body/quiz/tax-receipt UI and tests; `agent_handoff.md`.
- **Contract changes:** See the P1 implementation entry below; P5 must apply the migration and regenerate database types.
- **Checked:** `npm test` (701 Vitest + 69 P4 tests), `npm run typecheck`, `npm run lint`, and `git diff --check` passed. Live Supabase lookup is unverified because no local credentials are configured.
- **Open issues / next:** P5 to provide Supabase credentials, apply the P1 migration, and coordinate source data loading; then run live lookup and browser checks.

### 2026-10-20: Close P1 lookup test and data-loader blockers
- **Who:** Marie Gary Blueberry · P1 Lookup and Results
- **Branch:** main
- **What changed:** Added route-level `/api/lookup` tests, HCAD real-property TSV-to-sanitized staging, dry-run/apply HCAD and City/School/College boundary loaders, a source-backed map for nine HCAD codes, and source-loading instructions. Lookup now fails closed for unmapped HCAD codes or missing catalog bodies; boundary replacement is atomic per full mapped layer and validates the manifest/vintage/source URL.
- **Files:** `app/api/lookup/route.ts`, `lib/lookup/{hcadSource,hcadStaging,boundaryStaging}.ts`, `scripts/{stage-hcad,load-hcad,load-boundaries,seed-hcad-jurisdictions}.ts`, `data/{hcad-jurisdiction-map,boundary-sources}.yaml`, P1 migration, `docs/p1-data-loading.md`, route and staging tests, `package.json`.
- **Contract changes:** P1 migration adds `load_hcad_batch` and atomic `replace_hcad_boundary_layer` RPCs. P5 must apply it and regenerate `database.types.ts`; permissions remain service-role-only.
- **Checked:** `npm test` (701 Vitest + 69 P4 tests), `npm run typecheck`, `npm run lint`, jurisdiction/body seed checks, and `git diff --check` passed. Synthetic HCAD TSV+GeoJSON successfully ran through staging and HCAD loader dry run; fixture stayed under ignored scratch. Local HTTP smoke checks returned 200 for `/`, `/start`, `/results`, and `/app/districts`. No real HCAD data or live lookup was run.
- **Open issues / next:** `.env.local` and Supabase credentials are absent, so migration, seeds, live lookup, and PostGIS loader RPCs remain unapplied/unverified. P1 still needs the two demo ZIPs/addresses and must verify all their codes; only nine HCAD codes are mapped. HCAD City/School/College layers do not cover Houston council districts, ESD/METRO/precinct, or regional water bodies. The plan's generic “other taxing unit” mapping conflicts with safe fail-closed code handling and needs a team choice. Visual browser testing still needs an approved Chrome session.

### 2026-10-20: Implement P1 lookup, results, quiz, and tax surfaces
- **Who:** Marie Gary Blueberry · P1 Lookup and Results
- **Branch:** main
- **What changed:** Replaced Census-only lookup with Census/HCAD/GIS merge logic, including countywide HCAD, signed body-ID access, HOA candidate review states, quiz scoring/write route, sourced tax receipt and body detail pages. Updated assigned prototype district/vote screens and added a dry-run-first canonical body catalog seed.
- **Files:** `app/api/lookup`, `app/api/quiz`, `app/api/tax-receipt`, `app/api/bodies`, public results/body/receipt pages, `lib/lookup`, `lib/quiz.ts`, `lib/taxReceipt.ts`, `data/bodies.yaml`, `scripts/seed-bodies.ts`, P1 support migration, EN/ES messages and tests.
- **Contract changes:** Added `tax_rates.last_vote_date` and service-role-only HCAD, boundary, and HOA lookup RPCs. P5 must apply the migration and regenerate `database.types.ts`.
- **Checked:** `npm test` (676 Vitest + 69 P4 tests), `npm run typecheck`, `npm run lint`, `git diff --check`, and `npm run seed:bodies -- --check` passed. `npm run build` is blocked because Google Fonts requests fail in this environment.
- **Open issues / next:** No live Supabase env or migration run; canonical seed was not applied. HCAD/boundary loaders, verified jurisdiction map, address selection, GIS coverage, demo cache/data, and live/PostgREST/browser checks remain. Do not claim end-to-end acceptance until sourced data is loaded and both demo addresses are verified.

### 2026-10-20: Review P1 baseline against implementation plans
- **Who:** Marie Gary Blueberry · P1 Lookup and Results
- **Branch:** main
- **What changed:** Reviewed current P1 code against the product/technical plans and `tmp/scratch/ishaan_implementation_plan.md`; application code and plan files unchanged. Current lookup remains Census-only; HCAD/GIS resolution, quiz submission/scoring, HOA, tax receipt and public body APIs/pages are pending.
- **Files:** `agent_handoff.md`
- **Contract changes:** None.
- **Checked:** Static inspection of lookup, contracts, tokens, demo helpers, core migration, prototype data bridge and Districts/Vote screens. Targeted Vitest command did not run: no root `node_modules` or local Vitest; stopped the pending `npx` invocation without test output. No live data or browser verification.
- **Open issues / next:** Missing live tax/turnout fields currently produce false “No separate tax”/appointed-board claims. Vote filters prototype `-mud-` IDs, excluding canonical `hcmud_489`, then claims no measures. Lookup does not use demo cache. Coordinate `last_vote_date`, spatial/HOA query support and the missing P2 news read route; await the other session's implementation details for focused review. Demo addresses and 20-address evidence remain unverified in this review.

### 2026-10-20: Add ignored P1 implementation plan
- **Who:** Marie Gary Blueberry · P1 Lookup and Results
- **Branch:** main (`1e46631`)
- **What changed:** Added the decision-ready P1 implementation plan in the existing ignored scratch area. It clarifies P1/P5 database responsibilities, data flow, demo-first sequence, the editable $250K reference value, and acceptance checks.
- **Files:** `tmp/scratch/ishaan_implementation_plan.md`, `agent_handoff.md`
- **Contract changes:** None; planning document only.
- **Checked:** `tmp/` ignore rule and current P1 routes/contracts inspected; documentation only.
- **Open issues / next:** Q10 adult account owner remains pending and does not block P1. The demo addresses still need to be selected and verified during implementation.

### 2026-10-20: Stress test answers: Marie Gary Blueberry (P1)
- **Who:** Marie Gary Blueberry · P1 Lookup and Results
- **Branch:** main (`1e46631`)
- **What changed:** Recorded the teammate's plan stress-test answers. Q1 P1; Q2–Q9 yes; Q10 adult account owner still pending; Q11–Q16 yes (P2 spec and manual-entry fallback as stated); Q17 dropped because its Monday date passed; Q18 yes; Q19 yes to Twilio API with labeled preview fallback; Q20 yes to Wed evening survey only after live lookup, aim 15/minimum 10 by Thu noon; Q21 willing to register for Oct 27 City Council, not speak.
- **Files:** `agent_handoff.md`
- **Contract changes:** None.
- **Checked:** Compared against the answers received in chat and `plan_stress_test.md`; docs only.
- **Open issues / next:** Q10 remains pending and does not block P1. Survey waits for real Census + HCAD lookup. City Council evidence should say "registered," not "spoke."

### 2026-10-20: Pull latest main and remove local review note
- **Who:** Marie Gary Blueberry · P1 Lookup and Results
- **Branch:** main (`1e46631`)
- **What changed:** Removed the earlier local P1 review entry at the teammate's request, then fast-forwarded from `origin/main`. The pulled update routes shared AI calls through OpenRouter when configured and retains direct Gemini fallback.
- **Files:** upstream changes to `.env.example`, `CLAUDE.md`, `Technical_Implementation_Plan.md`, `agent_handoff.md`, shared AI adapters/routes, messages, and tests.
- **Contract changes:** Provider configuration adds `OPENROUTER_API_KEY`; Gemini model environment variables stay in use.
- **Checked:** `git pull --ff-only origin main` succeeded, updating `7ca1b60` to `1e46631`; branch matched `origin/main` immediately after pull.
- **Open issues / next:** The worktree now contains only this required handoff note. Refresh the P1 plan against the updated code and plan; OpenRouter availability depends on configuration.

### 2026-10-20: Tech plan now names OpenRouter as the AI provider
- **Who:** PlaidMod · P5 Platform
- **Branch:** main
- **What changed:** At PlaidMod's request, `Technical_Implementation_Plan.md` now says AI calls use Google's Gemini models through OpenRouter. The revision line lists the sections changed. This closes the "Tech plan §1" open item in the entry below.
  - **§1:** names the provider and the default models (`gemini-3.8-flash`, and `gemini-4-argon` for D17), and says to use paid models and check OpenRouter's data-use settings.
  - **§14:** the privacy line says drafts go to OpenRouter, then Google.
  - **§19:** paid models only; OpenRouter, Google and Twilio are named as processors.
  - **§21:** the env var list has `OPENROUTER_API_KEY`, and `GEMINI_API_KEY` is marked temporary.
  - **§22:** the model, pricing and budget checks name OpenRouter.
- **Files:** `Technical_Implementation_Plan.md`
- **Contract changes:** None.
- **Checked:** Docs only; no code changed.
- **Open issues / next:** None from this change.

### 2026-10-20: OpenRouter confirmed as the AI provider; coach IP limit and privacy page fixed
- **Who:** PlaidMod · P5 Platform
- **Branch:** main
- **What changed:**
  - **OpenRouter:** PlaidMod confirmed it for every AI call, which replaces tech plan §1's Gemini direct and answers Iarush's entry below. Gemini direct stays only until `OPENROUTER_API_KEY` is set.
  - **Fallback model:** P2's default `gemini-pro-latest` isn't on OpenRouter. It's now `gemini-4-argon`, Google's flagship, which is on OpenRouter's model list (checked Oct 20) with structured output and PDF input; the Google SDK takes the same name.
  - **Coach IP limit:** with no trusted header, every visitor on Vercel shared one IP budget, so the whole site got 20 coach calls an hour. `COACH_TRUSTED_IP_HEADER=x-real-ip` is now set in Vercel production and preview, and the handler trims the value.
  - **Privacy page:** names the cookies actually set (`showup_coach_id`, `showup_bodies`, `showup_sub`; `showup_bid` was never set), Photon/OpenStreetMap street suggestions, and OpenRouter. Its date is now Oct 20; the terms page keeps Oct 19.
- **Files:** `lib/adapters/gemini.ts`, `lib/coach/http.ts`, `app/api/coach/route.ts`, `lib/env.ts`, `.env.example`, `messages/{en,es}.json`, `components/legal/LegalDocument.tsx`, `CLAUDE.md`, `tests/platform/openrouter.test.ts`, `tests/coach/integration.test.ts`
- **Contract changes:**
  - None to the schema or types.
  - `Legal.effective` is now `Legal.privacy.effective` and `Legal.terms.effective`.
  - New env var `COACH_TRUSTED_IP_HEADER` (P4).
  - Older entries that call OpenRouter optional, or Gemini the provider, are out of date.
- **Checked:**
  - The 2 new tests failed first, then passed.
  - `npm test`: 650 Vitest + 69 P4 tests pass. Typecheck, lint and build pass.
  - The built `/privacy` (en, es) and `/terms` pages show the new text and dates.
  - `google/gemini-3.8-flash` and Vercel's judge model `google/gemini-3.5-flash-lite` are on OpenRouter with structured output.
  - No live OpenRouter call was made (no key yet).
- **Open issues / next:**
  - When the key arrives: add it to `.env.local` and Vercel, remove `GEMINI_API_KEY` and `GOOGLE_GENAI_USE_VERTEXAI`, and make one live call.
  - P3: the news spec wants a Pro judge. 3.5 Flash Lite was picked because Pro wasn't usable on Vertex, and `gemini-4-argon` is available now.
  - Tech plan §1 still says Gemini direct.
  - `BROWSER_ID_COOKIE`/`readBrowserId` in `lib/rateLimit.ts` are unused, because P4 uses its own cookie.

### 2026-10-20: Route LLM calls through OpenRouter when its key is set
- **Who:** Iarush
- **Branch:** main
- **What changed:** Added an OpenRouter transport (`lib/openrouter.ts`). When `OPENROUTER_API_KEY` is set, every LLM call (shared `generateJson` for stories/coach/perspectives, and P2's `geminiFromEnv()` for extraction, minutes and news linking) goes to OpenRouter; otherwise Gemini is used as before. Routes now gate on `llmConfigured()` (either key). Model IDs still come from `GEMINI_*_MODEL`; bare IDs get a `google/` prefix.
- **Files:** `lib/openrouter.ts`, `lib/gemini.ts`, `lib/adapters/gemini.ts`, `lib/env.ts`, coach/cron routes, `llm_unavailable` warning text in P2 adapters + tests, `.env.example`, `tests/platform/openrouter.test.ts`.
- **Contract changes:** None to schema/types. New env var `OPENROUTER_API_KEY`. Deviates from tech plan §1 (Gemini direct): the team should confirm. `llm_unavailable` warning text changed (P2).
- **Checked:** `npm test` 648 Vitest (incl. 5 new OpenRouter tests) + 69 P4 pass; ESLint clean. `tsc --noEmit` errors only in pre-existing `scraper P2/tmp/` scripts, none in changed files. No live OpenRouter call made.
- **Open issues / next:** Add `OPENROUTER_API_KEY` to `.env.local` and Vercel. `gemini-pro-latest` (P2 fallback default) is likely not an OpenRouter ID; set `GEMINI_EXTRACT_FALLBACK_MODEL` to a real one. `lib/coach/gemini.ts` (test-only) unchanged.

### 2026-10-20: Validate configured P4 and prepare publication
- **Who:** BluePhoenix79 · P4 Speak up
- **Branch:** main
- **What changed:** Validated the newly supplied local configuration without exposing values. Restored the tracked environment template after it was renamed. Final review fixed Council weekday applicability before offering methods, explicit channel changes now clear prior confirmation, and normal picker defaults exclude past/outcome-pending meetings. Kept explicit historical links available.
- **Files:** P4 modules/screens/tests, root message and data bridges, `docs/p4-status.md`; original merge details below.
- **Contract changes:** No additional shared contracts beyond the prior merge entry.
- **Checked:** 643 Vitest + 69 P4 tests (712 total), lint, typecheck and production build pass. New regressions failed before fixes and pass afterward; independent re-review found no remaining issues in the fixes. Built browser confirms Tuesday Council methods remain available and Wednesday voting items show unknown registration guidance. Configured Gemini structured output and EN/ES coaching pass, including HTTP 200/no-store through the built API. Supabase tables and atomic counter RPC pass; reminders without verified subscription return 401.
- **Open issues / next:** Civic data tables are empty; populate them through the ingestion workflow before claiming real agenda coverage. Twilio is unset; no SMS, registration or public comment was sent. Full provider golden/load testing and MUD rule verification remain open. Local environment values stay ignored. Commit/push authorized by the teammate after checks; recovery stash retained.

### 2026-10-20: Merge upstream platform, scraper and news with P4
- **Who:** BluePhoenix79 · P4 Speak up
- **Branch:** main, pulled through `748dd41`
- **What changed:** Preserved local work in a recovery stash, fast-forwarded upstream and resolved CLAUDE/handoff conflicts while retaining both histories. Migrated P4 to the root app, restored `web/` to the upstream reference, and connected shared SDK/model configuration, database rate counters, root locales/logos/body IDs, live item loading, P3 deep links, reminder requests and known bounds for the alerts cron. Unknown/special meetings stay conservative; late texts no longer promise unverified written alternatives.
- **Files:** `app/(prototype)/app/speak`, `/speak-up/[itemId]`, `/api/coach`, `components/speak`, `lib/{coach,registration,speak}`, P3 data/screen bridges, root messages/tests/docs/tooling.
- **Contract changes:** `Update` gains optional `meetingType` and `agendaNumber`; `comment.minutes` is nullable for unverified allocations. Dashboard/brief/story consumers handle unknown limits. No DB schema, bodies_token, classify or Meeting/Item changes.
- **Checked:** 642 Vitest + 67 P4 tests (709 total), ESLint, typecheck and production build pass. An initial isolation-test timeout passed on rerun. Built app browser: four-step demo, Spanish toggle, draft reload persistence, no overflow at 390px, correct P3-item redirect. Built API returns 400 for malformed input and 403 cross-origin. No unresolved conflicts or whitespace errors.
- **Open issues / next:** Add environment values at the root and restart. Live Gemini, real database quotas/reminders/SMS and real public-comment evidence remain unverified. MUD rules still need confirmation. Dependency install reported 9 high advisories in upstream dependencies; no unrequested dependency updates made. Recovery stash retained. Environment files untouched and ignored; nothing committed or pushed.

### 2026-10-20: P4 verification and documentation audit
- **Who:** BluePhoenix79 · P4 Speak up
- **Branch:** main
- **What changed:** Re-read repository instructions, handoffs, product/technical plans and P4 modules against acceptance requirements. Fixed corrupt saved browser IDs passing client validation but failing server UUIDv4 validation, with a regression observed failing before and passing after the fix. Corrected stale no-API guidance and documented expired research deadlines and incomplete acceptance criteria.
- **Files:** `CLAUDE.md`, `web/README.md`, `.plans/p4-implementation.md`, `web/docs/p4-status.md`, `web/src/lib/speak/client.ts`, `web/tests/speak-client.test.mjs`
- **Contract changes:** None.
- **Checked:** Fresh 72/72 tests, ESLint and TypeScript pass. Production build fails fetching Overpass, Libre Franklin and Playfair Display from Google Fonts. Dev server reaches ready; browser navigation times out and direct localhost HTTP is socket-denied.
- **Open issues / next:** Full P4 acceptance remains incomplete: MUD recipe verification, live provider golden evaluation, shared P3/P5 services and actual participation evidence. Subject shortening is deterministic; phone guidance is abbreviated. No live provider or interactive browser success claimed; no commit, push, registration or public comment submitted.

### 2026-10-20: `item_perspectives` table added; prototype-UI rule confirmed
- **Who:** PlaidMod · P5 Platform
- **Branch:** main
- **What changed:**
  - Applied P3's `item_perspectives` migration to Supabase. Supabase recorded it as version `20261020054945`, so the file is renamed to match. The old file name in the 2026-10-19 P3 entry is out of date.
  - Added the table to `lib/database.types.ts`, from Supabase's generated types. Nothing else in that file changed.
  - **PlaidMod confirmed the Oct 20 rule change:** the prototype UI is the app's UI (see "The prototype UI is now the app's UI" below). Older entries that call `web/` throwaway are out of date.
- **Files:** `supabase/migrations/20261020054945_item_perspectives.sql` (renamed), `lib/database.types.ts`
- **Contract changes:** DB schema: new P3 table `item_perspectives`, with RLS on and no policies.
- **Checked:**
  - Supabase: 0 tables without RLS, 0 policies, and the new table is empty.
  - The security advisor shows only the expected "RLS enabled, no policy" notices.
  - `npm test` (636/636, including the migrations RLS checks), typecheck and lint pass.
- **Open issues / next:**
  - **P3:** `lib/perspectives/job.ts` can use `db()` instead of its untyped client, now that the types include the table.
  - **Deploy:** Vercel blocked sohankamsala's push (`540e161`), because the repo is private, and it can't be redeployed. It goes live with PlaidMod's next push or a CLI deploy by PlaidMod.

### 2026-10-20: P3's app screens follow the plan, in English and Spanish
- **Who:** sohankamsala · P3 Weekly News and Alerts
- **Branch:** main (local commit; not pushed)
- **What changed:** P3's `/app` screens (brief, timeline, alerts and the story sheet) now follow the plan and are translated.
  - **`/app/brief`:** with real data, it uses `buildWeekly()` (plan §10): lead story, "Coming up", "Decided" with "Outcome not posted yet", a "Deadlines this week" sidebar and the template intro line. Decided stories carry the "What news coverage says" block (§9a). The demo keeps its own ordering.
  - **Story sheet:** shows the coverage block, the Spanish story on Spanish pages, the AI label in the page's language, and "Outcome not posted yet".
  - **`/app/timeline`:** the "Decided" tab includes items still waiting on minutes.
  - **`/app/alerts`:** the phone preview now uses the real text code (`itemAlertText`, `reminderText`). The copy matches §11: quiet hours are 8 p.m.–8 a.m. Central with no exception, and STOP stops texts. Before, it said 9 p.m., "unless a vote happens that night" and "we delete your number within 24 hours", none of which the code does.
  - **Time zone:** every date in the `/app` screens (`lib/prototype/format.ts`) is shown in America/Chicago, in the page's language.
  - **Translation (tech plan §17):** P3's screens use new message namespaces `AppBrief`, `AppTimeline`, `AppStory`, `AppAlerts` and `AppLabels`, in en and es.
  - **Text bug fixed:** Spanish texts ended times with "p.m.." (`lib/sms/message.ts`). There's a new regression test.
- **Files:** `app/(prototype)/app/{brief,timeline,alerts}/`, `components/prototype/{story-sheet,civic}.tsx`, `lib/prototype/{live,liveData,profile,format,types}.ts`, `lib/sms/message.ts`, `messages/*.json`, `tests/prototype/live.test.ts`, `tests/sms/sms.test.ts`
- **Contract changes:** The `lib/prototype/types.ts` `Update` type gains `coverage` and `outcomePending`. `LiveData` gains `weekly`. `TierPill` in `components/prototype/civic.tsx` is now translated.
- **Checked:**
  - `npm test` (636), lint and typecheck pass.
  - In the browser, brief, timeline, alerts and the story sheet in en and es, demo and live: no console errors or missing messages.
  - No horizontal scroll at 320–1920px (en) or at 320 and 390px (es).
- **Open issues / next:**
  - **P5:** the shell (sidebar, banner, search) and the sheet's "Close" label are still English (§17: P5's).
  - **Demo data:** demo stories stay English, since the plan replaces mock data rather than translating it.
  - **P3's earlier pages:** `/weekly`, `/timeline` and `/alerts` still exist alongside `/app/*`; see the entry above.
  - **Twilio registration:** still not started. It needs an adult account owner.
  - **P4:** `registration_closes_at` stays null until P4's resolver exists, so real items show no sign-up deadlines yet.

### 2026-10-20: Official logos for governments
- **Who:** sohankamsala · P3 Weekly News and Alerts
- **Branch:** main (local commit; not pushed)
- **What changed:** The app showed only generic icons, so it looked made up even where the data is real. Each body now shows its official logo or seal wherever it appears: home page stack, `/results`, `/weekly`, `/timeline`, the `/app` sidebar, dashboard, districts, body pages, brief tiles, story sheet, speak and vote.
  - **Bodies with logos:** HISD, Cy-Fair ISD, City of Houston (seal), Harris County, Flood Control, HCC, Lone Star, Harris Health, MUD 489 and CenterPoint. Bodies without one keep their icon tile.
  - **Source:** each file was downloaded once from the body's own website and is served from `public/logos/`, so readers' browsers never contact those sites. `lib/bodyLogos.ts` lists the source of each file.
  - Brief tiles now clamp long headlines so the button always shows; real headlines are longer than the demo ones.
- **Files:** `public/logos/`, `lib/bodyLogos.ts`, `components/civic.tsx` (new `LogoTile`; `BodyIcon` takes an optional `id`), `components/prototype/civic.tsx`, `components/home/GovernmentStack.tsx` (P5's), `app/(prototype)/**`, `app/(public)/{results,weekly,timeline}/page.tsx`
- **Contract changes:** None. `BodyIcon`'s new `id` prop is optional.
- **Checked:** `npm test`, lint and typecheck pass. A browser sweep of 9 pages, in demo and live mode at 320–1920px, found no broken images, console errors or horizontal scroll.
- **Open issues / next:**
  - **Missing logos:** Port Houston (its site blocks downloads) and HCAD (no usable mark).
  - **Logo use:** logos are shown only to identify the body. If the team would rather not use agency marks, delete the entries in `lib/bodyLogos.ts` and the icons come back.

### 2026-10-20: The prototype UI is now the app's UI (`/app`, `/start`)
- **Who:** sohankamsala · P3 Weekly News and Alerts
- **Branch:** main (local commit; not pushed)
- **What changed:** The team decided to use the prototype's finished UI instead of rebuilding it. Its screens were moved from `web/` into the root app as they were, and their demo data is now being replaced with real data screen by screen.
  - **Routes:** `/app` (dashboard), `/app/brief`, `/app/timeline`, `/app/districts`, `/app/districts/[id]`, `/app/speak`, `/app/vote`, `/app/alerts` and `/start`, all with the prototype's sidebar shell.
  - **Real data so far:**
    - After an address lookup, `/results` has "Open your dashboard". It goes through `/app/use?t=<bodies_token>`, which keeps the token in an httpOnly `showup_bodies` cookie (body IDs only).
    - With that cookie, every `/app` screen shows the reader's real bodies and P3's real items (`lib/weekly/data.ts`: `classify()` tiers, stories, the AI label and source links).
    - `/app/alerts` uses P3's real Twilio sign-up (`AlertSignup`).
    - Without the cookie, the screens show the demo neighborhood with its "Sample data" label. Without Supabase, they show P3's labeled sample items.
  - **Still demo data:** body descriptions beyond what's known for 7 bodies, `/app/speak`, `/app/vote` and `/start` onboarding.
- **Files:** `app/(prototype)/`, `components/prototype/`, `lib/prototype/` (`live.ts` maps real data onto the screens, `liveData.ts` loads it), `app/(public)/results/page.tsx`, `tests/prototype/`, and the docs: `CLAUDE.md`, `AGENTS.md`, `web/AGENTS.md`, `DESIGN.md` (top note), `README.md`, plus the contract list at the top of this file.
- **Contract changes:**
  - **Docs:** `CLAUDE.md` and `AGENTS.md` used to say `web/` was throwaway. They now say its UI is the app's UI and its sample data gets replaced. Earlier entries that call `web/` throwaway are out of date.
  - **New cookie:** `showup_bodies` holds a `bodies_token`.
  - The `lib/prototype/types.ts` `Update` type gains `aiWritten` and `itemPath`.
- **PlaidMod, please confirm:** this reverses the old "don't build on `web/`" rule. Tech plan §17 already assigns each part its prototype screens to convert (P1: districts and vote; P3: timeline, brief and alerts; P4: speak; P5: home, onboarding and shell). Change it back if you disagree.
- **Checked:** `npm test`, lint and typecheck pass. In the browser, I went from the address box through the stake picker and results to the dashboard, then opened every `/app` screen and a story. There were no console errors and no horizontal scroll at 1366px or 390px.
- **Open issues / next:**
  - **Everyone:** the screen text is still English in code. Move it into `messages/*.json` per tech plan §17.
  - **P1:** body pages need real descriptions; `toBody()` in `lib/prototype/live.ts` leaves them empty rather than inventing them.
  - **P4:** `/app/speak` builds a comment from a template; check it against the "never ghostwrites" rule before wiring it to real data.
  - **P5:** `/weekly`, `/timeline` and `/alerts` (P3's earlier pages) duplicate `/app/brief`, `/app/timeline` and `/app/alerts`. Decide whether to redirect them; text links still go to `/items/[id]`, which stays.
  - The dev palette picker wasn't carried over.

### 2026-10-19: Address suggestions and a stand-in /api/lookup
- **Who:** sohankamsala · P3 Weekly News and Alerts (filling a P1 gap)
- **Branch:** main (local commit; not pushed)
- **What changed:** The home address box failed for every address because P1's `/api/lookup` doesn't exist yet.
  - **Dropdown:** the box now suggests streets as you type (ARIA combobox: arrow keys, Enter, Escape). Suggestions come from Photon (OpenStreetMap), limited to Harris County. Only the street words are sent; the house number stays in the browser.
  - **Stand-in lookup:** `POST /api/lookup` follows `lib/contracts/lookup.ts`. It geocodes with the Census Geocoder and returns the bodies it can infer: city council, county, flood control, port, school board, college board and HCAD. It can't find MUDs, ESDs, METRO or HOAs. It returns `outside_harris` for other counties.
  - **Temporary `/results`:** lists the bodies with links to `/weekly?t=` and `/alerts?t=`.
  - Nothing about the address is stored or logged.
- **Files:** `components/home/AddressForm.tsx`, `lib/lookup/` (`suggest.ts`, `census.ts`, `standIn.ts`), `app/api/address/suggest/route.ts`, `app/api/lookup/route.ts`, `app/(public)/results/page.tsx`, `messages/*.json` (`Home.suggestions*`, `Home.addNumber`, `Results`), `tests/lookup/`
- **Contract changes:** None. The route matches P1's draft contract. **P1:** replace the body of `app/api/lookup/route.ts` and `lib/lookup/standIn.ts` with your lookup; the home page and stake picker won't need changes.
- **Checked:** `npm test`, lint and typecheck pass. In the browser, typing "16915 Apple River" shows the right street, Enter goes to `/stake`, and the lookup returns the Cy-Fair bodies.
- **Open issues / next:**
  - Without `BODIES_TOKEN_SECRET`, the lookup returns an `unsigned-preview` token (never in production).
  - Photon is a free public service with no SLA. If it's down, the dropdown stays empty and typing still works.

### 2026-10-19: Wider page layout on large screens
- **Who:** sohankamsala · P3 Weekly News and Alerts
- **Branch:** main (local commit; not pushed)
- **What changed:** On a 1920px screen the site sat in a narrow 1024px column with wide empty margins.
  - The header, footer, home page and every P3 page now use `max-w-7xl` (1280px) with `md:px-8`, and 1440px at `2xl` (≥1536px).
  - At `xl`, the home headline and lede are larger so the hero fills the wider column.
  - Reading pages (`/items/[id]`, `/timeline`, `/alerts/why`) keep a `max-w-3xl` text column, aligned to the same left edge as the header instead of centered, so the tabs line up with the logo.
  - Headlines are smaller below 640px, so a story isn't eight lines of title on a 320px phone.
  - `/alerts` overflowed at 320px because of an unbreakable link in the sample texts; it now wraps.
- **Files:** `components/shell/SiteHeader.tsx`, `components/shell/SiteFooter.tsx`, `app/(public)/page.tsx` (P5's), and P3's pages under `app/(public)/` (`weekly`, `timeline`, `items/[id]`, `alerts`, `alerts/why`), plus `components/weekly/Coverage.tsx`
- **Contract changes:** None. **PlaidMod:** these are your shell and home files; change them back if you'd rather.
- **Checked:** A Playwright sweep of 9 pages at 9 widths (320, 375, 414, 768, 1024, 1280, 1440, 1920 and 2560) found no horizontal scroll and no content past the viewport edge. Screenshots at 320, 768, 1024, 1920 and 2560 were reviewed. `npm test`, lint and typecheck pass.
- **Open issues / next:** None.

### 2026-10-19: P3 pages, APIs, alerts and news coverage perspectives
- **Who:** sohankamsala · P3 Weekly News and Alerts
- **Branch:** main (local commits; not pushed)
- **What changed:** Finished P3's user-facing side on top of the core logic:
  - **Pages:** `/weekly` (bento brief; the teammate picked this layout), `/items/[id]`, `/timeline`, `/alerts` (opt-in, published rules, text preview) and `/alerts/why`
  - **API routes:** `/api/weekly`, `/api/items/[id]`, `/api/alerts/subscribe` and `/verify`, `/api/reminders`, `/api/twilio/inbound`, `/api/cron/alerts` and `/api/cron/stories`
  - **Story job:** writes stories for items with `needs_story = true`
  - **Perspectives (§9a):** extract, code checks, judge, freeze, removal, the `item_perspectives` migration and the "What news coverage says" block
  - **Messages:** `News`, `Weekly`, `Timeline`, `Item`, `Alerts` and `Coverage` keys in `messages/en.json` and `es.json`
- **Sample data:** without the Supabase keys, the pages show labeled sample data (`lib/weekly/sample.ts`) run through the real `classify()` and template stories. Sample coverage uses placeholder outlets, never real ones.
- **Contract changes:**
  - **New migration:** `supabase/migrations/20261019230000_item_perspectives.sql` (P3 table). P5 applies it and regenerates `lib/database.types.ts`. Until then, perspectives code uses an untyped client.
  - **New cookie:** `showup_sub`, a signed `users.id` (HMAC with `BODIES_TOKEN_SECRET`), set after phone verification. **P4:** call `POST /api/reminders {item_id}`; it returns 401 `not_subscribed` without the cookie.
  - **ESLint:** `lib/rules`, `lib/stories` and `lib/sms` can't import `lib/news` or `lib/perspectives` (perspectives spec §8).
  - **Cron:** `/api/cron/alerts` now runs the story job and the perspectives job before alerts. `vercel.json` is unchanged.
- **Checked:**
  - `npm test` 611/611, `npm run lint` and typecheck pass.
  - In the browser, at 1366px and 390px (no horizontal scroll), all five pages render in English and Spanish with no console errors or missing message keys.
  - Alerts sign-up errors and the preview state were tested in the browser.
  - No live Supabase, Gemini or Twilio calls were made, because there are no keys on this machine.
- **Open issues / next:**
  - **P5:** apply the `item_perspectives` migration.
  - **P5:** the cron needs `SITE_URL` set so text links and the Twilio signature URL are right.
  - **P5:** `GEMINI_JUDGE_MODEL=gemini-3.5-flash-lite` (already on Vercel) is P3's choice: a different model from the 3.8 Flash extractor, as the spec asks, and Pro isn't usable on Vertex.
  - **P4:** `registration_closes_at` is null for real items until P4's registration resolver exists. The weekly page, texts and 7a/7b reminders read it from `lib/weekly/data.ts` and the `windows` argument of `runAlertsJob`.
  - **P2:** the perspectives job reads `news_article_items` and `news_articles` (spec §5). Until those tables are migrated, it logs a warning and the weekly page shows "No news coverage found."
  - **P1:** pages need `?t=<bodies_token>` from the results page. There's no `/api/lookup` yet, which is why the home address box currently says "We couldn't find that address" for every address.
  - **Twilio:** still not registered (needs an adult account owner). Without keys, sign-up shows a labeled preview and nothing is sent or saved.
  - **Spec deviation:** bento tiles are whole-card links, so they show only "N news outlets"; the full coverage disclosure appears on the rest of "Coming up," on "Decided," and on item pages.
  - **Stress test:** still deferred for sohankamsala.

### 2026-10-19: P3 core logic: rule engine, stories, SMS, weekly builder
- **Who:** sohankamsala · P3 Weekly News and Alerts
- **Branch:** main (uncommitted)
- **What changed:** Built P3's server logic as tested library code in P5's root app (tech plan §2). Covered:
  - `classify()` with all six rules (§8)
  - story writing with code fact-check and template fallback, using P5's `lib/gemini.ts` (§9)
  - SMS logic: consent, quiet hours, message format with the late-added wording, reminders 7a/7b, protest reminder, send dedupe, Twilio REST client, STOP/HELP keywords and webhook signature check (§11)
  - the weekly page and timeline section builder (§10)
  - Twilio registration paperwork, ready to paste
- **Files:** `lib/rules/`, `lib/stories/`, `lib/sms/`, `lib/weekly/`, `tests/{rules,stories,sms,weekly}/`, `.plans/p3-twilio-registration.md`
- **Contract changes:**
  - **`classify` is the real `Classifier` for ingest:** P2 can swap `classifyStub` for `classify` from `lib/rules/classify.ts`. A test checks it's assignable to `Classifier` and accepts P2's `Item`. An optional 4th argument, `{date, previous_date}`, drives `meeting_moved`. It reads `no_new_revenue_rate` from the untyped `taxRates`.
  - Personnel and closed-session items always return `tier: 'timeline'` and `item_type: 'personnel'`, never `sms` (scraper spec §5.3).
  - **The story job must write stories for every `needs_story` item, whatever its tier,** so personnel items still get one (D9).
  - Uses the shared `BodyType` (`lib/contracts/bodyTypes.ts`) and `Stake` (`lib/stakes.ts`) for lead-story ordering.
- **Checked:** `npm test` passes (46 files, 586 tests, including 83 new P3 tests). `npm run typecheck` is clean, and `eslint` is clean on the P3 folders. No live Gemini or Twilio calls were made; both are tested with fakes.
- **Open issues / next:**
  - **Next for P3:** wire these into routes and screens:
    - routes: `api/weekly`, `api/items`, `api/alerts/subscribe` and `verify`, `api/reminders`, `api/twilio/inbound`, `api/cron/alerts`
    - the story job that writes stories for `needs_story` items
    - pages: `/weekly`, `/timeline`, `/items/[id]` and `/alerts` (opt-in, rules, why-this-text)
    - en/es message keys for all of the above
  - **P2:** ingest can import `classify` now. Pass the meeting's `{date, previous_date}` as the 4th argument so `meeting_moved` works.
  - **P5 / schema:** the HCAD protest reminder has no item, so it's queued with `item_id = null`. Because `alerts_sent` treats nulls as equal, a user gets at most one protest reminder ever, not one per year. That's fine for the hackathon; a `year` column would fix it later.
  - **P5:** reminder 7b needs the alerts job to run more than once a day. Vercel Hobby cron is daily, so trigger `/api/cron/alerts` from the GitHub Actions schedule too.
  - **Twilio registration not submitted.** It needs an adult account owner plus the SMS wording in `.plans/p3-twilio-registration.md` §4 on P5's live privacy and terms pages. If it isn't approved by Thursday, fall back to a labeled "preview" of texts.
  - **Stress test:** deferred for sohankamsala, who asked to start P3 work first. Run it at the next session.

### 2026-10-19: Trimmed crowding on the prototype's Districts and Vote screens
- **Who:** sohankamsala · prototype owner (part not yet confirmed)
- **Branch:** main (uncommitted)
- **What changed:** In the `web/` prototype, removed the description column from the Districts list and folded Vote's two info cards ("Bring a photo ID", "Register at school") into one line. This finishes the declutter pass whose home and timeline trims are already in `main`.
- **Files:** `web/src/app/app/districts/page.tsx`, `web/src/app/app/vote/page.tsx`
- **Contract changes:** None
- **Checked:** `npm run lint` and `npx tsc --noEmit` pass. Checked both screens at 1440px in a local browser; 390px not checked.
- **Open issues / next:**
  - **Attribution leak:** commit `cfa43fe` ("Add ShowUp HTX web app prototype and design system") is on `origin/main` with a `Co-Authored-By` AI trailer. It was made before `INSTRUCTIONS.md` existed. Fixing it means rewriting published history, so it needs a team decision.
  - On Vote, the eligibility timeline's "Today" and "Can register" labels overlap when registration opens the next day.
  - The plan stress test hasn't been run for sohankamsala yet.

### 2026-10-19: Admin accounts, and a script for admins to set their own password
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - **The team's five emails** are now in `ADMIN_EMAILS`, in the owner's `.env.local` and on Vercel.
  - **Each has a confirmed Supabase account** with a temporary shared password, set by the owner. Ask PlaidMod for it; it isn't written anywhere in the repo.
  - **Each admin can change their password** with `npm run admin -- set-password <email>`. The password is typed twice and never shown, and must be 12–72 characters.
  - **No email step:** Supabase's built-in email can't send setup links to people outside the Supabase organization, so the script uses the secret key from `.env.local` instead.
  - **`npm run admin -- create-all`** creates any missing accounts after someone is added to `ADMIN_EMAILS`.
- **Files:** `lib/adminAccounts.ts`, `scripts/admin-account.ts`, `tests/platform/adminAccounts.test.ts`, `package.json` (`admin` script), `CLAUDE.md`, `.env.example`
- **Contract changes:** None
- **Checked:**
  - `npm test` 503/503, typecheck and lint pass.
  - Against the real project, a throwaway account was created, given a password, signed in, rejected a wrong password, then deleted.
  - `set-password` refuses an email not on the list, and refuses to run where the password would show on screen.
- **Open issues / next:**
  - **Everyone changes the shared password** with `set-password` before the repo goes public. The login page is public, and admin emails show up in commit history.
  - The owner turns off public sign-ups in Supabase (**Authentication → Sign In / Providers**).
  - **P3 chooses `GEMINI_JUDGE_MODEL`.** Vercel has `gemini-3.5-flash-lite`, which works on Vertex; ask P5 to change it.

### 2026-10-19: Supabase secret key and Gemini settings added to Vercel
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main (no code changes)
- **What changed:** Vercel Production and Preview now have:
  - `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` (a Vertex AI key), both Sensitive, so their values can't be read back from Vercel
  - `GOOGLE_GENAI_USE_VERTEXAI=true`, `GEMINI_EXTRACT_MODEL=gemini-3.8-flash` and `GEMINI_JUDGE_MODEL=gemini-3.5-flash-lite`

  The owner's `.env.local` has the same values.
- **Files:** this log only
- **Contract changes:** None
- **Checked:**
  - The Supabase key returned HTTP 200 from the REST API.
  - `npx tsx scripts/gemini-smoke.ts` returned `{ ok: true }` on Vertex AI for `gemini-3.8-flash` and `gemini-3.5-flash-lite`.
  - **`gemini-pro-latest` returns 404 NOT_FOUND on Vertex,** so P2's default fallback model fails there.
  - `vercel env ls` lists all five variables for both environments.
- **Open issues / next:**
  - **P2:** set `GEMINI_EXTRACT_FALLBACK_MODEL` to a Pro model ID that Vertex lists, check it with `npx tsx scripts/gemini-smoke.ts --model <id>`, then ask P5 to add it to Vercel.
  - No live page uses the database or Gemini yet, so nothing was redeployed. The next deploy picks these up.
  - Teammates who need the keys locally get them from P5 privately. Because they're Sensitive, `vercel env pull` leaves them out.

### 2026-10-19: P2's scraper merged into `main` and moved into the root app
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main (merged `scrapper` at `c6a6990`)
- **What changed:**
  - **The merge** keeps both sides of this log and the branch's newer revision 5 of both plan files. The one line kept from `main` is the body-page "In the news" bullet.
  - **The code moved, unchanged,** from `scraper P2/` into the layout in scraper spec §6: `lib/adapters/`, `lib/ingest/`, `lib/news/`, `data/`, `scripts/`, `tests/unit/`, `tests/golden/` and `vitest.live.config.ts`.
  - **P2's dependencies and scripts** (`test:live`, `scrape`, `news`) are now in the root `package.json`, and the lockfile was regenerated. The root keeps ESLint 9 and TypeScript 5.9, which Next 16.4.2 needs; the branch used 10 and 6.
  - **Root configs:** ESLint now uses P2's full news-isolation patterns and P2's `^_` unused-variable rule. Vitest excludes `tests/live/`. `GEMINI_JUDGE_MODEL` is added to `.env.example` and `lib/env.ts`.
- **Two fixes to P2's files:**
  - **`tests/unit/news-article.test.ts`:** the fake-timer Crawl-delay test now calls `resetHostSpacing()` first. Leftover real-clock spacing made it pass only when run before Oct 19 12:00 UTC.
  - **`lib/adapters/gemini.ts`:** the `*FromEnv` functions now take a plain string map, because Next's `ProcessEnv` type requires `NODE_ENV`. This is a type change only.
- **Files:** P2's folders above, `package.json`, `package-lock.json`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `lib/env.ts`, `CLAUDE.md`
- **Contract changes (P2):**
  - Work on `main` from the repo root from now on. The scripts read the root `.env.local`.
  - Phase 2 can import `@/lib/db`. P1's `bodies` seed is the only Phase 2 prerequisite still missing.
  - The v1.3 tables (`news_articles`, `news_article_items`, the 11c and `health()` state) still need migrations: P2 writes them, P5 applies them.
- **Checked:** `npm test` 492/492 (P5's 128, P2's 364; UTC, network blocked), typecheck, lint (0 warnings) and build. `npm run scrape -- --source no_such_source` loads `data/sources.yaml` and makes no network calls.
- **Open issues / next:**
  - No live runs yet (no Gemini key).
  - `gemini-pro-latest` won't work on Vertex (see the Vertex entry below).

### 2026-10-19: Gemini can run on Vertex AI; `.env.local` laid out for every key
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - **Vertex AI needs no change to either Gemini client.**
    - `lib/gemini.ts` and P2's `lib/adapters/gemini.ts` both call `new GoogleGenAI({ apiKey })`.
    - With `GOOGLE_GENAI_USE_VERTEXAI=true`, `@google/genai` 2.30.0 sends the same call to Vertex AI (`aiplatform.googleapis.com`), using the key. Without it, the call goes to the Gemini API.
  - **`.env.example`:** adds `GOOGLE_GENAI_USE_VERTEXAI=true`, plus where to get the Gemini, Supabase secret and Twilio keys.
  - **`scripts/gemini-smoke.ts`:** a new `--model <id>` option checks that a model ID works, and the output names the backend it used.
  - **The owner's `.env.local`** now follows the template. Every existing value is kept, and the blank lines are the keys still to fill in.
- **Files:** `.env.example`, `scripts/gemini-smoke.ts`
- **Contract changes (P2, P3, P4):**
  - **The team's Gemini key will be a Vertex AI key.** Wherever `GEMINI_API_KEY` is set, also set `GOOGLE_GENAI_USE_VERTEXAI=true`. That includes `scraper P2/.env.local`, because P2's scripts load that file. If the switch is missing, the Vertex key goes to the Gemini API and the call fails.
  - **P2: `gemini-pro-latest` is a Gemini API alias.**
    - Vertex's model list (Gemini Enterprise Agent Platform > Model versions) has no `-latest` aliases.
    - Its only long-lived Pro text model, `gemini-2.5-pro`, retires Oct 20, 2026.
    - Pick the extraction fallback (and P3's judge model) from that list, then check it with `npx tsx scripts/gemini-smoke.ts --model <id>`.
    - `gemini-3.8-flash` is GA on Vertex.
  - **FYI:** Google's 3.8 Flash guide says the backend ignores `temperature` for this model; determinism comes from `thinking_level` and the response schema. Both clients send `temperature: 0`, which is harmless.
- **Checked:**
  - `npm test` (128/128), typecheck and lint pass.
  - A probe with a fake `fetch` (no network) confirmed both endpoints: `generativelanguage.googleapis.com` when the switch is unset, and `aiplatform.googleapis.com` when it's `true`. Both send the key in the `x-goog-api-key` header.
  - Without a key, the smoke script stops with `MissingEnvError`.
  - No live call yet, because there's no key.
- **Open issues / next:**
  - The owner adds the Vertex key and runs the smoke test.
  - The owner shares the key privately with P2 for `scraper P2/.env.local`.
  - The Gemini key and the switch need adding to Vercel, after the owner approves.
  - **Free keys may lack 3.8 Flash:** Google's express-mode page (the free 90-day trial) doesn't list `gemini-3.8-flash`, so a key without billing may not reach it.

### 2026-10-19: P5 final review fixes (rate limits, demo cache, admin cookies, privacy page)
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** A fresh whole-branch review of P5 found no critical issues. These five are fixed:
  - **Rate limiter:**
    - `checkRateLimit` now throws `MissingEnvError` when a key is missing, instead of quietly allowing every call.
    - On a database error it still allows the call, and now logs a warning. The warning never includes the key.
  - **Demo cache:**
    - `lookupDemoKey` is now an HMAC keyed with `IP_HASH_SECRET`, so a cache key can't be matched against `hcad_parcels` addresses.
    - `DEMO_RECORD` is ignored on production deployments (`VERCEL_ENV=production`).
  - **Admin session cookies** are now `httpOnly`, `sameSite=lax`, and `Secure` in production (`lib/supabase/cookieOptions.ts`).
  - **Privacy page:** it now says the address goes to the U.S. Census Bureau's address lookup, and lists the Census Bureau among the services that process data.
  - **`lib/database.types.ts`:** I regenerated it from the database. It matches the committed file exactly, so it needed no change.
- **Files:** `lib/rateLimit.ts`, `lib/demo.ts`, `lib/env.ts` (`VERCEL_ENV`), `lib/supabase/{cookieOptions,server}.ts`, `proxy.ts`, `messages/*.json`, `.env.example`, `tests/platform/{rateLimit,demo,authCookies,messages}.test.ts`
- **Contract changes:**
  - **P1, `lookupDemoKey(address, secret?)`:**
    - Pass your own normalized address. Otherwise "Dr" and "Drive" give different keys, and demo mode misses the cache.
    - Cache only the final lookup response (body IDs and sections), never raw Census or HCAD output.
  - **P1 and P4:** `checkRateLimit` now throws when `SUPABASE_SERVICE_ROLE_KEY` is missing. That key must be on Vercel before your routes ship.
  - **P1:** `/results` must live under `app/(public)/`, because `useLookup()` throws outside that folder. It must also handle the `error` state, not just `idle`: if a lookup fails while someone presses Continue, they can still land on `/results`.
  - **P2:** call `await requireAdmin()` outside any `try/catch`. Its redirect and its 404 work by throwing.
- **Checked:**
  - `npm test` (128/128), typecheck, lint and build pass. Each new test failed before its fix.
  - None of the secrets appear in `.next/static`.
  - The server role can run `increment_rate_limit`: `has_function_privilege` returns true.
- **Open issues / next:**
  - **The new cookie flags can't be checked in a browser yet:** nobody can sign in until the admin accounts exist.
  - **Deferred small items:**
    - `readBrowserId` can throw on a malformed cookie.
    - Old rate-limit rows are cleaned up only on about 1 call in 100.
    - IPv6 addresses aren't grouped by /64.
    - The migration test misses some patterns.
    - The time-zone wiring has no test.
    - **`scripts/quiz-report.ts` reads at most 1,000 rows** and filters them in JavaScript. Fix this before using its numbers in the pitch.
    - The lookup `fetch` has no timeout.
    - The admin sign-in has no rate limit.
    - The `rate_limited` copy is wrong, and the news fonts are preloaded on every page.

### 2026-10-19: P5 Task 17: classmate quiz report
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** `lib/quizReport.ts` turns `quiz_responses` into the plan's evidence lines, for example "14 of 18 (78%) didn't know they had a MUD." `scripts/quiz-report.ts --since <ISO> --until <ISO>` prints them along with "Results from N people who used our app." The time window leaves out the team's own test runs.
- **Files:** `lib/quizReport.ts`, `scripts/quiz-report.ts`, `tests/platform/quizReport.test.ts`
- **Contract changes:** None. The report reads P1's `quiz_responses` (`selected_types`, `actual_types`, `created_at`) and prints type keys until P1's display names exist.
- **Checked:** `npm test` (121/121, including the plan's 14-of-18 example, rounding, and the window edges), typecheck and lint pass. Running the script needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- **Open issues / next:** All 17 P5 tasks are coded. Next comes a whole-branch review, then the owner's dashboard steps (the secret key, admin accounts, turning off sign-ups) and the non-code checklist in `.plans/p5-platform-plan.md`.

### 2026-10-19: P5 Task 16: admin sign-in for the review queue
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - `/admin/login` has an email-and-password form. It uses passwords, not email links, because Supabase's built-in email reaches only team members, 2 an hour.
  - `/admin` shows "Signed in as …", a link to `/admin/review` (P2's page) and a sign-out button.
  - `proxy.ts` (Next 16's request hook) refreshes the session on `/admin/*` only. It never touches `/api`, so cron calls can't be redirected.
  - `requireAdmin()` checks the signed-in user with Supabase Auth and the `ADMIN_EMAILS` allowlist. Signed out goes to the login page; not on the list gets a 404.
- **Files:** `proxy.ts`, `lib/supabase/server.ts`, `lib/adminAuth.ts`, `app/admin/{page.tsx,actions.ts,login/page.tsx}`, `components/admin/LoginForm.tsx`, `messages/*.json` (`Admin`), `tests/platform/adminAuth.test.ts`
- **Contract changes (P2):**
  - **Call `await requireAdmin()` first in `/admin/review` and in every one of its server actions and route handlers.** A layout check alone isn't enough.
  - After that, read and write with `db()`. The signed-in user's own Supabase client still sees nothing, because of RLS.
- **Checked:**
  - `npm test` (114/114), typecheck, lint and build pass (the build lists "Proxy").
  - Signed out, `/admin` returns 307 to `/admin/login`.
  - `/api/cron/ingest` with the secret returns 404 (no route yet), not a redirect.
  - A wrong email or password shows the inline error, using the real Supabase sign-in.
  - Login pages send `Cache-Control: private, no-store`.
- **Open issues / next:**
  - **Owner, in the Supabase dashboard:** turn off public sign-ups and create a password account for each `ADMIN_EMAILS` address. After that, a successful sign-in still needs testing.
  - Add the fifth teammate's email to `ADMIN_EMAILS` when known.

### 2026-10-19: P5 Task 15: demo mode caching
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** `lib/demo.ts` has `demoCached(key, compute)`.
  - **With `DEMO_MODE=true`,** it returns the cached answer from `demo_cache` and never calls the outside service. A missing answer throws `DemoCacheMissError`, naming the key, so gaps show up in the dry run instead of silently using the network.
  - **With `DEMO_RECORD=true`,** live answers are saved as you click through the demo once.
  - `lookupDemoKey(address)` is a hash, so not even the demo addresses are stored.
- **Files:** `lib/demo.ts`, `tests/platform/demo.test.ts`
- **Contract changes (how to use it):**
  - **P1 (`/api/lookup`):** wrap the Census/HCAD work in `demoCached(lookupDemoKey(address), () => resolveLive(address))`, and skip writing `quiz_responses` when `isDemoMode()`.
  - **P4 (coach, Step A):** wrap the Gemini explain call in `demoCached(\`explain:${itemId}:${lang}\`, …)`.
  - **Meaning of demo mode:** "no Census, Gemini or Twilio calls." The database stays reachable, so §20's "network off" can't fully hold. **Production keeps `DEMO_MODE=false`,** because judges may open the live site. Record the video locally or on a preview deploy with `DEMO_MODE=true`.
- **Checked:** `npm test` (110/110), typecheck and lint pass.
- **Open issues / next:** Task 16 (admin sign-in) is next.

### 2026-10-19: P5 Task 14: stake picker
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** `/stake` asks "Which of these describe you?"
  - **Cards:** four toggle cards (Student, Parent, Renter, Homeowner; pick any, `aria-pressed`), the note "First-time voters: pick Student." and a language choice.
  - **Continue** saves the choice in the `showup_stakes` cookie, then goes to `/results` while a lookup is running or done, or home when there's no lookup (a reload or a direct visit). **Skip** goes the same way without saving.
  - **Status:** while loading, the page says "Finding your governments…". A failed lookup shows the error with "Try another address."
- **Files:** `lib/stakes.ts`, `app/actions/stakes.ts`, `components/stake/StakePicker.tsx`, `app/(public)/stake/page.tsx`, `messages/*.json` (`Stake`), `tests/platform/stakes.test.ts`
- **Contract changes (P1, P3, P4):**
  - Read stakes with `parseStakes(cookieValue)` from `@/lib/stakes`. On the server, use `parseStakes((await cookies()).get(STAKES_COOKIE)?.value)`. It returns `Stake[]` (`'student' | 'parent' | 'renter' | 'homeowner'`) in display order.
  - In the browser the cookie shows URL-encoded (`student%2Crenter`). `parseStakes` handles both forms.
  - No stakes means the visitor skipped, so use defaults.
- **Checked:**
  - `npm test` (104/104), typecheck, lint and build pass.
  - In a browser at 390px:
    - a direct visit works and Continue goes home
    - Space and Enter toggle the cards
    - Continue saves the cookie
    - home → address → `/stake` keeps the lookup state and shows the error (expected until P1's route exists)
    - saved stakes come back on return
    - switching to Español keeps the selections
    - nothing scrolls sideways
- **Open issues / next:** Task 15 (demo mode) is next.

### 2026-10-19: P5 Task 13: home page and the address lookup flow
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - **Home (`/`):** the headline "Who governs your block?", the address form, a privacy note, and a stack of government "layers" that settles in on load (turned off under reduced motion). The page is in English and Spanish.
  - **Submitting:** the form checks the address on submit (empty or over 200 characters shows an inline error, cleared on edit). It then starts the lookup and goes to `/stake`.
  - **`LookupProvider`** (in `app/(public)/layout.tsx`) keeps the lookup running across home → stake picker → results. The address stays in memory only: never in storage, a cookie or the URL. The form also posts rather than using GET, so a submit before the JavaScript loads can't put the address in a URL.
- **Files:** `lib/contracts/lookup.ts`, `lib/address.ts`, `lib/flow/lookupState.ts`, `components/flow/LookupProvider.tsx`, `components/home/{AddressForm,GovernmentStack}.tsx`, `app/(public)/page.tsx`, `app/(public)/layout.tsx`, `messages/*.json` (`Home`, `Lookup`)
- **Contract changes (draft for P1's sign-off):** `lib/contracts/lookup.ts`.
  - **Request:** `POST /api/lookup` with `{ address }`.
  - **Success:** `{ bodies_token, bodies, ballot, not_government, regional, hoa }`.
  - **Errors:** `{ error: { code, message } }` with codes `invalid_address` 400, `not_found` 404, `outside_harris` 422, `rate_limited` 429, `server_error` 500. The messages for each code are in `messages/*.json` → `Lookup.errors`.
  - **P1's `/results`:** use `useLookup()` from `@/components/flow/LookupProvider`. It returns `state` (`idle | loading | done | error`), `start` and `reset`. While it's loading, show the "Who governs you?" question. If someone opens `/results` directly with `idle`, send them home.
- **Checked:**
  - `npm test` (94/94: address normalizing and limits; the reducer ignores stale answers from a double submit and answers after a reset), typecheck, lint and build pass.
  - In a browser at 1440px and 390px:
    - no sideways scrolling
    - an empty submit shows "Enter your street address, city and ZIP." with `aria-invalid`, and typing clears it
    - a real address sends `POST /api/lookup` and goes to `/stake`, with no address in any URL (both 404 for now: P1's route and P5 Task 14)
- **Open issues / next:** Task 14 (the stake picker) is next.

### 2026-10-19: P5 Task 12: rate limiting and the browser ID
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** `lib/rateLimit.ts` and a new database function, `increment_rate_limit` (security invoker, fixed `search_path`, execute revoked from public, anon and authenticated).
  - **`checkRateLimit(key, rule)`** counts one call in a fixed window. It returns `{ allowed, remaining, resetAt }`. If the database can't be reached, it returns `allowed: true, degraded: true` so the demo keeps working.
  - **Presets:** `RATE_LIMITS.lookupPerIp` (120 an hour, so a whole class can share a school IP), `coachPerBrowser` and `coachPerIp` (20 an hour, per §14).
  - **IPs:** `hashIp(ip)` scrambles an IP with `IP_HASH_SECRET` plus the Chicago date, so raw IPs are never stored. `clientIp(req)` reads the visitor's IP.
  - **Browser ID:** `BROWSER_ID_COOKIE = 'showup_bid'`. `readBrowserId(req)` returns null unless the cookie is a UUID; `newBrowserId()` makes one.
  - About 1 call in 100 also deletes windows older than two days, matching the privacy page.
- **Files:** `supabase/migrations/20261019112411_rate_limit_fn.sql`, `lib/rateLimit.ts`, `lib/database.types.ts` (function type), `tests/platform/rateLimit.test.ts`, `tests/platform/migrations.test.ts`
- **Contract changes:**
  - **P1 (`/api/lookup`):** `checkRateLimit(\`lookup:ip:${hashIp(clientIp(req))}\`, RATE_LIMITS.lookupPerIp)`. Return 429 `rate_limited` when it's not allowed.
  - **P4 (`/api/coach`):** check both `coach:browser:<id>` and `coach:ip:<hash>`. Set the `showup_bid` cookie (httpOnly, `sameSite=lax`, 1 year) when `readBrowserId` returns null. Note that §14's 20 an hour **per IP** may block a class on shared Wi-Fi. Consider raising `coachPerIp`.
  - **Every new SQL function** must be `security invoker` and revoke execute from public, anon and authenticated. `npm test` checks this.
- **Checked:**
  - `npm test` (83/83; the new function check failed first on a version without the security lines), typecheck and lint pass.
  - In the database: calling the function twice returns 1 then 2; `anon` and `authenticated` can't run it; `get_advisors` shows only the expected notices. The test row was deleted.
- **Open issues / next:** Task 13 (home page and the lookup flow) is next.

### 2026-10-19: P5 Task 11: site shell and security headers
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** Every page under `app/(public)/` now gets the shell:
  - a "Skip to content" link, first in tab order
  - a header with the logo, an About link and the English/Español toggle
  - a footer with "We summarize. We never recommend." and links to About, Privacy and Terms

  The language toggle is a plain form that calls a server action (`switchLocale`), so it works even before the page's JavaScript loads. Next.js re-renders the page in the new language, and the visitor stays on the same page. Every route also sends the four security headers.
- **Files:** `app/(public)/layout.tsx`, `components/shell/{SiteHeader,SiteFooter,LanguageToggle}.tsx`, `app/actions/locale.ts`, `next.config.ts`, `components/civic.tsx` (the logo now reads as "ShowUp HTX"), `messages/*.json` (`Shell` namespace)
- **Contract changes:** None.
  - **For pages in `app/(public)/`:** use a single `<main id="main">` per page; the skip link targets it.
  - **For other screens** (stake picker, Speak up), you can drop in `<LanguageToggle />` from `@/components/shell/LanguageToggle`. It's a server component.
- **Checked:**
  - `npm test` (70/70), typecheck, lint and build pass.
  - `curl -sI` shows `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy`.
  - In a browser at 390px and 1440px:
    - nothing scrolls sideways (both languages)
    - the first Tab reaches "Skip to content", which floats over the page
    - Español switches the header, footer and page, and sets `<html lang="es">`; the choice survives a reload
    - clicking right after the page loads still works (the first version, a client-side button, ignored early clicks)
- **Open issues / next:** Task 12 (rate limiting) is next.

### 2026-10-19: P5 Task 10: design system brought into the app
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - **Brought over from `web/`:** the color tokens (`app/globals.css`), the fonts (Overpass, plus Playfair and Libre Franklin for news), all 25 shadcn components (`components/ui/`), `cn()`, the favicon and `DESIGN.md`. `DESIGN.md` now sits at the root, with a top note marking its prototype-only sections.
  - **Fixed along the way:**
    - corner sizes now match DESIGN.md (`rounded-2xl` is 16px, `rounded-xl` is 12px)
    - inputs are 44px pills with a denim focus ring
    - toasts no longer need next-themes
  - **New shared pieces** in `components/civic.tsx`: `Panel`, `SectionTitle`, `Chip`, `ArrowCircle`, `Logo`, `BodyIcon` and `TierPill`.
  - The palette dev tool stayed behind.
- **Files:** `app/globals.css`, `app/layout.tsx`, `app/favicon.ico`, `components/ui/*`, `components/civic.tsx`, `components.json`, `lib/utils.ts`, `lib/contrast.ts`, `lib/contracts/bodyTypes.ts`, `DESIGN.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `messages/*.json` (`Civic` namespace), tests
- **Contract changes:** **Draft for P1's sign-off:** `lib/contracts/bodyTypes.ts`. It lists the plan's 12 "Who governs you?" types as `QUIZ_BODY_TYPES`: `city_council`, `commissioners_court`, `school_board`, `college_board`, `mud`, `esd`, `water_authority`, `flood_control`, `port`, `metro`, `hcad`, `hoa`. `BodyType` is those plus `other`. `BodyIcon` and the quiz both use them. P1: if `bodies.type` should use different keys, change this file in one place.
- **Checked:**
  - `npm test` (70/70, including a contrast test that fails if a base color drops white-on-denim, white-on-brick or ink-on-white below 4.5:1), typecheck, lint and build all pass.
  - In a browser, on a temporary sample page that was then deleted:
    - pill buttons (40px), cards 24px, inputs 44px pills
    - `rounded-2xl` 16px and `rounded-xl` 12px
    - Overpass loaded, all 13 `BodyIcon` types rendered
    - `TierPill` shows "Urgent" for `sms` only, and the input shows a denim focus ring
- **Open issues / next:**
  - Task 11 (site shell) is next.
  - Earlier note: GitHub repo secret `CRON_SECRET` and variable `APP_URL` are now set, for P2's scheduler.

### 2026-10-19: P5 Task 9: cron request check and schedules
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - `lib/cron.ts` has `isAuthorizedCron(req)` and `unauthorizedCronResponse()` (a 401 with a JSON error). If `CRON_SECRET` is unset, every request is rejected, including `Bearer undefined`.
  - `vercel.json` schedules both daily jobs (Hobby runs each at most once a day):
    - `/api/cron/ingest` at 12:00 UTC, about 6–8 AM Central. That stays clear of BoardBook's midnight–5 AM maintenance window.
    - `/api/cron/alerts` at 16:00 UTC, about 10 AM–noon Central, inside the 8 AM–8 PM quiet-hours window on both sides of Nov 1.
- **Files:** `lib/cron.ts`, `vercel.json`, `tests/platform/cron.test.ts`
- **Contract changes (P2 and P3, please read):**
  - Cron routes **export both `GET` and `POST`**. The first line of each is `if (!isAuthorizedCron(req)) return unauthorizedCronResponse()`.
  - Callers send `Authorization: Bearer <CRON_SECRET>`. Vercel cron does this itself.
  - **P2's GitHub Actions** command is `curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/ingest"`, with `CRON_SECRET` as a repo secret and `APP_URL` as a repo variable.
  - Runs can be missed or fire twice, so make the jobs safe to repeat.
  - **Don't add a second `vercel.json`;** edit this one.
- **Checked:** `npm test` (64/64), typecheck and lint pass.
- **Open issues / next:** The GitHub `CRON_SECRET` secret and `APP_URL` variable are waiting on the owner's OK.

### 2026-10-19: P5 Task 8: signed `bodies_token` for results links
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** `lib/tokens.ts` has two functions:
  - `signBodiesToken(ids)` signs a list of body IDs.
  - `verifyBodiesToken(token)` returns the IDs, or **null** if the token is missing, cut off, edited, signed with another secret, or in an unknown version.
- **Files:** `lib/tokens.ts`, `tests/platform/tokens.test.ts`
- **Contract changes (shared, §3):**
  - **Format:** `<payload>.<signature>`. The payload is base64url JSON `{"v":1,"b":[sorted unique ids]}`, and the signature is base64url HMAC-SHA256 with `BODIES_TOKEN_SECRET`.
  - **Body IDs:** 1 to 64 IDs, each matching `^[a-z0-9][a-z0-9_-]{0,63}# Agent handoff log

A shared log of changes made in this repo, so the next teammate or agent can catch up without reading every diff. Entries follow `INSTRUCTIONS.md`: record the teammate, never the agent or model.

## Rules for agents

1. **At the start of a session,** read the newest 3–5 entries below, plus any entry that touches the files you're about to change.
2. **After you add, edit or delete anything in the repo,** add one entry before you finish the task or commit. One entry per task, not per file.
3. **Put new entries at the top,** directly under "Entries." Never edit or delete someone else's entry. If an older entry is now wrong, say so in your new entry.
4. **Keep it short.** Aim for under 15 lines, and write for a teammate who hasn't seen the code.
5. **Flag shared-contract changes** in the "Contract changes" line. Other parts are built against these, so a silent change breaks them:
   - DB schema (Technical_Implementation_Plan.md §16)
   - `Meeting` and `Item` types (§6)
   - `bodies_token` format (§3)
   - the `classify()` signature (§8)
   - types in `lib/prototype/types.ts` (the `/app` screens' data shapes; moved from `web/src/lib/data/types.ts`)
6. **On a merge conflict in this file,** keep both entries, newest first.

## Entry template

```markdown
### YYYY-MM-DD: <short title>
- **Who:** <teammate> · <part, e.g. P3 News and Alerts>
- **Branch:** <branch>
- **What changed:** <1–3 sentences on what and why>
- **Files:** <main files or folders touched>
- **Contract changes:** None | <what changed and who it affects>
- **Checked:** <e.g. npm run lint, npx tsc --noEmit, manual check at 390px; or "not run" and why>
- **Open issues / next:** <anything unfinished, broken, or for the next person>
```

---

## Entries

.
  - The same set always gives the same token, so P3 can cache the weekly page by token.
  - **P1** signs the token in `/api/lookup`. **P3** verifies it on `/weekly?t=`. When `verifyBodiesToken` returns null, show "enter your address again" instead of an error.
- **Checked:** `npm test -- tokens` (13/13), typecheck and lint pass.
- **Open issues / next:** Task 9 (the cron check and `vercel.json`) is next.

### 2026-10-19: P5 Task 7: shared Gemini client
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** `lib/gemini.ts` is the one Gemini client for P2, P3 and P4.
  - `generateJson({ schema, contents, system?, model?, temperature?, timeoutMs? })` asks for structured JSON and returns it after validating it against your zod schema. Gemini receives the schema with `$schema` removed, temperature defaults to 0 and the timeout to 120 s.
  - **Errors:** a timeout throws `GeminiTimeoutError` (Google still bills a call cancelled on our side). Output that isn't JSON, or doesn't match the schema, throws `GeminiOutputError` with `issues` and `raw`.
  - **Models:** `geminiModel('default' | 'extract' | 'extract_fallback')` reads `GEMINI_MODEL` (default `gemini-3.8-flash`) and `GEMINI_EXTRACT_MODEL` (falls back to the default). `GEMINI_EXTRACT_FALLBACK_MODEL` has no default, so leaving it unset throws.
  - **PDFs:** `pdfPart(bytes)` builds inline PDF data and throws `PdfTooLargeError` at 20 MiB or more.
  - **Testing:** `createGemini(fakeClient)` lets you test without the network.
- **Files:** `lib/gemini.ts`, `scripts/gemini-smoke.ts`, `tests/platform/gemini.test.ts`
- **Contract changes:** None. **P2:** per spec §6 this file exists, so use it instead of writing `lib/adapters/gemini.ts`. Pass `model: geminiModel('extract')`, and retry with `geminiModel('extract_fallback')` per D17.
- **Checked:** `npm test` (43/43), typecheck and lint pass. The live smoke test (`npx tsx scripts/gemini-smoke.ts`) is waiting on the paid `GEMINI_API_KEY`.
- **Open issues / next:** Once the adult account owner has the paid key, add it to `.env.local` and Vercel and run the smoke test.

### 2026-10-19: P5 Task 6: deployed to Vercel
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - **Live site: https://showup-htx-six.vercel.app.** Vercel project `showup-htx` on the `majority-illusion` team. A new "NeighborhoodHacks" team needed a payment method, so the owner chose the existing free team.
  - It's connected to the GitHub repo, so pushes to `main` deploy. Because the repo is private, deploys of teammates' commits wait for the owner's approval in Vercel.
  - Env vars are set for production and preview: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SITE_URL`, `BODIES_TOKEN_SECRET`, `CRON_SECRET`, `IP_HASH_SECRET`, `ADMIN_EMAILS` and `DEMO_MODE=false`.
  - Updated the README and `CLAUDE.md`.
- **Files:** `README.md`, `CLAUDE.md`, `.gitignore`
- **Contract changes:** None.
- **Checked:** `/`, `/about`, `/privacy` and `/terms` return 200 on production, and `/privacy` comes back in Spanish for `es-US`.
- **Open issues / next:**
  - **P3:** for Twilio registration, privacy is https://showup-htx-six.vercel.app/privacy and terms is https://showup-htx-six.vercel.app/terms. The contact link on them 404s while the repo is private.
  - **Still missing on Vercel:** `SUPABASE_SERVICE_ROLE_KEY` (the owner pastes it from the Supabase dashboard), the Gemini variables (once the paid key exists) and Twilio's (P3).
  - `ADMIN_EMAILS` has four of the five teammates; the fifth teammate's email is still needed.

### 2026-10-19: P5 Task 5: about, privacy and terms pages (English and Spanish)
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** Added `/about`, `/privacy` and `/terms` in both languages. The privacy page covers everything the plan and Twilio need:
  - your address isn't saved
  - the cookies (`NEXT_LOCALE`, `showup_stakes`, `showup_bid`) and the hashed IPs
  - anonymous quiz answers
  - drafts sent to Google's Gemini API
  - the text program ("ShowUp HTX alerts," message frequency, "Msg & data rates may apply," STOP and HELP, parent consent under 18)
  - "we do not share your mobile number … for marketing"
  - the services that handle data (Supabase, Vercel, Google, Twilio)
  - news headline links

  Styling is plain for now; the design tokens arrive in P5 Task 10.
- **Files:** `app/(public)/{about,privacy,terms}/page.tsx`, `components/legal/LegalDocument.tsx`, `lib/brand.ts` (`APP_NAME`, `CONTACT_URL`), `messages/en.json`, `messages/es.json`
- **Contract changes:** None.
- **Checked:**
  - `npm test` (32/32, including en/es message parity), typecheck, lint and build pass.
  - On a production server, all three pages return 200 and switch to Spanish for `es-MX`.
  - In a browser at 390px, none of the six page/language combinations scrolls sideways.
- **Open issues / next:**
  - **The contact link (GitHub Issues) returns 404 for anyone logged out, because the repo is private.** Twilio's reviewers will hit that. P3: if Twilio asks for a working contact, we need a team email or a public repo before you submit.
  - The Spanish name for "Speak up" is "Habla" on these pages. P4, rename it if you choose another.
  - There's no favicon yet (it shows as a console 404); it comes with Task 10.

### 2026-10-19: P5 Task 4: English/Spanish translations and Chicago time
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - next-intl is set up without a language in the URL. The language comes from the `NEXT_LOCALE` cookie, then the browser's `Accept-Language` header, then English (`pickLocale` in `lib/i18n.ts`).
  - Every page gets `timeZone: 'America/Chicago'`, and `<html lang>` follows the language.
  - `setLocale` (in `app/actions/locale.ts`) saves the choice.
- **Files:** `i18n/request.ts`, `lib/i18n.ts`, `app/actions/locale.ts`, `messages/en.json`, `messages/es.json`, `next.config.ts`, `app/layout.tsx`, `app/(public)/page.tsx`, `tests/platform/i18n.test.ts`, `tests/platform/messages.test.ts`
- **Contract changes:** None to the schema. **For every part:**
  - Put all screen text in both `messages/en.json` and `messages/es.json`, under your own top-level namespace (`Results`, `Weekly`, `SpeakUp`, `Alerts` and so on). Use `useTranslations('Ns')` in client components, or `await getTranslations('Ns')` on the server.
  - `npm test` fails if a key exists in only one file, if any message is empty, or if the `{placeholders}` differ between the two.
  - Format dates, times and money with next-intl (`useFormatter()` or `getFormatter()`). The Chicago time zone is already applied.
  - Pages are now rendered per request, because the language is read from the request.
- **Checked:**
  - `npm test` (32/32), typecheck, lint and `npm run build` pass.
  - On a live production server, `Accept-Language: es-US` gives `<html lang="es">` with the Spanish description, and `en-US` gives English. A `NEXT_LOCALE=es` cookie overrides an English header.
- **Open issues / next:** Task 5 (about, privacy and terms pages) is next.

### 2026-10-19: P5 Task 3: env access and the server database client
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - `lib/env.ts` reads environment variables through `getEnv(name)`, which throws a clear `MissingEnvError`. It also has `getOptionalEnv`, `isDemoMode`, `isDemoRecord`, `adminEmails` and `assertServer`.
  - `lib/db.ts` exports `db()`, the one shared Supabase client with the secret key. It throws if anything calls it in a browser.
  - `.env.example` lists every variable and which part uses it.
- **Files:** `lib/env.ts`, `lib/db.ts`, `.env.example`, `tests/platform/env.test.ts`, `tests/platform/db.test.ts`
- **Contract changes:** New env vars beyond §21 (plan files not edited):
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (admin sign-in)
  - `SITE_URL`
  - `GEMINI_MODEL`, `GEMINI_EXTRACT_MODEL` and `GEMINI_EXTRACT_FALLBACK_MODEL`
  - `IP_HASH_SECRET`, `DEMO_RECORD`
  - `SUPABASE_DB_URL` (local only)

  **Usage:** import `db` from `@/lib/db` in server code and scripts. It works under plain `tsx` too: load `.env.local` with dotenv first. Never import it into a client component. **P2:** your Phase 2 gate for `lib/db.ts` is met.
- **Checked:** `npm test` (17/17), `npm run typecheck` and `npm run lint` pass.
- **Open issues / next:** Ask P5 for the secret key and other values for your `.env.local`. They're never posted in the repo or chat.

### 2026-10-19: P5 Task 2: Supabase database is live (28 tables, RLS on everywhere)
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - Created Supabase project `showup-htx` (ID `elsvhqqwdxwsuvkbchdq`, us-east-1, free plan; URL `https://elsvhqqwdxwsuvkbchdq.supabase.co`).
  - Applied the full §16 schema plus P2's additions in six migrations. Every table has RLS on with **no policies**, so the public key reads and writes nothing; only server code with the secret key can.
  - Generated types are in `lib/database.types.ts`.
- **Files:** `supabase/migrations/*.sql`, `lib/database.types.ts`, `tests/platform/migrations.test.ts`
- **Contract changes (shared; please read):**
  - **Keys:** `bodies.id` and `sources.id` are text slugs (e.g. `hcmud_489`). **P1: confirm your body slugs.** Every other table has a uuid `id`. Body foreign keys use `on update cascade`.
  - **Value lists** use text plus a `check` constraint, not Postgres enums. Examples: `items.status`, `tier`, `vote_result`, `review_status`; `sources.adapter` (`legistar | boardbook | primegov | llm_extract | manual`).
  - **New `items.source_id`** (not in §16): P2's upsert key `(source_id, external_id)` needs it. `meetings` has the same unique key.
  - **`items.review_status` is nullable,** because Legistar, BoardBook and manual items skip review. Suggested rule for P2 and P3: an item may text only when `tier = 'sms'` and `coalesce(review_status, 'approved') = 'approved'`.
  - **`alert_queue.item_id` and `alerts_sent.item_id` are nullable,** for the HCAD protest reminder. `alerts_sent` is `unique nulls not distinct (user_id, item_id, rule)`, so a reminder with no item still can't be sent twice; tested.
  - **Geometry** is `extensions.geometry(MultiPolygon, 4326)` for `boundaries.geom` (use `ogr2ogr -nlt PROMOTE_TO_MULTI`), and `Point` for centroids. PostGIS and pg_trgm live in the `extensions` schema.
  - **Loading order:** `hcad_jurisdictions.account` references `hcad_parcels`, so load parcels first.
- **How to add a migration:** write a new file in `supabase/migrations/` and ask P5 to apply it. P5 applies it through the Supabase connection and renames the file to the version the database records. Never `create policy`; `npm test` checks every migration for RLS.
- **Checked:**
  - In the database: 28 tables, 0 without RLS, 0 policies, extensions in `extensions`.
  - With the publishable key: reading `bodies` or `users` returns `[]`, and inserts get 401 or an RLS error.
  - `get_advisors` (security) shows only the expected "RLS enabled, no policy" notices.
  - `npm test` (6/6), `npm run typecheck` and `npm run lint` pass.
- **Open issues / next:**
  - **P1:** the free plan holds 500 MB, and a full HCAD load (about 1.5 million accounts, times their tax codes) likely won't fit. Load only the ZIPs the demo and the classmate survey need. For bulk loads, use the session-pooler connection string (Supabase dashboard → Connect) as a local-only `SUPABASE_DB_URL`.
  - P5 Task 3 (`lib/env.ts`, `lib/db.ts`) is next.

### 2026-10-19: P5 Task 1: root Next.js app and shared tooling
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** The real app now lives at the repo root, on Next.js 16.4.2, with Tailwind through `@tailwindcss/postcss`, vitest, ESLint and strict TypeScript, using the `@/*` → `./*` alias. `.gitattributes` forces LF line endings, and the root `.gitignore` keeps out `.env*`, `.next`, `.vercel` and the like. P5's full plan is in `.plans/p5-platform-plan.md`.
- **Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.gitattributes`, `.gitignore`, `app/`, `tests/`, `CLAUDE.md` (Commands), `AGENTS.md` (Next's rules block), `.plans/p5-platform-plan.md`
- **Contract changes:** None to the schema or types. **For P2:** the root `package.json`, `tsconfig.json`, `eslint.config.mjs` and `vitest.config.ts` now exist.
  - Rebase `scrapper` onto `main` and add your dependencies and scripts (`test:live`, `scrape`, `news`) to these files rather than creating new ones.
  - `"type": "module"` is set. Your news-isolation `no-restricted-imports` rule is already in `eslint.config.mjs`.
  - `npm test` blocks `fetch`, so put live tests in a `vitest.live.config.ts`.
- **Checked:** `npm run typecheck`, `npm run lint`, `npm test` (1/1) and `npm run build` all pass. `next dev` served `/` with status 200.
- **Open issues / next:** Task 2 (Supabase project and schema) is next.

### 2026-10-19: P2 scraper Phase 1 complete (steps 2–13)
- **Who:** Iarush · P2 Agenda Data
- **Branch:** scrapper
- **What changed:** Standalone scraper library (no DB, no Next.js): Legistar (Commissioners Court, HISD), BoardBook (CFISD), PrimeGov (City Council), LLM extraction (Lone Star, HC MUD 489) and manual YAML adapters; results from minutes; news headline collector, article fetcher and article→item matching; pure `health()`. Per-step details, smoke tables and a "Handoff to P5/P3" section are in `.plans/scraper-progress.md`. Also moved the step 0/1 entries, which had been inserted above this file's title, down here unchanged.
- **Files:** `lib/adapters/`, `lib/ingest/`, `lib/news/`, `scripts/`, `data/`, `tests/`, `.plans/scraper-progress.md`
- **Contract changes:** `Meeting`/`Item` per scraper spec §12.1 (`Item.status` upcoming|awaiting_result|decided, `Meeting` end_date/status/minutes_url/comment_rules_text, `vote_result` passed|failed|no_action, `AdapterResult.result_updates`). Additions: optional `is_demo` on Meeting/Item; `RunMode` results takes optional `known`; no `content_hash` on Item/Meeting types (computed at write time); `health()` returns `details`; redaction also covers embedded names and 3+ name lists ("several employees"). DB columns per spec P2-A (P5). Affects P3 and P5.
- **Checked:** npm run typecheck, npm run lint, npm test (364 passed); live smoke of every source (table in progress log).
- **Open issues / next:** No GEMINI_API_KEY: all LLM fixtures hand-written, model ids unverified, live LLM smokes owed. Live BoardBook smoke and BoardBook results mode owed (session was in the 00:00–05:00 window). 5 outlets `fetch_articles: false` (terms of use); Houston Landing disabled. Phase 2 waits for P5's platform.

### 2026-10-19: P2 scraper step 1: shared types, ingest utilities, scrape CLI shell
- **Who:** Iarush · P2 Agenda Data
- **Branch:** scrapper
- **What changed:** Added the scraper's shared types (zod schemas for Meeting, Item, AdapterResult, news types), an HTTP helper, text/date normalization (America/Chicago), hashing, amount parsing, personnel redaction, section attribution, validation, a classify stub, the source registry with the news-domain guard, and the `npm run scrape` CLI shell (no adapters yet).
- **Files:** `lib/adapters/`, `lib/ingest/`, `scripts/scrape.ts`, `data/sources.yaml`, `tests/unit/`, `.plans/scraper-progress.md`
- **Contract changes:** `Meeting`/`Item` extended per scraper spec §5.1/§12 (end_date, status, minutes_url, comment_rules_text, body_id, section, description, amounts with optional `kind: 'rate'`, attachments, contains_private_person, quote_verified). Affects P3 and P5.
- **Checked:** npm run typecheck, npm run lint, npm test (66 passed)
- **Open issues / next:** Step 2 (LegistarAdapter). `lib/rules/classify.ts` untouched (P3 owns it).

### 2026-10-19: P2 scraper step 0: root TypeScript project setup
- **Who:** Iarush · P2 Agenda Data
- **Branch:** scrapper
- **What changed:** Added a root Node/TypeScript project for the standalone scraper library (separate from `web/`): package.json scripts, strict tsconfig, vitest, eslint, `.env.example`, `.gitignore`, and the progress log `.plans/scraper-progress.md`.
- **Files:** `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.live.config.ts`, `eslint.config.js`, `.env.example`, `.gitignore`, `.plans/scraper-progress.md`, `tests/unit/setup.test.ts`
- **Contract changes:** None
- **Checked:** npm run typecheck, npm run lint, npm test (1 passed)
- **Open issues / next:** P5 must merge root deps into the Next.js package.json later. Root configs exclude `web/`.

### 2026-10-19: Plan revision 5: news coverage perspectives
- **Who:** Iarush · part not set yet
- **Branch:** main
- **What changed:** Added a core feature, a "What news coverage says" block on weekly stories. It shows the viewpoints Houston outlets report on an agenda decision, grouped by stakeholder, each with a summary, an exact quote and a source link, plus a one-sided note. P2 now fetches article text from outlets with no paywall (stored admin-only, deleted after 90 days) and uses Gemini to match articles to items. P3 extracts viewpoints, runs code checks and a separate Gemini judge pass, and renders the block. News still never feeds items, classify, alerts, the review queue or story text; its only other effect is a weekly sort tie-breaker by outlet count.
- **Files:** `.plans/news-coverage-perspectives-spec.md` (new), `.plans/agent-scraper-spec.md` (v1.3: D27–D35, Steps 11b and 11c, P2-A, §10, §12), `Project_Plan.md`, `Technical_Implementation_Plan.md` (§1, §2, §6, new §9a, §10, §16, §19–§22)
- **Contract changes:** DB schema §16 gains `news_articles`, `news_article_items` (P2) and `item_perspectives` (P3), plus the existing D26 news tables. No news columns on `items`. The new env var `GEMINI_JUDGE_MODEL` affects P5. `Meeting`, `Item`, `bodies_token` and `classify()` are unchanged. The weekly sort order (§10) gains a last tie-break key, which affects P3.
- **Checked:** Docs only; no code changed.
- **Open issues / next:** TV station RSS feeds verified working on Oct 19 (KHOU, KPRC, ABC13, FOX 26). HPM, Community Impact and ABC13 block `Google-Extended` (Gemini) in robots.txt, and Click2Houston and FOX 26 block other AI crawlers. The owner chose the literal reading (scraper D36): obey only the `*` group or our own bot's group, so every outlet is fetched. P5 should prepare a pitch answer (scraper spec §12, item 22). Outlet terms of use are still unchecked, and Houston Landing still fails TLS. P5 needs to confirm the Gemini budget. P4's watchlist must find a real demo item with 2+ outlets covering it. Article storage is a copyright exposure the team accepted; recheck the outlets' terms.

### 2026-10-18: P4 registration, coaching and rehearsal
- **Who:** BluePhoenix79 · P4 Speak up
- **Branch:** main
- **What changed:** Replaced generated speeches with a bilingual understand → register → user-authored draft → rehearse flow. Added six source-checked recipe records, Chicago/DST/method deadlines, verified-only written alternatives, browser progress, registration confirmation, guardrails with undo and optional server-side coaching. Calendar and news-watchlist findings are documented.
- **Files:** `web/src/app/app/speak/`, `web/src/app/api/coach/`, `web/src/components/speak/`, `web/src/lib/{registration,coach,speak}/`, `web/messages/`, `web/tests/`, `web/docs/p4-*.md`, `web/tsconfig.json`, `.plans/p4-implementation.md`, `CLAUDE.md`
- **Contract changes:** No global data types, DB schema, Meeting/Item, bodies_token or classify changes. New P4-only registration and coach types; atomic RateLimitStore boundary awaits P5. Scope-local EN/ES messages await P5's global i18n provider.
- **Checked:** 71 tests, lint and TypeScript passed. Independent review fixes cover picker/API eligibility, method-specific cutoffs, policy-criticism near-misses, shared speaking targets and selected-method opening state. Live browser/API checks were blocked by approval capacity/socket permissions; live Gemini has no configured key.
- **Open issues / next:** See `web/docs/p4-status.md`. Teammate must verify MUD489's current participation rules and deliver a real comment; no submissions were made. P5/P3 must connect shared rate limits, real data, i18n and SMS reminders. Gemini uses native REST because SDK install approval failed. Original production-build limitations remain. No commit or push was attempted for P4.

### 2026-10-18: Plan revision 5: news "might come up" box (settled Iarush's way)
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - **The news box:** for this one conflict, the owner sided with Iarush. P2's scraper spec (§12.12, D26) asked for the plan lines saying news is never a data source to change, so the plan files now say: news shows headline links on body pages labeled "may come up at a future meeting," and never feeds items, alerts or stories. The "In the news" box moved from stretch goals to the body pages. This is a one-time call, not a general rule that Iarush's documents override the owner's answers.
  - **Stress test:** it no longer interrupts agents running autonomously under a `.plans/` spec. They note it as pending and ask at the next interactive session.
- **Files:** `Project_Plan.md`, `Technical_Implementation_Plan.md` (§6), `CLAUDE.md`, `AGENTS.md`, `web/AGENTS.md`, `plan_stress_test.md`, `agent_handoff.md`
- **Contract changes:** None. The news box's display contract is in the scraper spec's Step 11 (P1 renders it on body pages).
- **Checked:** Docs only. The scraper spec was not touched.
- **Open issues / next:** P5's privacy and terms pages should mention third-party news headlines and links (scraper spec §12.14).

### 2026-10-18: Added the plan stress test for every teammate
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** Added `plan_stress_test.md`: the questions from the owner's planning review, rewritten so each teammate's agent asks its own teammate once and records the answers here, with the owner's answers alongside for comparison. Added a root `AGENTS.md` so Codex, Cursor and other agents started at the root find the rules. `CLAUDE.md` and `web/AGENTS.md` now point to the stress test too.
- **Merged with teammates' pushes:**
  - BluePhoenix79's `CLAUDE.md` changes are kept: four palette bases including `--ink`, presets in `palette.ts`, and `npm test`.
  - Iarush's `.plans/agent-scraper-spec.md` (v1.2) is now treated as the authority for P2 in `CLAUDE.md`, `AGENTS.md` and the stress test (Q11, Q12, Q15, Q16).
- **Files:** `plan_stress_test.md`, `AGENTS.md`, `CLAUDE.md`, `web/AGENTS.md`, `agent_handoff.md`
- **Contract changes:** None
- **Checked:** Docs only; no code changed. The plan files and the scraper spec were not touched.
- **Open issues / next:**
  - Each teammate's agent should run the stress test at its next session. PlaidMod is already marked done.
  - BluePhoenix79 has been building in `web/`, but the owner says `web/` is test-only. Worth a direct conversation.
  - The scraper spec's §12.12 asks for three plan lines to change (the news "might come up" box), but the owner says not to change the plan files. The team needs to settle this.

### 2026-10-18: Planning review: owner's instructions, research, answers (plan files not changed)
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** Went through the plan question by question, backed by research. Only this log, `CLAUDE.md` and `web/AGENTS.md` changed. The plan files were deliberately left as they are. **Where anything below differs from the plan (including part specs in `.plans/`), the plan wins until the team updates it.** This entry is longer than usual because the owner asked for everything to be recorded here.
- **Owner's standing instructions (apply to every agent):**
  - Follow `INSTRUCTIONS.md` no matter what. It stays unchanged.
  - The website in `web/` was only for testing. Don't build on it; follow the implementation plan. This settles the revision 4 Day 1 "prototype vs. plan" item. It also makes the tech plan's §17 table of prototype screens moot.
  - Don't change `Project_Plan.md` or `Technical_Implementation_Plan.md` unless asked.
  - Gemini's 18+ terms: the team has this handled. Don't raise it.
- **Research facts (checked Oct 18):**
  - **Hackathon:** Neighborhood Hacks 2026 is online and for high schoolers. Teams of up to 5; each member registers on Devpost.
    - **Submissions close Fri Oct 23, 11:59 PM CST.** There's no live demo: judges see the Devpost write-up, a 2–6 min video and the public repo.
    - The write-up must answer "What is the specific problem, and how do you know it's real?"
    - Rubric: Community Relevance 25%, Impact 20%, Technical 20%, Creativity 15%, Presentation 10%, Accessibility 10%.
    - Rules §4: AI tools must be disclosed in the written description. §9: misrepresenting AI use can disqualify. https://neighborhoodhacks.org/rules/
  - **Twilio:** a trial account can send only preset templates, not custom alert text. Real alerts need a paid account plus Sole Proprietor 10DLC registration, which needs a real US mobile number, an address, and privacy and terms URLs. Campaign review can take several days. Twilio Verify works on a trial (verified numbers only).
  - **Vercel Hobby:** cron runs at most once a day, within ±59 min of the set time. Functions max out at 300 s.
  - **Gemini:** Google may use free-tier content and have humans review it; the paid tier doesn't. Current models are `gemini-3.8-flash` and `gemini-3.5-flash-lite`. Structured JSON output is supported.
  - **Legistar:** `harriscountytx` and `houstonisd` both work without a token. HISD's data is complete. Commissioners Court's is missing upcoming meetings (Oct 29, Nov 12).
  - **Meetings before the deadline:**
    - CFISD, Mon Oct 19, 6 PM (sign up by noon Oct 19).
    - City Council, Tue Oct 20, 2 PM (sign up by 3 PM Oct 19).
    - HISD, Thu Oct 22, 5 PM. Its agenda is only five teacher employment hearings, so it's not suitable for the real comment.
    - **City Council's Tue Oct 27, 5 PM session already takes sign-ups on its online form, on any topic.**
    - Commissioners Court (Oct 29), HCC (Oct 28) and Lone Star (Nov 5) are all after the deadline.
- **Answers the owner agreed to (team notes; not in the plan):**
  1. The owner is P5. The name is ShowUp HTX.
  2. "Done" means the demo flow works end to end for the two demo addresses, plus the evidence. **After the demo flow works:**
     - the other four registration recipes
     - reminders 7a/7b and the protest reminder
     - the timeline
     - the "Why did I get this text?" page
     - health checks and the 45-day recheck
     - HISD Spanish agenda linking
     - the HOA top-50 list
     - Spanish coach tests
     - Port, METRO and water authority stories
  3. No classmate survey until the real lookup (Census + HCAD) works.
  4. The paid Gemini tier is owned by an adult (an 18+ teammate or a parent), along with any paid Twilio account.
  5. The Devpost write-up discloses AI use, and a teammate writes that section. This is the owner's answer to `INSTRUCTIONS.md`'s stop-and-ask rule.
  6. Schedule to the real deadline:
     - Mon: setup and checks.
     - Tue–Wed: build.
     - Thu: freeze at noon, fix bugs, record the video.
     - Fri: write-up; submit by 6 PM CST.
  7. A ~4 min video replaces the pitch slides and the backup video.
  8. All five teammates must be eligible and registered on Devpost. Confirm.
  9. Speak up may fill in only a factual opener (name, who you are, area, item). The user writes their position, experience, ask and closing.
  10. Build the new app at the repo root using the tech plan's §2 layout. Leave `web/` untouched, and delete it before submission once sohankamsala agrees.
  11. Carry over only the prototype's design system: `DESIGN.md`, color tokens, fonts and the shadcn components.
  12. Stay on Vercel Hobby, and trigger jobs by hand with `CRON_SECRET`.
  13. Use one model everywhere: `gemini-3.8-flash`.
  14. **Agenda data:**
      - Legistar for HISD.
      - Gemini extraction for the demo MUD.
      - Manual entry for everything else.
      - Skip PrimeGov.
      - Review items by flipping `review_status` in Supabase's table editor.
  15. **Real comment:** not HISD on Oct 22 (personnel hearings). Skip CFISD on Mon Oct 19 unless a CFISD teammate already has a topic.
- **Still open (owner unsure):**
  - Paid Twilio with Sole Proprietor registration, falling back to a labeled "preview" mockup.
  - Classmate survey Wed evening to Thu noon, with at least 10 people.
  - A teammate registering with the app for City Council on Oct 27, then speaking.
- **Files:** `agent_handoff.md`, `CLAUDE.md`, `web/AGENTS.md`
- **Contract changes:** None.
- **Checked:** Docs only; no code changed. Research came from web sources and read-only API calls; nothing was registered or submitted.
- **Open issues / next:**
  - Revision 4 of the plan still lists "prototype vs. plan" as an open Day 1 item, and §17 still has the prototype-screen table. Both are settled or moot per the owner, but the plan text wasn't edited.
  - Iarush's `.plans/agent-scraper-spec.md` (v1.2) was pushed during this review and wins for P2. It replaces answer 14 (agenda data), the P2 parts of answers 2, 12 and 13, and the "Skip PrimeGov" line. Under the spec:
    - Sources: Legistar for Commissioners Court and HISD, BoardBook for CFISD, PrimeGov plus Gemini for City Council, Gemini for Lone Star and HC MUD 489, and YAML manual entry.
    - Scheduling: GitHub Actions every 30 minutes, with a daily Vercel backup.
    - Model: Flash, retrying on Pro when validation drops too many items.
    - Health checks and results-from-minutes are built in Phase 1.

### 2026-10-18: UI polish and palette studio
- **Who:** BluePhoenix79 · UI/platform (part not assigned)
- **Branch:** main
- **What changed:** Improved dashboard hierarchy and phone layouts, widened news tiles at intermediate sizes, and added motion/focus polish. Expanded the existing dev picker into a six-preset palette studio with four editable tokens, validated saved colors, core contrast checks, CSS export and reset.
- **Files:** `web/src/app/`, shared UI components, `web/src/lib/palette.ts`, `web/tests/palette.test.mjs`, `web/DESIGN.md`, `web/docs/ui/`, `web/package.json`, `CLAUDE.md`
- **Contract changes:** None to schema, Meeting/Item, bodies_token, classify, or data/types.ts. Design tokens now allow ink as a fourth editable palette base.
- **Checked:** Pulled through `839e4a5` with autostash; no conflicts. `npm test` (5 passed), `npm run lint` and `npx tsc --noEmit` passed after pulling. Desktop palette/preset and Escape checked; phone dashboard and Brief inspected. Screenshots and detailed verification limits are in `web/docs/ui/README.md`.
- **Open issues / next:** Production builds previously failed on Google Fonts access and a CSS worker startup error. Browser persistence/clipboard checks remain unverified because approval tools timed out. Prototype/plan reconciliation remains open; scraper spec v1.2 overrides several parent-plan details and is not implemented by this UI change.

### 2026-10-18: Plan revision 4: rebalanced P5
- **Who:** PlaidMod · part not set yet
- **Branch:** main
- **What changed:** P5's Day 1 was overloaded, and every other part waits on it. Moved meeting calendar checks and the news watchlist to P4, Twilio registration to P3, and demo address picking to P1. Each part now converts its own screens' text for English/Spanish, and P5 only sets up the system. P5 does the database schema first on Day 1. Added a timing-risk note for the real public comment and a Day 1 "Everyone" decision on where the prototype and the plan disagree.
- **Files:** `Project_Plan.md`, `Technical_Implementation_Plan.md` (§11, §17, §22)
- **Contract changes:** None. Ownership and schedule only; no schema, type or token changes.
- **Checked:** Docs only; no code changed.
- **Open issues / next:** P1, P3 and P4 each picked up a Day 1 task; check that your Day 1 still fits. The prototype vs. plan decision is still open.

### 2026-10-18: Added INSTRUCTIONS.md (binding agent rules)
- **Who:** PlaidMod · part not set yet
- **Branch:** main
- **What changed:** Added `INSTRUCTIONS.md`, adapted from the owner's existing agent rules: no AI attribution anywhere (commits, PRs, docs, handoff entries), plus rules for when to commit or push. Removed the NASA-specific parts. `CLAUDE.md` now imports it and `web/AGENTS.md` points to it. Removed the "agent and model" field from this log's template to match.
- **Files:** `INSTRUCTIONS.md`, `CLAUDE.md`, `web/AGENTS.md`, `agent_handoff.md`
- **Contract changes:** None
- **Checked:** Docs only; no code changed.
- **Open issues / next:** If the hackathon's submission rules ask about AI use, that conflicts with `INSTRUCTIONS.md` §1. Agents must stop and ask rather than fill it in.

### 2026-10-18: Added agent guidance and this handoff log
- **Who:** PlaidMod · part not set yet
- **Branch:** main
- **What changed:** Added `CLAUDE.md` with commands, how the prototype is built, where it differs from the plans, and the design and neutrality rules. Added this log, and a rule in `CLAUDE.md` and `web/AGENTS.md` telling every agent to write an entry here.
- **Files:** `CLAUDE.md`, `agent_handoff.md`, `web/AGENTS.md`
- **Contract changes:** None
- **Checked:** Docs only; no code changed.
- **Open issues / next:** The prototype and Project_Plan rev 3 disagree on tier names, personas, county coverage, body list and route layout (see `CLAUDE.md`, "Prototype vs. plan"). The team needs to decide which side wins.
