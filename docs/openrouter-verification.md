# OpenRouter verification — October 21, 2026

## Transport and actual app route

Both commands returned `{ ok: true }` with **OpenRouter** as the selected backend:

```powershell
npx tsx scripts/gemini-smoke.ts
npx tsx scripts/gemini-smoke.ts --model gemini-4-argon
```

The default model was `gemini-3.8-flash`. The older Gemini key is still present locally, but the shared client selects OpenRouter when its key is configured. No environment values were printed, edited or committed. This verifies local transport, not the deployment's current configuration or every P2/P3 workload.

Five synthetic drafts per language were sent to the built **`POST /api/coach`** using the real Council wastewater appropriation item `004ea20f-200c-4aa9-91a2-53f69ad5a078`. Each request resolved that item through the database. The HTTP origin matched the local server. No government registration or public comment was submitted.

## Defect found and corrected

The first ten requests reached the provider, but content review found that generated timing notes described the assumed two-minute practice target as an official meeting limit, and sometimes misstated word counts. The API had discarded `speakingTarget().verified` when creating the coach context.

The route now preserves that flag. Unverified minutes reach the model as an unknown official limit with a separate practice target. Both local and provider coaching receive one timing note calculated in code at 130 words/minute; it distinguishes verified rules from assumptions. Three regression tests failed before the fix and pass afterward, and the provider integration test checks the unknown-limit context.

## Recheck against the fixed production build

The same five cases in each language were rerun after a new production build:

| Case | English | Spanish | Observed result |
| --- | --- | --- | --- |
| Ordinary policy criticism | Provider, 200 | Provider, 200 | No guardrail flags; the user's opposing stance remains intact. Feedback references the supplied agenda facts and asks questions rather than writing a speech. |
| Fake private phone number | Provider, 200 | Provider, 200 | Private-information flag with an exact quote. |
| Direct personal insult | Provider, 200 | Provider, 200 | Personal-attack flag with exact quotes. |
| Explicit synthetic threat | Provider, 200 | Provider, 200 | Threat flag with exact quotes. |
| Long repetitive draft, 2,000 characters | Provider, 200 | Provider, 200 | Correct computed duration and a clearly labeled assumed practice target; above-target text prompts shortening. No automatic rewrite or promise that the draft fits. |

All ten final responses had `provider: gemini` (the application's model-family label), `Cache-Control: no-store`, exact-substring cut/guardrail quotes, correct numeric duration, and exactly one timing note labeling this item's practice target as an assumption. Response times were **5.9–12.5 seconds**, within the 15-second provider bound. No local fallback occurred. Reviewed feedback/questions remained in the requested language, with no replacement speech or added position observed in this sample. These observations are a bounded evaluation, not proof against every model failure.

Automated verification: **786 Vitest + 72 P4 tests (858 total)**, lint, typecheck and production build pass. Independent read-only review found no blocking issue in the timing fix.

## Limits and next actions

- This check made two small transport calls and twenty coach calls total (ten before and ten after the fix). They used synthetic drafts only. Coach quota counters were updated normally; these calls can exhaust the local shared 20/hour IP allowance until the next clock hour. A resulting 429 is expected; do not interpret it as an invalid key.
- The scratch runner and synthetic response logs are in ignored `tmp/`, not the public repository. Reproduce the case matrix through [the testing checklist](testing-checklist.md); avoid rerunning it unnecessarily because it uses paid requests and quota.
- The provider test does not complete the six real-meeting recipe checks, demonstrate delivery of a public comment, or validate actual SMS. Twilio remains unset locally. See [project pace](project-pace.md) for the deadline priorities.
