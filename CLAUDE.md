# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

ShowUp HTX: a 5-person high school team's entry for Neighborhood Hacks 2026. A user enters a Houston-area address and sees every local government that affects them, what each one is deciding next, and how to speak up before the vote.

- **Deadline:** submissions close **Fri Oct 23, 2026, 11:59 PM CST**. There's no live demo. Judges see only the Devpost write-up, a 2–6 minute video and this public repo.
- **The spec is the two plan files, plus part specs in `.plans/`.**
  - `Project_Plan.md` covers what the product does and the team split (parts P1–P5).
  - `Technical_Implementation_Plan.md` covers how it's built: the stack (§1), the file layout (§2), the DB schema (§16), and the shared contracts every part depends on: `Meeting`/`Item` types (§6), `bodies_token` (§3), `classify()` (§8).
  - `.plans/agent-scraper-spec.md` (P2, v1.2) wins over the plan files for P2's work. Its §12 lists the changes other parts must know about: extended types, extra schema columns, `classify()` rules and more. That includes the news "might come up" box on body pages (D26), which the plan files now include too.
- **Don't change the plan files** unless a teammate asks for that specific change. If something conflicts with the plan, follow the plan and raise the conflict.
- **`web/` is a throwaway test prototype.** Don't build on it, study its architecture, or reconcile the plan with it. The only thing taken from it is its design system (see below). The plan's app is built at the repo root, using the §2 layout.

## Binding rules

@INSTRUCTIONS.md

When drafting the Devpost write-up, leave the AI-disclosure section for a teammate to write. The team decided to disclose AI use there; see `agent_handoff.md`.

## Plan stress test (once per teammate)

At the start of a session, check whether your teammate has done the plan stress test, using the rules at the top of `plan_stress_test.md`. If they haven't, run it before other work, unless they say to skip it or do it later. **Exception:** if you're running autonomously under a `.plans/` spec, don't stop for it. Note in that spec's progress log that the stress test is pending.

## Handoff log (required)

Five teammates' agents work in this repo. At the start of a session, read the newest entries in `agent_handoff.md`. After you add, edit or delete anything, add an entry there before you finish or commit, using the template and rules at the top of that file. Flag any change to a shared contract.

The owner's planning-review entry records the team's answers on scope, schedule and data sources. Where those answers differ from the plan files or a `.plans/` spec, the plan or spec wins.

## Commands

The plan's app doesn't exist yet. Add its build, lint and test commands here once it does. Until then, the only runnable code is the test prototype:

```bash
cd web && npm install && npm run dev   # test prototype only
cd web && npm test                     # palette unit tests (Node 22.18+, built-in runner)
```

## Next.js caveat

`web/AGENTS.md` warns that the current Next.js (16) has breaking changes compared with older versions. In the new app, read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code, and heed deprecation notices.

## Design system (the one thing carried over from `web/`)

The look and the content rules come from `web/DESIGN.md`; read it before UI work. Copy these into the new app:
- the color tokens: four base variables in `globals.css` (`--brick`, `--surface`, `--denim`, `--ink`), with every other shade derived from them, and the preset definitions in `web/src/lib/palette.ts`
- the fonts: Overpass everywhere; Playfair and Libre Franklin (`font-headline`, `font-news`) only on news surfaces
- the restyled shadcn components

Its page patterns (§8) describe prototype screens and don't apply.

## Rules that are easy to break

- **Colors:** tokens only. No hex values or `text-[#…]` for styling in components. Follow `DESIGN.md` for contrast checks.
- **Accessibility counts for 10% of the judging score.** Build in keyboard access, visible focus and 4.5:1 text contrast from the start (DESIGN.md §13). Layouts must work at 390px wide with no horizontal scroll.
- **Neutrality** (Project_Plan "Neutrality and labeling", DESIGN.md §10):
  - Never recommend a position.
  - Never invent officials' names or quotes.
  - Every story and item links to its source, and AI-written stories carry their label.
- **The AI coach never ghostwrites** (tech plan §14). Its output has no field for replacement text, and any quote it returns must be an exact substring of the user's draft.
- **Privacy** (tech plan §19; scraper spec §5.4):
  - No addresses or comment drafts in the DB or logs.
  - `bodies_token` carries body IDs only.
  - Personnel and closed-session items never store or show the private person's name ("an employee" instead).
  - The service-role key stays server-only, with RLS on every table and no `anon` policies.
- **Time:** all deadlines and meeting times use `America/Chicago`.

Domain facts already settled (HISD's appointed board, who sets Flood Control and Port taxes, voter-registration age and others) are under "Facts fixed in earlier revisions" in `Project_Plan.md`. Check there before writing civic copy.
