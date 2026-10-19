# Step 11c link fixtures

Seven cases for `lib/news/linkArticles.ts` (`tests/unit/news-link.test.ts`).

- `article.txt` is **hand-made** (no LLM key and no outlet article about these items existed on Oct 19, 2026).
  It names no person and quotes no one.
- `candidates.json` holds the article metadata plus the meetings and items the candidate list is built from:
  the 12 Lone Star Oct 1, 2026 items and one MUD 489 Oct 19 item (from `tests/golden/llm-extract/*/expected.json`).
  The MUD item must never become a candidate (body filter).
- `gemini_output.json` is a **hand-written** model output (structured-output schema `LinkOutputSchema`), not a recording.
  Replace with recorded outputs once a key exists.
- `expected.json` is the validated result: candidate ids, whether the LLM was called, surviving links,
  proposed/rejected counts and warnings.

Cases: one true link; unknown item id; fake quote; one changed word ("ad valorem" -> "sales"); passing mention;
article published after the only candidate meeting (no candidates, no call); prompt injection whose output links
all 14 ids. In the injection case 3 links survive: they quote the injected sentence verbatim (so the quote check
passes) and the 3-per-article cap stops the rest; unknown ids and the fake quote are rejected.
