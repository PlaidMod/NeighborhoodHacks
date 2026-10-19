# Golden fixtures

Recorded public data that the unit tests (`npm test`) run against offline. Each folder has its own
README with details. All fixtures were recorded on Oct 19, 2026.

## Rules

- Fixtures stay under 1 MB. PDFs over 1 MB are never committed: store the `getPdfText()` output
  (`source.txt`) plus the PDF URL and sha256 in `meta.json` instead.
- Fixtures hold the original public record, including names in personnel items. Only the adapters'
  redacted output may leave these folders (spec §5.4).
- Never fetch BoardBook between 00:00 and 05:00 America/Chicago. Check the time with
  `node -e "console.log(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}))"`;
  Git Bash ignores `TZ`.
- After re-recording, regenerate the matching `expected*.json` and review the diff before committing.

## How to re-record

| Folder | Command |
| --- | --- |
| `legistar/` | `npx tsx scripts/record-legistar.ts` (then re-apply the 1242 trim below) |
| `legistar/hc_commissioners_court`, `legistar/hisd_board` | `npm run scrape -- --source <id> --record` |
| `boardbook/` | `curl` with the adapter User-Agent: `/Public/Organization/668` and `/Public/Agenda/668?meeting=<id>` (outside 00:00–05:00 Central) |
| `primegov/` | `curl` with the adapter User-Agent: `ListUpcomingMeetings`, `ListArchivedMeetings?year=2026`, `CompiledDocument/6914` → `getPdfText()` |
| `llm-extract/` (index pages, source text, meta) | `npx tsx scripts/record-llm-fixtures.ts [case dir, minutes dir, ...]` |
| `llm-extract/*/gemini_output.json`, `primegov/agenda-6914/gemini_output.json` | `npm run scrape -- --source <id> --record` with `GEMINI_API_KEY` in `.env.local` |
| `news/feeds/` | `npm run news -- --record` |
| `news-articles/pages`, `news-articles/robots` | fetched once with the bot UA (HPM only; see that README) |

## Trimmed fixtures

- `legistar/harriscountytx-1242/eventitems.json`: 1,921 rows (2.7 MB) trimmed to the first 1,019 rows
  in API order (977 KB), still more than one 1,000-row page. All Legistar `eventitems.json` files are
  compacted (null, `*Guid` and `*RowVersion` fields dropped).
- `llm-extract/` and `primegov/agenda-6914`: the PDFs (1.07–7.9 MB) are not committed; only their text.
- Everything else is complete and unmodified.

## Hand-written fixtures (not recorded)

There was no `GEMINI_API_KEY` during Phase 1, so **every LLM output is hand-written** to the schema.
Every `source_quote` was checked against the recorded text. Re-record these once a key exists:

- `llm-extract/*/gemini_output.json` (extraction): MUD 489 Oct 19 is complete (38 items); Lone Star Oct 1
  (12 items) and MUD 489 Apr 9 (7 items) are subsets.
- `llm-extract/minutes/*` outcome outputs (Step 10).
- `primegov/agenda-6914/gemini_output.json`: 12 of 43 items.
- `news-articles/links/*/gemini_output.json` and `article.txt` (Step 11c, 7 cases).

Also hand-made on purpose (test inputs, never re-recorded):

- `llm-extract/corrupted/*.json`: broken outputs that must be rejected.
- `llm-extract/scanned/image-only.pdf`: a PDF with no text layer.
- `news-articles/pages/handmade-paywall.html`, `news-articles/robots/handmade-*.txt`.
- The HISD comment-rules variants used by `tests/unit/health.test.ts` are edited in the test, not on disk.
