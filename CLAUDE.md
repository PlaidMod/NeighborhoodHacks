# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

ShowUp HTX: a hackathon app (7-day build, 5-person team) for Houston-area residents. A user enters an address and sees every local government that affects them, what each one is deciding next, and how to speak up before the vote.

- `Project_Plan.md`: the product spec (features, users, demo flow, team split into parts P1–P5).
- `Technical_Implementation_Plan.md`: the target architecture (Supabase/PostGIS, Gemini, Twilio, next-intl), the DB schema (§16) and the shared contracts every part depends on: `Meeting`/`Item` types (§6), `bodies_token` (§3), `classify()` (§8).
- `web/`: the only code so far. It is a **front-end prototype with mock data and no backend**. There are no API routes, database, AI or SMS calls yet.

## Binding rules

@INSTRUCTIONS.md

## Handoff log (required)

Five teammates' agents work in this repo. At the start of a session, read the newest entries in `agent_handoff.md`. After you add, edit or delete anything, add an entry there before you finish or commit, using the template and rules at the top of that file. Flag any change to a shared contract.

## Commands

Run everything from `web/`:

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run lint         # must pass clean
npx tsc --noEmit     # must pass clean
npx shadcn@latest add <name>   # then restyle per DESIGN.md
```

`npm test` in `web/` runs the palette unit tests with Node's built-in runner (Node 22.18+ for native TypeScript loading). The tech plan's backend test layout (`tests/golden/...`, `tests/rules`, etc.) doesn't exist yet.

## Next.js 16 caveat

`web/AGENTS.md` says this Next.js version has breaking changes from what you may know. Read the relevant guide in `web/node_modules/next/dist/docs/` before writing Next-specific code, and heed deprecation notices. An example already in the code is the global `LayoutProps<"/">` type in `src/app/layout.tsx`. `next dev` rewrites the block in `AGENTS.md`; commit it rather than reverting it.

## Prototype architecture (`web/src`)

Everything is derived client-side from one `Jurisdiction` object:

1. **Lookup:** `findJurisdiction(address)` in `lib/data/zips.ts` pulls a `77xxx` ZIP (or matches an area name) against a hardcoded ZIP table. It is not real geocoding.
2. **Bodies:** `bodiesFor(jurisdiction)` in `lib/data/bodies.ts` assembles the governing bodies from `STATIC_BODIES`. MUDs are synthesized deterministically from IDs like `hc-mud-123` / `fbc-mud-45` (`mudBody()`), and `getBody()` routes any `-mud-` ID there.
3. **Updates:** `updatesFor(jurisdiction)` in `lib/data/updates.ts` runs one generator per body kind (the `MAKERS` map) plus election updates. Dates are computed relative to *now* (`at()`, `nextDow()`), so updates are only built on the client after mount.
4. **State:** `ProfileProvider` / `useProfile()` in `lib/profile.tsx` stores the profile in localStorage under `showup.profile.v1` and exposes `profile`, `jurisdiction`, `bodies` and `updates`. With no saved profile it falls back to `DEMO_PROFILE` (77004, student + renter). Personas filter and reword updates through `relevance()` and `whyFor()`.

Routes: `/` is the landing page and `/start` is onboarding. Everything under `/app/*` is wrapped in `AppShell` (sidebar, top bar, search), which also mounts `StoryProvider`; open an update's detail sheet with `useStory()`. The root layout mounts `ProfileProvider`, the toaster and `DevPalette`, a dev-only color picker that shows in `next dev` and turns on in prod with `?dev=1`.

Adding a body kind touches four places: `BodyKind` (`types.ts`), `KIND_STYLE` (`components/civic.tsx`), `KIND_LABEL` (`bodies.ts`) and a generator in `MAKERS` (`updates.ts`).

## Prototype vs. plan

The prototype came before revision 3 of the plans, and they differ in these places:

- Tier names are `urgent | digest | timeline` in code and `sms | weekly | timeline` in the plan.
- The code has a `voter` persona; the plan has no such persona.
- The code covers Fort Bend; the plan is Harris County only (county FIPS `48201`).
- The code has no ESD, METRO, regional water authority, HCAD, Port or HOA bodies.
- Routes are `/app/*`, not the plan's `app/(public)/...` layout.

Ask the user which side to follow before reconciling either one.

## Rules that are easy to break

Read `web/DESIGN.md` before any UI change; its §15 is the PR checklist. The rules most often broken:

- **Colors:** use tokens only. No hex values or `text-[#…]` for styling in components. The palette derives from four base variables in `globals.css` (`--brick`, `--surface`, `--denim`, `--ink`). Preset definitions live in `src/lib/palette.ts`; follow `DESIGN.md` for the preview tool and contrast checks.
- **Fonts:** Overpass everywhere. Playfair and Libre Franklin (`font-headline`, `font-news`) are allowed only on news surfaces.
- **"Now":** read it with `useNow()`, never `Date.now()` in render. The React compiler lint rule rejects impure render code.
- **Data:** keep it in `src/lib/data/`. Pages never hardcode meetings or bodies.
- **Home dashboard (`/app`):** it has a fixed three-row layout. New content replaces something; don't add panels.
- **Width:** layouts must work at 390px with no horizontal scroll.
- **Neutrality** (DESIGN.md §10, non-negotiable):
  - Never recommend a position.
  - Never invent officials' names or quotes.
  - Every update needs a source link and a persona "why it matters" line.
  - Keep "sample data" labels visible while data is mocked.
- **AI coach:** the coach never ghostwrites. Per the plan, its output schema has no field for replacement text, and any quote it returns must be an exact substring of the user's draft.
- **Privacy:**
  - Never persist a street address anywhere except the client profile.
  - When the backend is built: no addresses or comment drafts in the DB or logs, and `bodies_token` carries body IDs only.
  - The Supabase service-role key stays server-only, with RLS on every table and no `anon` policies.

Domain facts already settled (HISD's appointed board, who sets Flood Control and Port taxes, voter-registration age and others) are listed under "Facts fixed in earlier revisions" in `Project_Plan.md`. Check there before writing civic copy. All deadlines and meeting times use `America/Chicago`.
