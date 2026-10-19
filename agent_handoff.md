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
   - types in `web/src/lib/data/types.ts`
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
  - **Body IDs:** 1 to 64 IDs, each matching `^[a-z0-9][a-z0-9_-]{0,63}$`.
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
