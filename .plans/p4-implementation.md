# P4 Speak up implementation plan

**Goal:** Replace generated speeches with a sourced, bilingual route from agenda item to registration, user-authored comment, and rehearsal.
**Spec:** Project_Plan.md revision 4 §§7, Evidence, Part 4; Technical_Implementation_Plan.md §§13–14; scraper spec handoff notes (two-day council sessions, deferred HISD translation).
**Architecture:** Keep prototype routes and data contracts. Add isolated registration and coaching modules with explicit types; /api/coach resolves known item IDs instead of trusting client claims. All drafts/progress stay in this browser; only explicit coaching requests send draft content to Gemini. No automatic submissions.
**Execution:** Implement the supplied requirements now in the existing checkout. Independent registration/research and coach work may run concurrently; integration/UI and final checks run sequentially. Do not commit or push this new feature without a fresh instruction.

## Constraints
- Existing tokens, fonts, civic neutrality and sample-data labels stay in effect.
- Coach never writes replacement prose or suggests a position; quote spans must exist in the draft. 130 words/minute, 2,000-character maximum, 15-second provider timeout, 20 requests/hour/browser and hashed IP.
- Registration times use America/Chicago, including DST and business-day rules. Missing recipes must not invent a method or email recipient. Never promise an alternate channel after registration closes unless verified.
- English and Spanish throughout the flow; no new global data types or schema migrations.
- Shared P5 database/i18n infrastructure does not exist. Supply a documented integration boundary, safe local fallbacks, and explicit deployment limitations rather than simulate a database or SMS service.

## Tasks
- [x] Registration engine: lib/registration/{types,deadlines,recipes,channels}.ts; tests/registration.test.mjs. Verify six official recipes, source dates and channels. Tests cover DST, noon cutoff, weekdays, exact boundaries, missing recipe, student written default, safe mailto and unavailable alternates.
- [x] Coach: lib/coach/{types,guardrails,validate,service,rate-limit}.ts and app/api/coach/route.ts; tests/coach.test.mjs. Test EN/ES threats/private info/attacks, policy criticism kept, invented quotes rejected, malformed provider payloads, limits, timeout and unconfigured provider. Server-only key; no logs/draft persistence.
- [x] UI: app/app/speak/speak.tsx plus components/speak/{registration,draft,practice}.tsx and lib/speak/{messages,progress}.ts. Four steps: understand, register, coach your own draft, rehearse. Source links, open/closed windows, confirmation and accommodations, restored progress, source-labeled explanation, contact-specific handoff, guarded removal, clear storage and timer. Test corrupt browser data, changing items, elapsed timer and limits.
- [x] Research: docs/p4-research.md with calendar/watchlist findings, actual upcoming opportunities and uncertainty. No contacting residents or submitting comments on their behalf.
- [x] Integration: add official SDK dependency only if usable; document configuration and privacy. Run all tests, lint, tsc and browser checks as available; independently review and fix important findings. Update agent_handoff.md with completed work and real-world evidence still requiring a teammate.

## Review focus
Closed registration must never be shown open; unverified district rules must be labeled unknown; local and Gemini outputs cannot ghostwrite; bad model quotes cannot delete unrelated draft text; reload cannot silently transfer another item's draft; changing tab or sleeping cannot extend rehearsal time. Live submission evidence requires a teammate to act.

## Delivery evidence
71 automated tests, lint and TypeScript checks pass. Independent review findings were fixed. The documented REST adapter replaces the unavailable SDK dependency. Interactive browser checks and live Gemini remain unverified due to environment access and missing configuration. Real comment submission, uncertain MUD details and P3/P5 service integration remain explicit external follow-ups; see [P4 delivery status](../docs/p4-status.md).

## October 20 acceptance recheck
The implementation checkboxes above record delivered code and research, not full product-plan acceptance. Fresh verification passes 72 tests, lint and TypeScript after fixing saved-browser-ID recovery. Production build fails on Google Fonts fetching; local browser navigation times out and direct HTTP is socket-denied despite a ready development server. Full acceptance still needs all six meeting-specific recipes verified, live coaching golden evaluation, P3/P5 integration and real participation evidence. Deterministic subject shortening and abbreviated phone guidance differ from the parent plan. See the delivery status for the remaining gaps; October 19 research deadlines have passed.

## Root-app merge on October 20
Integrated upstream through 748dd41. P4 now uses the root SDK, counters, messages, item loader and reminder API. Earlier absent-service notes are historical. See ../docs/p4-status.md. Plan stress test remains pending under this implementation spec; the requested integration proceeds without a planning interview.
