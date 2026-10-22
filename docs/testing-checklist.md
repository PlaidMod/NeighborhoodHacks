# Local testing checklist — October 21, 2026

Use the **repository root**, not `web/`. P4 owns Speak up, registration guidance, the comment coach, rehearsal and the participation evidence. Check the surrounding journey once; send failures in another part to its owner instead of rebuilding their feature.

Record each result as **pass**, **fail**, or **blocked**, with the item URL, language, expected result, actual result and a screenshot when useful. A passing sample journey does not prove live registration, provider access or SMS delivery.

## 1. Start the app

In PowerShell:

```powershell
Set-Location 'C:\Users\Pranav Sai\Downloads\NeighborhoodHacks'
npm run dev
```

Open [localhost:3000](http://localhost:3000). If another server owns that port, stop your old server or use `npm run dev -- --port 3001` and substitute 3001 below. Restart after changing environment variables. Close the dev server before running a production build in the same checkout.

The latest dependencies were already installed for this audit. On a new checkout, run `npm ci` first. Do not replace your `.env.local` with `.env.example`; the template has blank secrets.

**This computer:** Supabase, signing/hash settings and `OPENROUTER_API_KEY` are present. Both configured models passed live structured-output checks. All checked Twilio settings remain absent; the older Gemini key remains but OpenRouter takes precedence. Other teammates should obtain the current local configuration privately from PlaidMod. Put keys only in the ignored root `.env.local`; do not paste them into chat, screenshots, Git or public environment variables. Local settings do not establish deployment settings.

## 2. Run the automated checks

Run these **one at a time**, from the root:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: 786 Vitest tests and 72 P4 helper tests pass; lint, typecheck and build exit successfully. These totals include the timing-feedback regressions and will change as teammates add tests. `npm test` includes the P4 tests. For a quick P4 helper recheck alone, use `npm run test:p4`.

The ESLint isolation test has intermittently exceeded its 30-second limit on this computer. Record that failure, close competing build/test processes, and rerun. A persistent timeout is unresolved even when the other tests pass. A diagnostic full-suite run with fewer workers is `npx vitest run --maxWorkers=2`, followed by `npm run test:p4`; record those as the commands actually used.

To test the built app after a successful build:

```powershell
npm run start -- --port 3001
```

Use that server for one final run of the main journey. A dev-server pass alone does not verify the production build.

## 3. Check the whole address-to-agenda journey

Use public building addresses. Start a fresh private browser window for each journey so previous bodies and personas do not carry over.

1. Open `/`, submit **901 Bagby St, Houston, TX 77002**, pick Student on the stake screen and continue.
2. On results, exercise the Who governs you quiz if testing its recording deliberately; otherwise leave it unanswered and use the dashboard link below it. A submitted quiz creates an anonymous row in the shared database: do not count your rehearsal as classmate survey evidence.
3. On results, expect an HCAD-verified match, seven tracked governments, plus other governments including the Hospital District, Department of Education and Downtown Management District. CenterPoint should appear once. Open a government and its official source.
4. Continue to `/app`. Expect real Council/HISD items rather than a sample-only dashboard. Check the weekly brief, timeline, item detail and original agenda link. Dates, body, agenda number and status should agree across screens. Missing generated stories should not be treated as proof that no agenda exists.
5. Open **Speak up** from a real item. The same item and body must reach P4. Copy its URL for later deep-link and reload checks.
6. In a new private window, repeat with **10707 Mason Rd, Cypress, TX 77433** and Homeowner. Expect HCAD verification, CFISD, Lone Star and MUD 489; WCID 157, WCID 159 and ESD 9 should be listed as untracked. These two addresses should not produce an identical government stack.
7. Repeat with **3100 Cleburne St, Houston, TX 77004**. Expect the clearly labeled Census fallback, not an HCAD verification claim. Some addresses in a loaded ZIP still lack an exact HCAD match.
8. Submit an empty address: expect a validation message. Try a clearly invalid address: expect a useful failure without stale results from the previous address. Keyboard-test the suggestion dropdown with arrow keys, Enter and Escape.

**Coverage limits:** only ten ZIPs have loaded HCAD records; other places may use Census. Boundaries and tax-rate rows are currently empty. On a tax receipt, expect an explicit unavailable-data state wherever real tax data is missing; a fabricated dollar total is a failure. Do not reload the whole HCAD dataset just to test P4.

## 4. P4: understand and registration

For repeatable UI practice, open `/app/speak?item=hisd-calendar` in a fresh private window **before looking up an address**. A saved real-bodies cookie can replace the demo item list. This is a labeled sample; use a current, real agenda item for participation evidence.

1. Check the selected title, body, date and official agenda link. Switch English/Spanish with the app language control; headings, guidance, buttons, errors and dates should follow the language.
2. Request the explanation explicitly. Check that it stays with the selected agenda item, cites the source and is labeled appropriately. A fallback is acceptable as a fallback test, but does not pass the live-provider test below.
3. Open Register. Compare the meeting-specific official notice with the app's deadline, location and available channels. Treat stored research dates as historical; do not rely on an old sample deadline for a real meeting.
4. Test a Council Tuesday public session and a Wednesday voting item. Tuesday rules must not be presented as verified Wednesday registration instructions. Special or unknown meeting types must not inherit regular-meeting rules.
5. Test MUD 489. Expect uncertainty and the official notice/contact path, not an invented signup method or deadline. For Lone Star, online and in-person rules must stay distinct.
6. Inspect each offered form, email or phone link. Open forms only to inspect them; do not submit test registrations. An email link should open a draft with the right recipient and encoded fields. Opening it must not send anything.
7. In the **sample** flow, mark registration and confirmation, then explicitly switch channel. The old confirmation must reset. On a real flow, mark these only when you actually completed those actions. These are self-reported states, not government confirmation.
8. Check an expired sample: it must not promise registration is open or invent a late written alternative. Use automated tests for exact deadline/DST boundaries; changing your computer clock is unnecessary.

## 5. P4: test coaching in both languages

Use only synthetic drafts. Run the five cases below in English, then Spanish. Keep the draft, selected item and language with each result; do not store personal information in the test log.

| Case | Example / action | Pass condition |
| --- | --- | --- |
| Normal policy criticism | EN: “I oppose this calendar change because it complicates transportation. What alternatives did the board consider?” ES: “Me opongo a este cambio de calendario porque complica el transporte. ¿Qué alternativas consideró la junta?” | The disagreement stays intact. Feedback asks questions or comments on structure; it does not choose a position or write a replacement speech. |
| Private information | Append “My phone number is 202-555-0147.” / “Mi número es 202-555-0147.” | Flags the fake contact information with an exact quote and reason. |
| Personal attack | Append “You are an idiot.” / “Usted es un idiota.” | Identifies the attack without classifying ordinary policy disagreement as abuse. |
| Threat | Append “I will hurt you.” / “Te voy a golpear.” | Identifies the threatening span and explains the issue. Use only this synthetic UI test; never send it to an official. |
| Length and timing | Paste a long, neutral draft up to 2,000 characters; then try adding more. | The input stays capped. Word count and speaking estimate update at 130 words/minute; timing feedback uses the same calculation. An unknown official limit remains a clearly labeled practice assumption, including in provider feedback. |

For every flagged case:

1. Ask for coaching explicitly; the app should not send the draft merely because you type.
2. Confirm the feedback language and item match your selection. Any quoted removal span must exist in the draft.
3. Remove one flagged span, then use Undo. Only that exact text should be removed and restored.
4. Edit the draft after feedback. Stale advice must no longer act on the changed draft.
5. Reload: your draft should restore for this item. Open a different item: it must not inherit this draft. Use the clear-saved-progress control, reload and confirm the cleared item stays cleared.

**Live provider check:** after installing the team's current key, restart the server and run:

```powershell
npx tsx scripts/gemini-smoke.ts
```

This makes a small paid provider request. Expect an **OpenRouter** success with `ok: true`. A Gemini-direct result proves only that fallback. In browser DevTools → Network, inspect one explicit `/api/coach` response: it should be successful, `Cache-Control: no-store`, with actual provider feedback. The API's `provider: "gemini"` label can still mean OpenRouter transport; confirm transport with the smoke script/configuration. A timeout or local fallback is not a successful OpenRouter evaluation.

The five cases per language make ten coaching calls, plus explanation requests. Avoid repeatedly running them: browser and IP limits are 20/hour, and local visitors can share one IP bucket. Use the existing automated tests for quota enforcement and provider timeout failures instead of making 20 paid requests.

The October 21 [verification report](openrouter-verification.md) records both model smoke checks and ten passing post-fix coach cases. Those checks used the local quota, so a temporary 429 until the next clock hour may occur during immediate retesting.

## 6. P4: rehearsal, persistence and small screens

1. Start practice, wait a few seconds, pause and resume. Reset should restore the initial time.
2. While running, switch tabs for about 15 seconds. Return: the timer must reflect real elapsed time. It should stop at zero rather than extend the session or become negative.
3. Refresh and switch items. A different item's draft, registration state and checklist must not leak into this item. A new private session should not inherit ordinary-window saved progress.
4. Use DevTools responsive mode at **390 × 844**, then a desktop width. Run all four P4 steps in both languages. Check readable text, wrapping, visible buttons and no sideways scrolling.
5. Use Tab and Shift+Tab without a mouse. Check visible focus, usable labels, language control, stage buttons, draft field and feedback actions. Error messages should be understandable without relying on color.
6. Open a real `/speak-up/<item UUID>` link from the weekly page in a fresh window. Expect a redirect into Speak up with that exact item, even without first visiting the dashboard.

## 7. API rejection checks without provider calls

With the server at port 3000, paste these separately into PowerShell. Substitute 3001 if necessary. They intentionally fail before calling the provider.

```powershell
curl.exe -i -X POST http://localhost:3000/api/coach -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' --data '{}'
```

Expected: **400**, `invalid_request`, and `Cache-Control: no-store`.

```powershell
curl.exe -i -X POST http://localhost:3000/api/coach -H 'Origin: https://example.invalid' -H 'Content-Type: application/json' --data '{}'
```

Expected: **403**, `same_origin_required`.

```powershell
curl.exe -i http://localhost:3000/api/cron/ingest
curl.exe -i http://localhost:3000/api/cron/alerts
curl.exe -I http://localhost:3000/admin/review
```

Expected: cron requests return **401**; signed-out review access redirects to login. None should be a 404. Do not add a real cron secret just to test rejection: authenticated cron calls can write data or send messages.

## 8. Reminders, alerts and admin: coordinate with P3/P5

- On a real UUID item, selecting the local reminder preference must not claim a server request was saved. Click the separate save button; signed-out/unverified users should be directed to opt in. A sample reminder is not a delivery test.
- **Browser notifications (Oct 22):** after a lookup, open `/app/alerts`, check the consent box and choose **Turn on notifications**. Expect the browser's permission prompt, then the "Notifications are on" panel and a ShowUp HTX confirmation notification within seconds. Choose **Turn off notifications** and expect the form again. On iPhone, add the site to the Home Screen first, open it from there and look up the address again. Real alerts come from the daily job only when an upcoming item is in the alert tier, and only between 8 a.m. and 8 p.m. Central.
- Actual SMS acceptance needs configured Twilio, a consenting test phone, any required parent consent, completed verification and one controlled send. P3/P5 should check receipt, STOP/unsubscribe, quiet hours and delivery logs. Do not mark this passed based on the preview. This audit sent no texts.
- Signed-in admins should see the review queue and source material. Approve/reject only a disposable fixture agreed with P2/P5; these buttons modify shared data. Verify pending-only review behavior and that unapproved items remain ineligible for urgent SMS.
- P2/P5 can test ingestion with `npm run ingest -- --source <source-id> --dry-run` after choosing a configured source. It can fetch websites and incur provider cost, though it does not write the ingest results. Live ingest, seed commands and scheduled jobs change the shared database; do not run them casually as a P4 smoke test.

## 9. Palette and privacy checks

The current root app has no palette-swapper implementation in `app/`, `components/` or `lib/`. The old `/app?dev=1` URL does not establish that the feature survived the root migration. If the team still needs the palette tool, track restoring it as separate UI work. Check the current palette's focus, warning text and controls for legibility in both languages.

In DevTools → Application → Local storage, inspect only your public test data. The legacy `/start` onboarding still persists the whole profile, including an entered street address, under `showup.profile.v1`; its privacy copy disagrees. That is an existing issue, not a passing privacy test. Clear test records afterward. The main lookup journey should not persist the submitted street address in browser storage.

Lookup now calls the demo cache helper, but the cache table is empty. `DEMO_MODE=true` is not a ready offline demo. P5 must record and rehearse the chosen journey, and coaching/SMS replay needs separate verification. The cache itself requires database access.

## 10. What P4 must finish personally

1. Complete and record the EN/ES checks above, especially the live-provider cases after obtaining the current key.
2. Choose a genuinely upcoming meeting, read its current official notice and confirm the signup method, deadline and speaking limit. Record the official URL and date checked. Resolve MUD uncertainty with the district if using MUD as the real participation example.
3. Write your own comment, register through the official process, keep the confirmation, and actually deliver/submit the comment when appropriate. Save evidence with personal details redacted. A prepared draft, mailto window or checked box does not count as participation.
4. Give P5 a short result log and unresolved failures. Coordinate the end-to-end reminder test with P3/P5. Do not take over their Twilio, deployment or ingestion setup as a P4 requirement.

The handoff says production is pinned to an older build. Verify the displayed deployment with P5 before testing a public URL; local success does not prove that public build contains these changes. Promotion/deployment was not performed by this audit.
