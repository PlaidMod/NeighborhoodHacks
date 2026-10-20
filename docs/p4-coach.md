# Speak up coaching boundary

`POST /api/coach` accepts `{mode: "explain" | "coach", item_id, zip?, draft?, lang: "en" | "es", browser_id?}`. It resolves known official-source items with P3's loader or the demo neighborhood with server-held facts. Clients cannot supply agenda facts, source URLs or prompt instructions. Removed, decided or cancelled live items are rejected; lookup failures return generic 503 errors.

Explain returns `{provider, plain_summary, who_it_affects, questions_for_user}`. Coach returns `{provider, questions, feedback, cut_suggestions, guardrail_hits, estimated_seconds}`. Provider is `local` or `gemini`; contracts live in `lib/coach/types.ts`.

The root route uses `lib/coach/shared.ts` and P5's `generateJson`: official SDK, server-only `GEMINI_API_KEY`, shared `GEMINI_MODEL` and structured schemas. Provider and service deadlines are bounded to 15 seconds. Explanation requests omit drafts. Item/draft strings are untrusted data, never system instructions. Sample facts are labeled separately. The old REST transport in `lib/coach/gemini.ts` remains isolated and tested but is not selected by the production route.

Malformed output, provider errors and timeout fall back locally without logging upstream bodies. Quotes must be nonempty exact draft substrings. Extra fields, invented quotes, invalid categories/timing and obvious quoted replacement instructions are rejected. Schema and phrase checks cannot prove arbitrary free text is neutral. EN/ES deterministic checks supplement the provider; regression cases preserve policy criticism and public-role references.

Timing is recalculated at 130 words/minute. Drafts are capped at 2,000 characters. Explicit removal merges literal spans and offers undo without rewriting the remainder. Drafts/progress stay in the browser except explicit feedback requests to Google; they are not written to database or application logs.

Requests require same-origin JSON, reject cross-site Fetch Metadata, and stream at most 12,000 bytes. Responses use `Cache-Control: no-store`. An HttpOnly/SameSite=Strict cookie identifies a browser after a successful request, with a validated UUIDv4 client fallback. This is quota identity, not authentication.

With database credentials and `IP_HASH_SECRET`, stable HMAC digests let multiple workers use P5's atomic per-key counter RPC. Both browser/IP keys count against 20/hour; denied calls may consume counts. Database failures return 503 rather than the shared helper's fail-open behavior. Without configuration, the bounded memory limiter resets on restart. No raw IP or draft is stored.

No proxy header is trusted by default. `COACH_TRUSTED_IP_HEADER` is safe only if ingress strips and rewrites it with one bare IP. Otherwise callers share the conservative unknown-IP quota. See [P4 status](p4-status.md) for configuration and remaining runtime checks. Unit tests use injected transports and never call Google.
