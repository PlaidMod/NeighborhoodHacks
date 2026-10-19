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
- **Hosting and data:**
  - **Vercel:** project `showup-htx` on the `majority-illusion` team. Production is https://showup-htx-six.vercel.app. Pushes to `main` deploy, but deploys of teammates' commits wait for the owner's approval, because the repo is private.
  - **Supabase:** project `showup-htx` (ID `elsvhqqwdxwsuvkbchdq`). Environment values live in `.env.local` (see `.env.example`) and in Vercel. Never commit them.

## Binding rules

@INSTRUCTIONS.md

When drafting the Devpost write-up, leave the AI-disclosure section for a teammate to write. The team decided to disclose AI use there; see `agent_handoff.md`.

## Plan stress test (once per teammate)

At the start of a session, check whether your teammate has done the plan stress test, using the rules at the top of `plan_stress_test.md`. If they haven't, run it before other work, unless they say to skip it or do it later. **Exception:** if you're running autonomously under a `.plans/` spec, don't stop for it. Note in that spec's progress log that the stress test is pending.

## Handoff log (required)

Five teammates' agents work in this repo. At the start of a session, read the newest entries in `agent_handoff.md`. After you add, edit or delete anything, add an entry there before you finish or commit, using the template and rules at the top of that file. Flag any change to a shared contract.

The owner's planning-review entry records the team's answers on scope, schedule and data sources. Where those answers differ from the plan files or a `.plans/` spec, the plan or spec wins.

## Commands

Run these from the repo root (Node 22 or later):

```bash
npm install
npm run dev                                 # http://localhost:3000
npm run build
npm run typecheck                           # next typegen, then tsc --noEmit
npm run lint                                # eslint . (next lint no longer exists)
npm test                                    # vitest; unit tests can't reach the network
npx vitest run tests/platform/tokens.test.ts   # run one test file
npm run test:live                           # tests/live/: real sites and Gemini (vitest.live.config.ts)
npm run scrape -- --source <id>             # P2 scraper; sources in data/sources.yaml, output in tmp/scrape
npm run news -- --out tmp/news              # P2 news collector (add --articles to fetch article text)
```

- `npm test` runs `tests/**/*.test.ts` (P5's `tests/platform/`, P2's `tests/unit/`) in UTC with `fetch` blocked (`tests/setup/no-network.ts`). Tests that need the network go in `tests/live/` and run with `npm run test:live`.
- P2's code is `lib/adapters/`, `lib/ingest/`, `lib/news/`, `data/` and `tests/golden/`. ESLint stops `lib/adapters` and `lib/ingest` from importing `lib/news` (D26, D32).
- npm 11 holds back packages' install scripts until approved. Nothing in the app needs them so far.
- `web/` is the old test prototype, with its own `package.json` (`cd web && npm install && npm run dev`). The root's TypeScript, ESLint, vitest and Tailwind all ignore it.

## Next.js caveat

Next.js 16 has breaking changes compared with older versions: `middleware.ts` is now `proxy.ts`, `cookies()` and `headers()` must be awaited, and `next lint` is gone. Before writing Next-specific code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices. `next dev` keeps a Next.js rules block in `AGENTS.md`; commit it rather than removing it.

## Design system

The look and the content rules are in the root `DESIGN.md`. Read it before UI work, including its note on which sections are prototype-only. What's already in the app:
- **Color tokens** in `app/globals.css`. There are four base variables (`--brick`, `--surface`, `--denim`, `--ink`), and every other shade is derived from them. `tests/platform/contrast.test.ts` fails if a change drops the main text pairs below 4.5:1.
- **Fonts** in `app/layout.tsx`: Overpass everywhere; Playfair and Libre Franklin (`font-headline`, `font-news`) only on news surfaces.
- **shadcn components** in `components/ui/` (pill buttons, 24px cards, 44px pill inputs). Add more with `npx shadcn@latest add <name>`, then restyle them to match.
- **Shared pieces** in `components/civic.tsx`: `Panel`, `SectionTitle`, `Chip`, `ArrowCircle`, `Logo`, `BodyIcon` (keyed by `BodyType` from `lib/contracts/bodyTypes.ts`) and `TierPill` (shows "Urgent" for `sms` only).

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
