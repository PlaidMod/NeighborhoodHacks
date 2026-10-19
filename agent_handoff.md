# Agent handoff log

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

### 2026-10-18: Plan revision 5: news "might come up" box (settled Iarush's way)
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:**
  - **The news box:** for this one conflict, the owner sided with Iarush. P2's scraper spec (§12.12, D26) asked for the plan lines saying news is never a data source to change, so the plan files now say: news shows headline links on body pages labeled "may come up at a future meeting," and never feeds items, alerts or stories. The "In the news" box moved from stretch goals to the body pages. This is a one-time call, not a general rule that Iarush's documents override the owner's answers.
  - **Stress test:** it no longer interrupts agents running autonomously under a `.plans/` spec. They note it as pending and ask at the next interactive session.
- **Files:** `Project_Plan.md`, `Technical_Implementation_Plan.md` (§6), `CLAUDE.md`, `AGENTS.md`, `web/AGENTS.md`, `plan_stress_test.md`, `agent_handoff.md`
- **Contract changes:** None. The news box's display contract is in the scraper spec's Step 11 (P1 renders it on body pages).
- **Checked:** Docs only. The scraper spec was not touched.
- **Open issues / next:** P5's privacy and terms pages should mention third-party news headlines and links (scraper spec §12.14).

### 2026-10-18: Added the plan stress test for every teammate
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** Added `plan_stress_test.md`: the questions from the owner's planning review, rewritten so each teammate's agent asks its own teammate once and records the answers here, with the owner's answers alongside for comparison. Added a root `AGENTS.md` so Codex, Cursor and other agents started at the root find the rules. `CLAUDE.md` and `web/AGENTS.md` now point to the stress test too.
- **Merged with teammates' pushes:**
  - BluePhoenix79's `CLAUDE.md` changes are kept: four palette bases including `--ink`, presets in `palette.ts`, and `npm test`.
  - Iarush's `.plans/agent-scraper-spec.md` (v1.2) is now treated as the authority for P2 in `CLAUDE.md`, `AGENTS.md` and the stress test (Q11, Q12, Q15, Q16).
- **Files:** `plan_stress_test.md`, `AGENTS.md`, `CLAUDE.md`, `web/AGENTS.md`, `agent_handoff.md`
- **Contract changes:** None
- **Checked:** Docs only; no code changed. The plan files and the scraper spec were not touched.
- **Open issues / next:**
  - Each teammate's agent should run the stress test at its next session. PlaidMod is already marked done.
  - BluePhoenix79 has been building in `web/`, but the owner says `web/` is test-only. Worth a direct conversation.
  - The scraper spec's §12.12 asks for three plan lines to change (the news "might come up" box), but the owner says not to change the plan files. The team needs to settle this.

### 2026-10-18: Planning review: owner's instructions, research, answers (plan files not changed)
- **Who:** PlaidMod · P5 Platform, Evidence and Pitch
- **Branch:** main
- **What changed:** Went through the plan question by question, backed by research. Only this log, `CLAUDE.md` and `web/AGENTS.md` changed. The plan files were deliberately left as they are. **Where anything below differs from the plan (including part specs in `.plans/`), the plan wins until the team updates it.** This entry is longer than usual because the owner asked for everything to be recorded here.
- **Owner's standing instructions (apply to every agent):**
  - Follow `INSTRUCTIONS.md` no matter what. It stays unchanged.
  - The website in `web/` was only for testing. Don't build on it; follow the implementation plan. This settles the revision 4 Day 1 "prototype vs. plan" item. It also makes the tech plan's §17 table of prototype screens moot.
  - Don't change `Project_Plan.md` or `Technical_Implementation_Plan.md` unless asked.
  - Gemini's 18+ terms: the team has this handled. Don't raise it.
- **Research facts (checked Oct 18):**
  - **Hackathon:** Neighborhood Hacks 2026 is online and for high schoolers. Teams of up to 5; each member registers on Devpost.
    - **Submissions close Fri Oct 23, 11:59 PM CST.** There's no live demo: judges see the Devpost write-up, a 2–6 min video and the public repo.
    - The write-up must answer "What is the specific problem, and how do you know it's real?"
    - Rubric: Community Relevance 25%, Impact 20%, Technical 20%, Creativity 15%, Presentation 10%, Accessibility 10%.
    - Rules §4: AI tools must be disclosed in the written description. §9: misrepresenting AI use can disqualify. https://neighborhoodhacks.org/rules/
  - **Twilio:** a trial account can send only preset templates, not custom alert text. Real alerts need a paid account plus Sole Proprietor 10DLC registration, which needs a real US mobile number, an address, and privacy and terms URLs. Campaign review can take several days. Twilio Verify works on a trial (verified numbers only).
  - **Vercel Hobby:** cron runs at most once a day, within ±59 min of the set time. Functions max out at 300 s.
  - **Gemini:** Google may use free-tier content and have humans review it; the paid tier doesn't. Current models are `gemini-3.8-flash` and `gemini-3.5-flash-lite`. Structured JSON output is supported.
  - **Legistar:** `harriscountytx` and `houstonisd` both work without a token. HISD's data is complete. Commissioners Court's is missing upcoming meetings (Oct 29, Nov 12).
  - **Meetings before the deadline:**
    - CFISD, Mon Oct 19, 6 PM (sign up by noon Oct 19).
    - City Council, Tue Oct 20, 2 PM (sign up by 3 PM Oct 19).
    - HISD, Thu Oct 22, 5 PM. Its agenda is only five teacher employment hearings, so it's not suitable for the real comment.
    - **City Council's Tue Oct 27, 5 PM session already takes sign-ups on its online form, on any topic.**
    - Commissioners Court (Oct 29), HCC (Oct 28) and Lone Star (Nov 5) are all after the deadline.
