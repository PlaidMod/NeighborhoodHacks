# primegov golden fixtures (Houston City Council)

Recorded 2026-10-19 (~00:30 Central) with read-only GETs (adapter User-Agent) to houstontx.primegov.com.

- `upcoming.json`: `GET /api/v2/PublicPortal/ListUpcomingMeetings`, unmodified (1 meeting: id 719, Oct 20 & 21, 2026).
- `archived-2026.json`: `GET /api/v2/PublicPortal/ListArchivedMeetings?year=2026`, unmodified (39 meetings,
  all committeeId 1; templates are only Agenda / HTML Agenda / Packet / HTML Packet, no minutes).
- `agenda-6914/source.txt`: `getPdfText()` output for `GET /Public/CompiledDocument/6914` (the "Agenda", PDF),
  pages joined with `\f`. The PDF is 4.7 MB (images), so it is **not committed**; see `meta.json` for its sha256.
  Its text is only 8 pages / ~20k characters, so the whole document is one LLM chunk (this is the
  "City Council PDF chunk" fixture moved here from Step 7).
- `agenda-6914/gemini_output.json`: **hand-written** to the Step 6 schema (no LLM key on Oct 19, 2026). It covers
  12 of the 43 numbered items; every `source_quote` is a substring of `source.txt`. Replace it with a recorded
  output once a key exists.

Notes: a HEAD on `/Public/CompiledDocument/{id}` redirects to `/Errors/NotFound`, but GET redirects to a signed
Azure blob URL and returns `application/pdf`. Archived sessions often carry the second day's `dateTime`
(e.g. 718 "October 13 & 14" has `2026-10-14T09:00:00`).
