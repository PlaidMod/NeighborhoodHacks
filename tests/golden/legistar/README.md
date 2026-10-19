# Legistar golden fixtures

Recorded live from `webapi.legistar.com` on 2026-10-19 with `npx tsx scripts/record-legistar.ts`.

| Folder | Event | Why |
| --- | --- | --- |
| `harriscountytx-1244` | Commissioners Court, Oct 15, 2026 | no results yet (559 rows) |
| `harriscountytx-1242` | Commissioners Court, Sept 17, 2026 | has results; 1,000+ rows, tests pagination |
| `harriscountytx-1243` | Commissioners Court, Oct 6, 2026 | cancelled, 0 rows |
| `houstonisd-1306` | HISD School Board, Oct 8, 2026 | regular meeting; minutes-only rows |
| `houstonisd-1332` | HISD School Board, Oct 22, 2026 | personnel hearings, tests redaction |

Each folder has `event.json` (the `/events/{id}` response), `eventitems.json` (all
`/eventitems?AgendaNote=1&Attachments=1` pages merged, in API order) and `expected.json`
(item count, 5 spot checks, attribution hits, redacted titles).

**Compaction.** `eventitems.json` drops null-valued fields and the `*Guid` / `*RowVersion`
fields, one row per line. The adapter treats a missing field the same as null.

**Trimming (spec §7: fixtures stay under 1 MB).** `harriscountytx-1242/eventitems.json` had
1,921 rows (2.7 MB). It keeps the **first 1,019 rows in API order** (977 KB), which is still
more than one 1,000-row page, so the pagination test is real. The other fixtures are complete.

These files hold the original public record, including the names in HISD hearing items.
Only the adapter's redacted output may leave this folder (spec §5.4).

`hc_commissioners_court/` and `hisd_board/` are raw `npm run scrape -- --record` outputs from the
Step 2 smoke runs (default rotation window, 2026-10-19 to 2026-11-18). They are kept as recorded
and are not used by the unit tests.