- **Answers the owner agreed to (team notes; not in the plan):**
  1. The owner is P5. The name is ShowUp HTX.
  2. "Done" means the demo flow works end to end for the two demo addresses, plus the evidence. **After the demo flow works:**
     - the other four registration recipes
     - reminders 7a/7b and the protest reminder
     - the timeline
     - the "Why did I get this text?" page
     - health checks and the 45-day recheck
     - HISD Spanish agenda linking
     - the HOA top-50 list
     - Spanish coach tests
     - Port, METRO and water authority stories
  3. No classmate survey until the real lookup (Census + HCAD) works.
  4. The paid Gemini tier is owned by an adult (an 18+ teammate or a parent), along with any paid Twilio account.
  5. The Devpost write-up discloses AI use, and a teammate writes that section. This is the owner's answer to `INSTRUCTIONS.md`'s stop-and-ask rule.
  6. Schedule to the real deadline:
     - Mon: setup and checks.
     - Tue–Wed: build.
     - Thu: freeze at noon, fix bugs, record the video.
     - Fri: write-up; submit by 6 PM CST.
  7. A ~4 min video replaces the pitch slides and the backup video.
  8. All five teammates must be eligible and registered on Devpost. Confirm.
  9. Speak up may fill in only a factual opener (name, who you are, area, item). The user writes their position, experience, ask and closing.
  10. Build the new app at the repo root using the tech plan's §2 layout. Leave `web/` untouched, and delete it before submission once sohankamsala agrees.
  11. Carry over only the prototype's design system: `DESIGN.md`, color tokens, fonts and the shadcn components.
  12. Stay on Vercel Hobby, and trigger jobs by hand with `CRON_SECRET`.
  13. Use one model everywhere: `gemini-3.8-flash`.
  14. **Agenda data:**
      - Legistar for HISD.
      - Gemini extraction for the demo MUD.
      - Manual entry for everything else.
      - Skip PrimeGov.
      - Review items by flipping `review_status` in Supabase's table editor.
  15. **Real comment:** not HISD on Oct 22 (personnel hearings). Skip CFISD on Mon Oct 19 unless a CFISD teammate already has a topic.
- **Still open (owner unsure):**
  - Paid Twilio with Sole Proprietor registration, falling back to a labeled "preview" mockup.
  - Classmate survey Wed evening to Thu noon, with at least 10 people.
  - A teammate registering with the app for City Council on Oct 27, then speaking.
- **Files:** `agent_handoff.md`, `CLAUDE.md`, `web/AGENTS.md`
- **Contract changes:** None.
- **Checked:** Docs only; no code changed. Research came from web sources and read-only API calls; nothing was registered or submitted.
- **Open issues / next:**
  - Revision 4 of the plan still lists "prototype vs. plan" as an open Day 1 item, and §17 still has the prototype-screen table. Both are settled or moot per the owner, but the plan text wasn't edited.
  - Iarush's `.plans/agent-scraper-spec.md` (v1.2) was pushed during this review and wins for P2. It replaces answer 14 (agenda data), the P2 parts of answers 2, 12 and 13, and the "Skip PrimeGov" line. Under the spec:
    - Sources: Legistar for Commissioners Court and HISD, BoardBook for CFISD, PrimeGov plus Gemini for City Council, Gemini for Lone Star and HC MUD 489, and YAML manual entry.
    - Scheduling: GitHub Actions every 30 minutes, with a daily Vercel backup.
    - Model: Flash, retrying on Pro when validation drops too many items.
    - Health checks and results-from-minutes are built in Phase 1.

### 2026-10-18: UI polish and palette studio
- **Who:** BluePhoenix79 · UI/platform (part not assigned)
- **Branch:** main
- **What changed:** Improved dashboard hierarchy and phone layouts, widened news tiles at intermediate sizes, and added motion/focus polish. Expanded the existing dev picker into a six-preset palette studio with four editable tokens, validated saved colors, core contrast checks, CSS export and reset.
- **Files:** `web/src/app/`, shared UI components, `web/src/lib/palette.ts`, `web/tests/palette.test.mjs`, `web/DESIGN.md`, `web/docs/ui/`, `web/package.json`, `CLAUDE.md`
- **Contract changes:** None to schema, Meeting/Item, bodies_token, classify, or data/types.ts. Design tokens now allow ink as a fourth editable palette base.
- **Checked:** Pulled through `839e4a5` with autostash; no conflicts. `npm test` (5 passed), `npm run lint` and `npx tsc --noEmit` passed after pulling. Desktop palette/preset and Escape checked; phone dashboard and Brief inspected. Screenshots and detailed verification limits are in `web/docs/ui/README.md`.
- **Open issues / next:** Production builds previously failed on Google Fonts access and a CSS worker startup error. Browser persistence/clipboard checks remain unverified because approval tools timed out. Prototype/plan reconciliation remains open; scraper spec v1.2 overrides several parent-plan details and is not implemented by this UI change.

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
