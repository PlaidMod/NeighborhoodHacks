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

