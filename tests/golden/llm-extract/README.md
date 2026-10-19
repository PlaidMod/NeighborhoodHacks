# llm_extract golden fixtures

Recorded 2026-10-19 with `npx tsx scripts/record-llm-fixtures.ts` (read-only GETs).

- `discovery/lonestar-index.html`, `discovery/mud489-index.html`: the two index pages, unmodified.
- `<case>/source.txt`: the PDF text from `getPdfText()` (unpdf), pages joined with `\f`.
- `<case>/meta.json`: PDF URL, sha256, size, page count and text-layer stats. All three PDFs are over
  1 MB (Lone Star 7.9 MB, MUD 489 1.07 MB and 1.12 MB), so the PDFs themselves are not committed.
- `scanned/image-only.pdf`: a hand-made 2-page PDF with only an image (no text layer), for D6 detection.

All three real agendas have a usable text layer (MUD 489 PDFs carry an OCR layer).
