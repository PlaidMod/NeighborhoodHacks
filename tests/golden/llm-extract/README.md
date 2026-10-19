# llm_extract golden fixtures

Recorded 2026-10-19 with `npx tsx scripts/record-llm-fixtures.ts` (read-only GETs).

- `discovery/lonestar-index.html`, `discovery/mud489-index.html`: the two index pages, unmodified.
- `<case>/source.txt`: the PDF text from `getPdfText()` (unpdf), pages joined with `\f`.
- `<case>/meta.json`: PDF URL, sha256, size, page count and text-layer stats. All three PDFs are over
  1 MB (Lone Star 7.9 MB, MUD 489 1.07 MB and 1.12 MB), so the PDFs themselves are not committed.
- `scanned/image-only.pdf`: a hand-made 2-page PDF with only an image (no text layer), for D6 detection.

All three real agendas have a usable text layer (MUD 489 PDFs carry an OCR layer).

## Extraction outputs (Steps 6-7)

- `<case>/gemini_output.json` files are **hand-written** to the Step 6 schema, not recorded: there was
  no `GEMINI_API_KEY` on Oct 19, 2026. Every `source_quote` was checked against `source.txt`.
  MUD 489 Oct 19 is complete (38 items); Lone Star Oct 1 (12 items) and MUD 489 Apr 9 (7 items) are subsets.
  Replace them with recorded outputs once a key exists (`npm run scrape -- --source <id> --record`),
  then regenerate `expected.json`.
- `<case>/expected.json`: the validated, mapped result for that output with the frozen clock in `fixtures.ts`.
- `corrupted/`: five deliberately broken outputs for the Oct 19 MUD 489 text (fake quote, a quote with one
  changed number, an out-of-window date, an empty title, a description with an invented dollar figure).
  All five must be rejected (`tests/unit/llmExtract.test.ts`).

## Results from minutes (Step 10)

Recorded 2026-10-19 with `npx tsx scripts/record-llm-fixtures.ts mud489-2026-07-20 minutes/mud489-2026-07-20 mud489-2026-05-19 minutes/mud489-2026-05-18`.
No PDFs are committed (text + sha256 in `meta.json`).

- `mud489-2026-07-20/`: the July 20 `NOTICE_OF_PUBLIC_MEETING_AGENDA` text and a **hand-written** extraction of all 21
  numbered items. The OCR layer is in column order, so the item numbers were assigned from the agenda's printed order;
  every quote is in `source.txt`.
- `minutes/mud489-2026-07-20/`: `Minutes_July_20_2026_Approved` text and a hand-written `outcomes_output.json`
  (13 outcomes, quotes copied from the minutes; includes two `tabled` and three `no_action`).
- `mud489-2026-05-19/` + `minutes/mud489-2026-05-18/`: the May pair whose filenames differ by a day (agenda 19th,
  minutes 18th; the agenda text itself says May 18). 3 known items and 3 outcomes, for the ±2 day tolerance.
- `minutes/corrupted/fake-quote.json` (quote not in the minutes, must be rejected) and
  `minutes/corrupted/nonexistent-item.json` (real quote, but no agenda item matches; must not create an item).
