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
