# Scraper (P2) progress log

Started 2026-10-19 on branch `scrapper`. Entries follow `.plans/agent-scraper-spec.md` §7.

## Step 0: Setup: DONE WITH DEVIATIONS
- What was built: root `package.json` (private, ESM, scripts typecheck/lint/test/test:live/scrape/news), `tsconfig.json` (strict, bundler resolution, `@/*` alias, excludes `web/`), `vitest.config.ts` + `vitest.live.config.ts` (live tests under `tests/live/`), `eslint.config.js` (flat config, ignores `web/`, `tmp/`), `.env.example`, `.gitignore`, this log, placeholder test.
- Checks: typecheck ✔ lint ✔ tests ✔ (1 passed) smoke n/a
- DEVIATION: spec said use `baseUrl` style alias / found TypeScript 6 rejects `baseUrl` as deprecated (TS5101) / did: `paths` only, which resolves relative to tsconfig.
- DEVIATION: Gemini model names in `.env.example` are placeholders (`gemini-flash-latest`, `gemini-pro-latest`); verify current names before Step 6.
- Notes for P5: root `package.json` holds only P2 deps; merge into the Next.js `package.json` when the platform exists.

## Step 1: Types, utilities and the CLI shell: DONE WITH DEVIATIONS
- What was built: `lib/adapters/types.ts` (zod schemas + inferred types mirroring §5.1, `Amount.kind?: 'rate'`, `SourceConfigSchema`, Classifier types), `lib/adapters/http.ts`, `lib/ingest/{normalize,hash,amounts,redact,attribution,validate,classifyStub,registry}.ts`, `data/sources.yaml` (copied from §5.2), `scripts/scrape.ts` (flags `--source --mode --meetings --from --to --out --record`; validates with `AdapterResultSchema.parse()`; adapters register in its `ADAPTERS` map).
- Checks: typecheck ✔ lint ✔ tests ✔ (66 passed) smoke n/a
- DEVIATION: spec said amounts tests use 15+ real strings from Legistar fixtures / found no fixtures exist before Step 2 / did: 19 Legistar-style strings now; add real fixture strings in Step 2.
- DEVIATION: `SourceConfig` was not defined in §5.1 / did: added `SourceConfigSchema` {id, body_id?, adapter, config: record} in types.ts.
- Notes: redaction replaces "Name, role[, School]" with "An employee" (role dropped, per §5.4 example). HISD fixture tests still due in Step 3.


## Step 2: LegistarAdapter: DONE WITH DEVIATIONS
- What was built: `lib/adapters/legistar.ts` (`legistarAdapter`, `createLegistarAdapter({http, now, pageSize})`, pure `mapEvent`/`mapEventItems`/`resultUpdatesFrom`/`voteResult`/`isSectionHeader`/`stripHtml`/`eventsUrl`/`eventItemsUrl`), registered in `scripts/scrape.ts`. `scripts/record-legistar.ts` (records the 5 golden events), `scripts/check-scrape.ts` (§7 smoke assertions + idempotency), `tests/golden/legistar/` (5 fixtures + `expected.json` + `fixtures.ts` loader + README), `tests/unit/legistar.test.ts` (golden, status, results mode, offline pagination). `redact.ts` gained `leakingName()` for the smoke leak check. Amounts tests now include 17 real fixture strings.
- Checks: typecheck ✔ lint ✔ tests ✔ (104 passed) smoke ✔
  - hc_commissioners_court default window (Oct 19–Nov 18): meetings 0, items 0, warnings 0. Expected: Legistar has no Commissioners Court meeting between Oct 15, 2026 and Jan 14, 2027 (§2).
  - hc_commissioners_court `--from 2026-09-01`: meetings 5 (1251 special, 1242, 1261, 1243 cancelled, 1244), items 1,259, warnings 2 (1242 eventitems page hit 1,000 rows; 1243 has 0 items).
  - hisd_board: meetings 1 (1332), items 10, redacted 5, warnings 0.
  - Each run twice: identical external_id sets; no duplicates, dates in window, no leaks.
