# P4 delivery and root integration

Pulled through `748dd41` on October 20 and integrated local P4 into the root app. The original `web/` is restored to its upstream reference state. The recovery stash `Preserve local P4 work before root-app integration` is retained. Local credential values remain outside Git; the tracked environment template was restored after it had been renamed.

## Connected

- `/app/speak`: bilingual understand → register → own draft → practice. `/speak-up/[itemId]` redirects P3's links into the same flow. Direct item links load the selected item without requiring a prior dashboard cookie.
- Root body IDs and demo aliases resolve to six recipes. Special/unknown meeting types and weekday-mismatched Council sessions do not inherit ordinary-meeting registration channels or rules. MUD 489 participation remains unknown.
- Official logos, root profile/live data, next-intl locale choice and existing translations are retained. P4 adds the `speak` namespace to both message files.
- `/api/coach` resolves database/sample items using P3's loader, and demo items using server-held facts. Drafts remain capped at 2,000 characters, never enter database/logs, and are sent only on explicit coaching requests. Removal is explicit and undoable.
- Production coaching uses P5's shared Gemini SDK, `GEMINI_MODEL`, strict schemas and a 15-second bound. Local fallback is labeled separately. The original isolated REST adapter remains test-covered but is not used by the route.
- With database credentials and `IP_HASH_SECRET`, coaching uses shared counters with stable digests. Each key increments atomically; denied calls may consume both quotas. Counter failures return 503. Without configuration, the bounded memory fallback resets on restart.
- Live UUID items can explicitly save reminder requests through P3's `/api/reminders`; a 401 directs readers to verify/opt in. Only the item ID is sent. A browser-only preference never claims a remote request was saved. The alerts cron receives known common registration bounds; unknown or method-specific bounds are not guessed. Consent, quiet hours and sending remain P3's responsibility.
- Weekly items receive known registration cutoffs. `Update.comment.minutes` is nullable: unknown official allocations no longer become the former hardcoded three minutes. Meeting type and agenda number survive P3's mapping.
- Late texts ask readers to check official participation rules rather than promising a written alternative at every body.

## Configuration

Add values to the **root** `.env.local` using `.env.example`, then restart the root server. Never paste secrets into chat or put them in `NEXT_PUBLIC_*` variables. Coaching uses `GEMINI_API_KEY` and optional shared `GEMINI_MODEL`. Shared counters need `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `IP_HASH_SECRET`.

Optional `COACH_TRUSTED_IP_HEADER` is safe only for a header that ingress strips and rewrites to one bare IP. Otherwise leave it unset: unknown IPs share a conservative 20/hour quota. Browser IDs are resettable quota identities, not authentication.

## Remaining acceptance

- MUD and meeting-specific rules need verification. [Research](p4-research.md) records October 18 findings; the October 19 deadlines have passed. This is not a live calendar.
- A teammate must register and deliver their own real comment. No registration, message or public comment was submitted during implementation.
- The built demo flow was checked in a browser at desktop and 390px, including Spanish, saved-draft reload and a P3 item redirect. Live structured output and coaching through the configured Vertex key passed; the built API returned Gemini feedback in English and Spanish. Supabase table access and the atomic counter RPC passed. The civic data tables are empty, so real agenda scenarios remain unavailable. Full five-draft-per-language provider evaluation, quota concurrency testing and real reminder delivery remain unverified. Subject shortening remains deterministic; phone guidance is abbreviated.
- Final test, lint, typecheck, build and runtime results are recorded in `agent_handoff.md`.

`npm test` runs root Vitest plus migrated helper tests via `npm run test:p4`. Integration coverage includes root IDs, meeting safety, real metadata, SDK privacy/time bounds, distributed quotas, asynchronous item resolution, reminder bounds and unknown speaking limits. Run checks from the root.

Merge verification: 642 Vitest + 67 P4 tests (709 total), lint, typecheck and production build passed. Built HTTP checks confirmed redirect/page rendering and coaching rejection of malformed (400) and cross-origin (403) requests. Tests used no real provider or SMS calls. Dependency installation reported 9 high advisories in upstream dependencies; those were not changed by this merge.

Pre-push review additionally fixed expired-channel confirmation transfer and historical default-item selection, with regressions. Normal navigation shows upcoming items; explicit historical links remain available with closed/unknown participation guidance. Channel changes require an explicit choice and reset the registration confirmation. Final check totals are in the handoff. Separate synthetic live checks used Gemini and the configured counter, but sent no SMS, registrations or comments. Twilio is unset.

Final configured verification: **712 tests (643 Vitest + 69 helper tests), lint, typecheck and production build pass.** Independent review fixes were rechecked, and the built browser retains Tuesday Council registration while showing unknown guidance for Wednesday voting items. The configured coaching API returns Gemini feedback in English and Spanish with no-store responses; reminders require a verified subscription (401).
