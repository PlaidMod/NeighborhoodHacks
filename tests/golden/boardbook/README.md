# BoardBook golden fixtures (CFISD, org 668)

Saved with `curl` on 2026-10-19 at about 00:05 America/Chicago (see the Step 4 deviation in
`.plans/scraper-progress.md`: this was inside BoardBook's 00:00-05:00 maintenance window by mistake).

| File | Page |
| --- | --- |
| `listing.html` | `/Public/Organization/668` (58 meetings, 2024-2026) |
| `agenda-770676.html` | Oct 19, 2026 Regular Board Meeting |
| `agenda-767938.html` | Oct 8, 2026 Board Work Session (has a Minutes link and a video link on the listing) |

`expected-<id>.json` holds the meeting fields, item count, 5 spot checks and redacted titles.
All files are complete (none over 1 MB). They hold the original public record, including the
employee names in item 9.C; only the adapter's redacted output may leave this folder (spec §5.4).
