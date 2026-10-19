# Agent han### 2026-10-19: P2 scraper step 0: root TypeScript project setup
- **Who:** Iarush · P2 Agenda Data
- **Branch:** scrapper
- **What changed:** Added a root Node/TypeScript project for the standalone scraper library (separate from `web/`): package.json scripts, strict tsconfig, vitest, eslint, `.env.example`, `.gitignore`, and the progress log `.plans/scraper-progress.md`.
- **Files:** `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.live.config.ts`, `eslint.config.js`, `.env.example`, `.gitignore`, `.plans/scraper-progress.md`, `tests/unit/setup.test.ts`
- **Contract changes:** None
- **Checked:** npm run typecheck, npm run lint, npm test (1 passed)
- **Open issues / next:** P5 must merge root deps into the Next.js package.json later. Root configs exclude `web/`.

doff log

A shared log of changes made in this repo, so the next teammate or agent can catch up without reading every diff. Entries follow `INSTRUCTIONS.md`: record the teammate, never the agent or model.

## Rules for agents

1. **At the start of a session,** read the newest 3–5 entries below, plus any entry that touches the files you're about to change.
2. **After you add, edit or delete anything in the repo,** add one entry before you finish the task or commit. One entry per task, not per file.
3. **Put new entries at the top,** directly under "Entries." Never edit or delete someone else's entry. If an older entry is now wrong, say so in your new entry.
4. **Keep it short.** Aim for under 15 lines, and write for a teammate who hasn't seen the code.
5. **Flag shared-contract changes** in the "Contract changes" line. Other parts are built against these, so a silent change breaks them:
   - DB schema (Technical_Implementation_Plan.md §16)
   - `Meeting` and `Item` types (§6)
   - `bodies_token` format (§3)
   - the `classify()` signature (§8)
   - types in `web/src/lib/data/types.ts`
6. **On a merge conflict in this file,** keep both entries, newest first.

## Entry template

```markdown
### YYYY-MM-DD: <short title>
- **Who:** <teammate> · <part, e.g. P3 News and Alerts>
- **Branch:** <branch>
- **What changed:** <1–3 sentences on what and why>
- **Files:** <main files or folders touched>
- **Contract changes:** None | <what changed and who it affects>
- **Checked:** <e.g. npm run lint, npx tsc --noEmit, manual check at 390px; or "not run" and why>
- **Open issues / next:** <anything unfinished, broken, or for the next person>
```

---

## Entries

### 2026-10-19: Plan revision 5: news coverage perspectives
- **Who:** Iarush · part not set yet
- **Branch:** main
- **What changed:** Added a core feature, a "What news coverage says" block on weekly stories. It shows the viewpoints Houston outlets report on an agenda decision, grouped by stakeholder, each with a summary, an exact quote and a source link, plus a one-sided note. P2 now fetches article text from outlets with no paywall (stored admin-only, deleted after 90 days) and uses Gemini to match articles to items. P3 extracts viewpoints, runs code checks and a separate Gemini judge pass, and renders the block. News still never feeds items, classify, alerts, the review queue or story text; its only other effect is a weekly sort tie-breaker by outlet count.
- **Files:** `.plans/news-coverage-perspectives-spec.md` (new), `.plans/agent-scraper-spec.md` (v1.3: D27–D35, Steps 11b and 11c, P2-A, §10, §12), `Project_Plan.md`, `Technical_Implementation_Plan.md` (§1, §2, §6, new §9a, §10, §16, §19–§22)
- **Contract changes:** DB schema §16 gains `news_articles`, `news_article_items` (P2) and `item_perspectives` (P3), plus the existing D26 news tables. No news columns on `items`. The new env var `GEMINI_JUDGE_MODEL` affects P5. `Meeting`, `Item`, `bodies_token` and `classify()` are unchanged. The weekly sort order (§10) gains a last tie-break key, which affects P3.
- **Checked:** Docs only; no code changed.
- **Open issues / next:** TV station RSS feeds verified working on Oct 19 (KHOU, KPRC, ABC13, FOX 26). HPM, Community Impact and ABC13 block `Google-Extended` (Gemini) in robots.txt, and Click2Houston and FOX 26 block other AI crawlers. The owner chose the literal reading (scraper D36): obey only the `*` group or our own bot's group, so every outlet is fetched. P5 should prepare a pitch answer (scraper spec §12, item 22). Outlet terms of use are still unchecked, and Houston Landing still fails TLS. P5 needs to confirm the Gemini budget. P4's watchlist must find a real demo item with 2+ outlets covering it. Article storage is a copyright exposure the team accepted; recheck the outlets' terms.

### 2026-10-18: Plan revision 4: rebalanced P5
- **Who:** PlaidMod · part not set yet
- **Branch:** main
- **What changed:** P5's Day 1 was overloaded, and every other part waits on it. Moved meeting calendar checks and the news watchlist to P4, Twilio registration to P3, and demo address picking to P1. Each part now converts its own screens' text for English/Spanish, and P5 only sets up the system. P5 does the database schema first on Day 1. Added a timing-risk note for the real public comment and a Day 1 "Everyone" decision on where the prototype and the plan disagree.
- **Files:** `Project_Plan.md`, `Technical_Implementation_Plan.md` (§11, §17, §22)
- **Contract changes:** None. Ownership and schedule only; no schema, type or token changes.
- **Checked:** Docs only; no code changed.
- **Open issues / next:** P1, P3 and P4 each picked up a Day 1 task; check that your Day 1 still fits. The prototype vs. plan decision is still open.

### 2026-10-18: Added INSTRUCTIONS.md (binding agent rules)
- **Who:** PlaidMod · part not set yet
- **Branch:** main
- **What changed:** Added `INSTRUCTIONS.md`, adapted from the owner's existing agent rules: no AI attribution anywhere (commits, PRs, docs, handoff entries), plus rules for when to commit or push. Removed the NASA-specific parts. `CLAUDE.md` now imports it and `web/AGENTS.md` points to it. Removed the "agent and model" field from this log's template to match.
- **Files:** `INSTRUCTIONS.md`, `CLAUDE.md`, `web/AGENTS.md`, `agent_handoff.md`
- **Contract changes:** None
- **Checked:** Docs only; no code changed.
- **Open issues / next:** If the hackathon's submission rules ask about AI use, that conflicts with `INSTRUCTIONS.md` §1. Agents must stop and ask rather than fill it in.

### 2026-10-18: Added agent guidance and this handoff log
- **Who:** PlaidMod · part not set yet
- **Branch:** main
- **What changed:** Added `CLAUDE.md` with commands, how the prototype is built, where it differs from the plans, and the design and neutrality rules. Added this log, and a rule in `CLAUDE.md` and `web/AGENTS.md` telling every agent to write an entry here.
- **Files:** `CLAUDE.md`, `agent_handoff.md`, `web/AGENTS.md`
- **Contract changes:** None
- **Checked:** Docs only; no code changed.
- **Open issues / next:** The prototype and Project_Plan rev 3 disagree on tier names, personas, county coverage, body list and route layout (see `CLAUDE.md`, "Prototype vs. plan"). The team needs to decide which side wins.