- DEVIATION: spec said a header is any row with null number and matter id, boilerplate only if > 200 chars / found prayer text, pledge text, travel-table rows, HISD bullet outlines, "Page Break" and "…via:" lead-ins under 200 chars / did: `isSectionHeader()` requires ≤ 100 chars, one line, no bullet, no column spacing, no trailing ":", not "Page Break", not a comment-rules line. Comment rules = non-header rows > 100 chars matching the §8 regex.
- DEVIATION: spec said keep a header stack / found Legistar has no header levels / did: ALL-CAPS multi-word headers are top level and a following Title-case header is their child; `section` is the path joined with " / " (e.g. "CLOSED SESSION / Legal"). Commissioners Court sections stay single-level. Attribution checks every level.
- DEVIATION: found rows with null `EventItemAgendaSequence` (372 in 1242, 7 in 1306) that are minutes-only copies of agenda rows / did: never emitted; their action/flag is copied onto the agenda row with the same `EventItemMatterId` if that row has no outcome.
- DEVIATION: spec mapped vote_result only from `Pass` / /fail/ / "no action" / found 53 rows in 1242 with `accepted` and no flag / did: `approved|accepted|adopted|passed|ratified|authorized` with no flag also maps to `passed` (also makes the hand-edited "approved" results test produce ResultUpdates).
- DEVIATION: spec said "then compute hashes" / found `Item`/`Meeting` have no content_hash field / did: adapter hashes documents only; item and meeting hashes come from `itemContentHash`/`meetingContentHash` at write time (Phase 2).
- DEVIATION: `harriscountytx-1242` eventitems is 1,921 rows / 2.7 MB / did: compacted (null fields and GUIDs dropped) and trimmed to the first 1,019 rows (977 KB); see fixture README.
- Fixed: `parseAmounts` read "0.1972-acre" as a tax rate; bare rates now exclude measurements, and "per $100 of value" is part of the rate text.
- Notes for P3/P5: `section` may be a path ("CLOSED SESSION / Personnel"); closed-session tests should match the whole string. `agenda_number` keeps HISD's "a)" form. Results mode refetches `/events/{id}` (not the filtered list) plus eventitems.

## Step 3: Redaction against real data: DONE WITH DEVIATIONS
- What was built: `tests/unit/redact-fixtures.test.ts` (all 5 HISD 1332 hearing items: no name, no name token, no school anywhere in output; closed-session items with no name unchanged; leak test over every fixture using `leakingName()` = 2+ consecutive capitalized non-stopword tokens before the first comma; no personnel-sensitive output still matches a redaction pattern; §5.4 near-misses kept). `redactText()` gained an embedded-name rule. `houstonisd-1306/expected.json` regenerated (one new redacted title, nothing else changed).
- Checks: typecheck ✔ lint ✔ tests ✔ (114 passed) smoke ✔
  - hc_commissioners_court default window: meetings 0, items 0, warnings 0 (calendar gap, §2).
  - hc_commissioners_court `--from 2026-09-01`: meetings 5, items 1,259, warnings 2, redacted 0.
  - hisd_board: meetings 1, items 10, redacted 5, warnings 0.
  - Each run twice: identical external_id sets; no leaks.
- DEVIATION: spec's rule only covers a leading "Name, role" / found HISD 1306 closed-session item b) names a person mid-sentence ("including termination of Travis Johnson, former principal of Kashmere High School,") / did: added an embedded rule (2–4 capitalized tokens, comma, optional former/current/interim/assistant, role word, optional "of/at <School>") that replaces the segment with "an employee". The 1306 item now has `contains_private_person = true`. The name stays only in the raw fixture (the public record), per §5.4.
- Notes for P3: `contains_private_person` can now be true on closed-session items too, not only hearings.
