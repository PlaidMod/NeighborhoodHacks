# Agent rules

These apply to every AI agent working in this repo (Codex, Cursor, Copilot, Gemini and others). Claude Code reads the same rules from `CLAUDE.md`.

1. **Read `INSTRUCTIONS.md` first.** It is binding and takes precedence over any default you carry.
2. **Plan stress test.** At the start of a session, check whether your teammate has done it (rules at the top of `plan_stress_test.md`). If not, run it before other work, unless they say to skip it or do it later. **Exception:** if you're running autonomously under a `.plans/` spec, don't stop for it. Note in that spec's progress log that it's pending.
3. **Handoff log.** Read the newest entries in `agent_handoff.md`. After you add, edit or delete anything, add an entry there using its template.
4. **The spec is `Project_Plan.md` and `Technical_Implementation_Plan.md`, plus part specs in `.plans/`.** `.plans/agent-scraper-spec.md` wins over the plan files for P2's work. Don't change the plan files unless a teammate asks for that specific change. If something conflicts with them, follow the plan and raise the conflict.
5. **`web/` is a test prototype.** Don't build on it. The real app is built at the repo root, using the tech plan's §2 layout. Only its design system carried over; it now lives in the root `DESIGN.md`, `app/globals.css`, `components/ui/` and `components/civic.tsx`.
6. See `CLAUDE.md` for the deadline, commands and the rules that are easy to break.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
