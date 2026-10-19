# UI polish and palette studio

Read alongside `../../DESIGN.md`. Product context comes from the root Project Plan and Technical Implementation Plan, reviewed through revision 4. This change improves the existing prototype; it does not implement the planned data services, SMS, or registration engine. Prototype/plan reconciliation remains a team decision.

## Try it

Run `npm run dev` from `web`, open `/app`, and use **Palette** at the bottom right. On a production build use `?dev=1`; `?dev=0` disables the tool. The enable flag and selected colors are local to this browser.

Six starting points preserve the neutral civic design while changing accent, paper, primary and ink. Native color pickers and six-digit hex fields allow custom directions. Changes propagate to every route through root CSS variables. Core contrast feedback is advisory, not a complete accessibility audit. The presets target light surfaces.

**Copy CSS** exports a complete root block. Merge its four declarations into the existing root block in `src/app/globals.css` to adopt a direction. **Reset** restores defaults, clears saved colors and clears incomplete hex edits. No new dependencies were installed.

## Findings addressed

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| Medium | `src/app/app/page.tsx:40` | Strong emphasis on nearly every line; general voter prompt looked urgent | Clearer heading, regular supporting text, quieter persona prompt, separated meeting rows | Visual hierarchy reserves urgency for decisions that need action |
| Medium | `src/app/app/brief/page.tsx:85` | Four-column news tiles started at tablet widths | One/two/four columns with minimum-height rows and space above actions | Headlines retain room at narrow widths |
| Medium | `src/components/dev-palette.tsx:32` | Unvalidated saved values, partial hex state, no contrast feedback, premature clipboard success | Validated persistence, separate field drafts, core contrast ratios, awaited copy and selectable fallback | Palette experiments remain reversible and understandable |
| Medium | `src/components/ui/button.tsx:7` | Transition-all and pressed translation | Explicit state properties; 0.96 press scale only without reduced motion | Consistent interaction feedback |
| Medium | `src/components/civic.tsx:28` | Hover movement ignored reduced motion | Motion-safe transforms; global reduced-motion fallback | Motion respects user preferences |
| Medium | `src/components/story-sheet.tsx:34` | Scrolling a story could propagate to the page | Contained overscroll | Overlays keep their own scroll context |

## Verification

- `npm test`: five passing tests cover corrupt storage, migration, WCAG contrast math, CSS export and preset primary/body contrast.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- Browser: desktop dashboard and palette inspected; Bayou preset updated root colors and the app. Escape returned focus to the launcher. Phone dashboard and Brief inspected at 390px viewport width, including wrapped headlines.
- Independent code review caught the unchanged-value Reset edge case; preset/reset field revision now clears incomplete drafts explicitly.
- Not verified: final keyboard/input workflow, reload persistence and clipboard rejection through the browser. Further interaction tools failed or timed out in automatic approval review because the review service was at capacity. Storage validation and exports are covered by unit tests; this is not a substitute for those browser checks.
- Production build not verified: restricted Turbopack/webpack runs could not fetch existing Google Fonts (`fonts.googleapis.com`). The elevated Turbopack attempt failed when its CSS worker exited before connecting. Font declarations and build configuration were not changed.

Screenshots: [desktop dashboard](dashboard-desktop.png), [desktop palette](palette-desktop.png), [phone dashboard](dashboard-mobile.png), [phone Brief](brief-mobile.png). They show the Bayou preview; the shipped default remains Americana.

**Approve** for the inspected UI-polish scope. Browser checks and production build limitations above remain explicitly unverified.
