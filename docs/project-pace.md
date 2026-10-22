# Project pace — October 21, 2026

**Assessment: the main software path is working; acceptance evidence and demo content are behind the seven-day plan.** Treat the remaining time as verification, content preparation and recording. Extra palettes, districts and new features should wait behind those tasks.

This is a comparison with `Project_Plan.md`'s seven-day schedule and `Technical_Implementation_Plan.md` §20, not a claim that every part has passed acceptance. See [readiness](readiness.md) for the observed technical state and [the testing checklist](testing-checklist.md) for reproduction steps.

## Deadline and deliverables

Checked the [official Devpost overview](https://neighborhood-hacks-2026.devpost.com/) on October 21. It lists **October 24, 2026 at 12:00 AM CDT**, immediately after Friday October 23. Use Friday October 23 at 11:59 PM **Houston daylight time** as the last submission minute. The `CST` label in the older repository guidance is inaccurate for that date; do not budget an extra hour.

Devpost requires a problem/evidence explanation, a working-project video of 2–6 minutes and a public repository. The real comment and 15–20-person quiz are the team's own planned evidence goals; they are not stated Devpost minimum sample sizes. This document does not draft the submission or its disclosure response.

## Current position against the plan

| Area | Observed position | Remaining acceptance |
| --- | --- | --- |
| P1 lookup | HCAD/Census lookup and the two public demo addresses work; 142,406 parcels loaded. | Twenty-address/HOA verification evidence was not found in this audit. `tax_rates` is empty: the planned real-dollar receipt cannot yet be demonstrated honestly. ESDs/WCIDs are listed as untracked. |
| P2 agendas | Ingest route, schedule, review queue and 646 stored items exist. | Authenticated review and scheduled production execution were not tested here. Zero pending review rows does not prove that all extraction results were reviewed. |
| P3 content/SMS | Ten items have English stories; 636 items still have `needs_story=true`; zero coverage blocks. SMS code exists. | Prepare a specific upcoming lead and the planned real item with coverage from two outlets. Twilio is absent locally; actual delivery/STOP/quiet-hour acceptance requires P3/P5 evidence. **Oct 22:** Twilio dropped (ID verification declined); alerts now go out as browser notifications, verified locally. |
| P4 Speak up | All four stages exist; shared OpenRouter calls succeed. Live content review exposed assumed practice minutes being described as an official limit; the fix preserves verification metadata and computes timing feedback in code. All ten EN/ES cases passed the [post-fix provider recheck](openrouter-verification.md). | Recheck current meeting rules, resolve MUD participation uncertainty if using that body, and collect authentic comment evidence. Automated coverage does not replace meeting-specific verification. |
| P5 evidence/demo | Root build and address-to-Speak journey work. `quiz_responses` now has one row; `demo_cache` has zero. | One row does not establish a genuine participant or meet the planned 15–20-person target. No submitted-comment proof or finished video was found in the reviewed docs. Owner confirmation is needed for evidence held outside the repo. Rehearse the deployed build and prepare a dependable demo path. |

## What to finish in order

1. **Today, October 21 — P4 with P5:** settle the real participation route immediately. The earlier CFISD October 19 and Council October 20 opportunities have passed. The [HISD calendar](https://houstonisd.legistar.com/Calendar.aspx) currently lists October 22 at 5 PM as **Hearings**, with eComment unavailable; its accessible agenda fetch returned 410. This is not a verified general-comment opportunity. Inspect the actual proceeding and contact Board Services if needed before claiming registration rules apply. A written comment is an option only where that body actually accepts it; retain receipt/delivery evidence and describe it accurately.
2. **Today — P5 with participants:** start the planned classmate sessions using the working lookup. Record real counts and denominators. Keep rehearsals/test rows separate from participant evidence. P4 should help test the Speak up journey and provide verified meeting instructions.
3. **Today — P1/P3/P5:** finish the chosen demo content: real tax-rate/turnout data for the two addresses if retaining the receipt, an upcoming lead story, and one verified coverage example. Do not spend time generating every old story before the demo's upcoming item.
4. **October 22 — each owner, coordinated by P5:** run the full checklist, fix material failures, verify an approved current deployment and rehearse the exact recorded journey. Test actual SMS only with a consenting phone and configured service; otherwise show a clearly labeled preview. (Oct 22: texting stays a preview; show a real browser notification instead.) Resolve the legacy address-storage privacy mismatch before public use.
5. **October 23, well before midnight — P5 with the team:** record the 2–6 minute video, check the public repository and complete the Devpost submission. Explain incomplete features and measured evidence accurately. Use an internal earlier submission target so upload/edit time is available.

For **P4 personally**, the priority is the current participation opportunity, documented EN/ES coaching results and one full mobile rehearsal. Twilio setup, bulk HCAD loading and deployment promotion remain their owners' tasks. There is a viable route to a scoped submission, but the full original demo is not yet acceptance-ready.
