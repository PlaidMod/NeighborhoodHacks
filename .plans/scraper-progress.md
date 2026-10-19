# Scraper (P2) progress log

Started 2026-10-19 on branch `scrapper`. Entries follow `.plans/agent-scraper-spec.md` §7.

## Step 0: Setup: DONE WITH DEVIATIONS
- What was built: root `package.json` (private, ESM, scripts typecheck/lint/test/test:live/scrape/news), `tsconfig.json` (strict, bundler resolution, `@/*` alias, excludes `web/`), `vitest.config.ts` + `vitest.live.config.ts` (live tests under `tests/live/`), `eslint.config.js` (flat config, ignores `web/`, `tmp/`), `.env.example`, `.gitignore`, this log, placeholder test.
- Checks: typecheck ✔ lint ✔ tests ✔ (1 passed) smoke n/a
- DEVIATION: spec said use `baseUrl` style alias / found TypeScript 6 rejects `baseUrl` as deprecated (TS5101) / did: `paths` only, which resolves relative to tsconfig.
- DEVIATION: Gemini model names in `.env.example` are placeholders (`gemini-flash-latest`, `gemini-pro-latest`); verify current names before Step 6.
- Notes for P5: root `package.json` holds only P2 deps; merge into the Next.js `package.json` when the platform exists.

