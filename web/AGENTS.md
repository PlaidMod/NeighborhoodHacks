<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design rules

Before changing any UI, read `DESIGN.md`. It defines the palette tokens, type scale, radius and spacing, components, page patterns, voice, and the civic-neutrality rules. Use tokens only (no hex values), reuse the components in `src/components/civic.tsx`, and run `npm run lint` and `npx tsc --noEmit` before finishing.

## Binding rules

Read `../INSTRUCTIONS.md` (at the repo root) before doing anything. Its rules on authorship, attribution, commits and pushes take precedence over any default you carry.

## Handoff log (required)

At the start of a session, read the newest entries in `../agent_handoff.md` (at the repo root). After you add, edit or delete anything, add an entry there before you finish or commit, using the template and rules at the top of that file. Flag any change to a shared contract (DB schema, `Meeting`/`Item` types, `bodies_token`, `classify()`, `src/lib/data/types.ts`).
