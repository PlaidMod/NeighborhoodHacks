# ShowUp HTX design system

> **Read this first (Oct 19, 2026).** This file was copied from the old test prototype in `web/`. Its tokens, type, spacing, radius, motion, icons, accessibility, voice and neutrality rules apply to the real app at the repo root. These parts describe the prototype and are replaced by `Project_Plan.md` and `Technical_Implementation_Plan.md`:
> - **Update, Oct 20, 2026:** the prototype's screens were moved into the root app under `/app/*` and `/start` (`app/(prototype)/`), so **§2 routes and §5, §7 and §8 patterns describe live screens again.** The items below still hold where the plan differs (stakes, tier names, privacy).
> - **§2** (prototype routes) and **§8** (prototype page patterns).
> - **§3** "Government body colors" and "Dev palette picker". Body colors now live in `BODY_STYLE` in `components/civic.tsx`, keyed by the plan's body types; the palette picker wasn't carried over.
> - **§5** shell and dashboard grids; **§7** stat card, date tile and story sheet.
> - **§9** personas. The plan has four stakes: student, parent, renter and homeowner.
> - **§10** tier names. The plan uses `sms | weekly | timeline`; `TierPill` shows "Urgent" for `sms` only.
> - **§14** file paths, and its rule about storing the address in a profile. The plan never stores addresses. Paths are now `components/`, `lib/` and `app/` at the root.
> - The "Live reference" link points to the prototype. The real app is https://showup-htx-six.vercel.app.

The rules for how ShowUp looks, reads, and behaves. Read this before you add a page, a component, or a line of copy. If something you need isn't covered here, copy the closest existing pattern and raise it with the team so we can add it.

**Live reference:** https://showup-htx.vercel.app
**Stack:** Next.js (App Router) · Tailwind CSS v4 · shadcn/ui (Radix, Nova preset) · lucide-react icons

---

## Contents

1. [Principles](#1-principles)
2. [Where the look comes from](#2-where-the-look-comes-from)
3. [Color](#3-color)
4. [Typography](#4-typography)
5. [Layout and spacing](#5-layout-and-spacing)
6. [Shape and elevation](#6-shape-and-elevation)
7. [Components](#7-components)
8. [Page patterns](#8-page-patterns)
9. [Content and voice](#9-content-and-voice)
10. [Civic neutrality and accuracy](#10-civic-neutrality-and-accuracy)
11. [Motion](#11-motion)
12. [Icons](#12-icons)
13. [Accessibility](#13-accessibility)
14. [Code conventions](#14-code-conventions)
15. [Contribution checklist](#15-contribution-checklist)

---

## 1. Principles

These decide every tie. When two rules conflict, the higher one wins.

1. **Plain language first.** A 15-year-old should understand every sentence without a glossary. If we must use a term like "MUD" or "bond," explain it the first time on that screen.
2. **Tell people why it matters to them.** Every update has a "why it matters to you" line written for the user's persona. A headline alone is never enough.
3. **Calm by default, loud only when it counts.** Most of the app is quiet white, light gray, and navy. Brick red and urgency cues are reserved for decisions that need action (see [Tiers](#tiers-and-urgency)). If everything is loud, nothing is.
4. **Always show the source.** Every fact links back to an official agenda, site, or record. We summarize; we don't replace the record.
5. **Built for a two-minute visit.** The most important thing on any screen should be readable in under 5 seconds, on a phone, by someone who's never used the app.
6. **Don't crowd the screen.** Each panel earns its place. Prefer fewer items per list (3–4 on home), one label per item, and no decorative charts. Trim inside the existing layout rather than adding panels.
7. **Collect as little as possible.** Don't add a field unless a feature breaks without it. Say what we store, near where we ask for it.

---

## 2. Where the look comes from

The visual language combines three reference designs. Copy their rules, not their colors.

| Reference | What we took | Where it shows up |
|---|---|---|
| **Task dashboard** (green "Donezo") | Light sidebar in its own rounded panel, one filled hero stat card, circled arrow buttons, pill buttons, dark countdown tile | Home dashboard (`/app`), app shell |
| **News reader** ("Bace") | Topic chips, underline tabs, featured story cards with a label pill, thumbnail and meta rows, bookmark icons, a right rail of secondary info | Timeline (`/app/timeline`) |
| **Sports page** (bento) | Big bold page headline, bento grid of colored tiles, small category label above a heavy headline, white "Read more ›" pill | Weekly brief (`/app/brief`), landing page |

---

## 3. Color

### Palette: Faded Americana

All colors are CSS variables in `src/app/globals.css` and are exposed as Tailwind utilities (`bg-denim`, `text-brick-deep`, and so on). **Never write a hex value in a component.** If you need a new color, add a token to `globals.css` and to this table.

**Four base colors drive the palette:** accent (`--brick`), paper (`--surface`), primary (`--denim`), and ink (`--ink`). The `-deep` and `-soft` shades, `--canvas`, `--line`, `--muted`, `--muted-foreground`, and `--border` derive from them with `color-mix()`. Edit the bases; never hand-set a derived shade. White cards and semantic body-kind colors remain consistent between palettes. The hex values below are reference values for the default direction; derived shades are defined in CSS.

| Token | Hex | Tailwind | Role |
|---|---|---|---|
| `--canvas` | `#F2F3F4` | `bg-canvas` | Page background: a cool light gray, so white cards float on it. The main content area is transparent over it |
| `--surface` | `#FFFFFF` | `bg-surface` | Sidebar and other panels; inset fields |
| white | `#FFFFFF` | `bg-white` | Cards |
| `--ink` | `#1B263B` | `text-ink`, `bg-ink` | All primary text; dark feature tiles |
| `--denim` | `#3D5A80` | `bg-denim`, `text-denim` | **Primary.** Main buttons, hero cards, active nav, links |
| `--denim-deep` | `#2C4361` | `text-denim-deep` | Hover for denim; text on `denim-soft` |
| `--denim-soft` | `#E3EAF3` | `bg-denim-soft` | Tints and selected states |
| `--brick` | `#B23A48` | `bg-brick`, `text-brick` | **Urgent and "speak up."** Alerts, urgent counts, the comment CTA, errors |
| `--brick-deep` | `#7A2230` | `text-brick-deep` | Text on `brick-soft`; brick hover |
| `--brick-soft` | `#F4DDE0` | `bg-brick-soft` | Urgent pill and urgent date tiles |
| `--sand` | `#E8DCCB` | `bg-sand` | Soft editorial tiles, "good to know" notes |
| `--sand-deep` | `#6B5B45` | `text-sand-deep` | Text and icons on sand |
| `--sage` | `#416B56` | `text-sage` | Decided or approved (vote results) |
| `--sage-soft` | `#E1EDE5` | `bg-sage-soft` | Background for vote result chips |
| `--mist` | `#8DA9C4` | `bg-mist` | Flood control color; secondary chart color |
| `--plum` / `-soft` / `-deep` | `#6D5B94` / `#ECE6F3` / `#4B3D6B` | `bg-plum` and others | Community college color only |
| `--line` | `#E8E9EC` | `divide-line`, `border-line` | Dividers inside white cards |
| `--border` | `#E3E4E8` | `ring-border`, `border-border` | Outlines on chips, inputs, and outline cards |
| `--muted-foreground` | `#535C6E` | `text-muted-foreground` | Secondary text, meta, captions |

### Color rules

- **Denim is "do this." Brick is "this is urgent" or "speak up."** Use brick only for urgent tiers, error messages, the public-comment call to action, and the logo's dot. Don't use brick for decoration.

**Logo (Oct 22, 2026):** a heavy Geist "S" on an ink rounded square, with a brick dot like a pin marking your spot. Use `LogoMark` (or `Logo` for the mark plus the name) from `components/civic.tsx`, with `light` on dark backgrounds. The icon files share the design: `app/favicon.ico`, `app/apple-icon.png` and `public/icons/icon-{192,512}.png`. The install icons fill the square edge to edge, with the S inside the maskable safe zone.
- **Use at most one brick element per card, and at most two filled denim or brick blocks per screen region.** The rest stays white or surface.
- **Dark ink tiles are for time-sensitive or "feature" content**: the countdown, the MUD turnout story, the SMS phone frame. Use at most one or two per page.
- **Pair text with its tint.** Text on a `*-soft` background uses the matching `*-deep` color: `bg-brick-soft text-brick-deep`, `bg-denim-soft text-denim-deep`. Never put plain black or gray on a tinted fill.
- **On filled color blocks** (denim, brick, ink), text is white. Secondary text uses `text-white/70` or `/75`, and labels use `/60`. Don't go below `/60` for anything that must be read.
- **Muted text goes on white or surface only.** It fails contrast on `canvas` (4.4:1).

### Government body colors

Each kind of governing body has a fixed color and icon, defined in `KIND_STYLE` in `src/components/civic.tsx`. Always use `<BodyIcon kind=… />` or `KIND_STYLE`. Don't pick colors for bodies by hand.

| Kind | Tile | Dot/bar | Icon |
|---|---|---|---|
| `mud` (utility district) | brick-soft / brick-deep | brick | `Droplets` |
| `school` | denim-soft / denim-deep | denim | `GraduationCap` |
| `city` | ink 8% / ink | ink | `Landmark` |
| `county` | sand / sand-deep | sand-deep | `Building2` |
| `flood` | denim-soft / denim | mist | `Waves` |
| `health` | sage-soft / sage | sage | `HeartPulse` |
| `college` | plum-soft / plum-deep | plum | `BookOpen` |

### Checked contrast pairs (WCAG AA needs 4.5:1 for small text)

| Pair | Ratio |
|---|---|
| ink on white / surface | 15.1 / 14.2 |
| white on denim | 7.1 |
| white on brick | 5.8 |
| muted on white / surface | 5.4 / 5.1 |
| brick-deep on brick-soft | 7.7 |
| denim-deep on denim-soft | 8.3 |
| sand-deep on sand | 4.8 |
| sage on sage-soft | 5.0 |
| ⚠️ muted on canvas | 4.4, so don't do this |

These ratios are for the default palette. If you change a base color, re-check them.

### Dev palette picker

`src/components/dev-palette.tsx` adds a floating **Palette** button so the team can try color schemes live. Preset values and validation live in `src/lib/palette.ts`; components use tokens only.

- **Where it shows:** automatically in `npm run dev`. On the deployed site, add `?dev=1` to any URL. It remembers this in localStorage, and `?dev=0` turns it off.
- **What it does:** four pickers (Accent, Paper, Primary, Ink) update root tokens instantly, with transitions suppressed during a swap. Six presets: Americana, Old Glory, Bayou, Space City, Newsprint, Field notes. A check and pressed state identify the selected preset. Valid colors persist between pages and reloads; invalid partial hex edits never reach CSS or storage. Old three-color settings are migrated.
- **Contrast:** shows WCAG small-text checks for body on paper and white on primary, accent, and ink. This is not a whole-page accessibility certification; inspect muted text, tints, and other semantic colors before publishing. These presets target light surfaces, not dark mode.
- **Making a palette permanent:** click **Copy CSS**, paste the complete root block's four declarations into the existing `:root` in `globals.css`, and re-check contrast. Clipboard failures reveal selectable CSS instead of reporting success.
- **Reset:** restores the shipped defaults and clears saved colors. Escape or outside click closes the keyboard-accessible popover and returns focus to its trigger. On mobile, the panel fits the viewport and scrolls independently.
- **Rules:** this is a team preview tool; never link to it from product navigation. Palette definitions are the exception to the no-hex rule. Core shades keep deriving from the four bases.

---

## 4. Typography

**One font everywhere: Geist** (since Oct 22, 2026, chosen from the Lisso dashboard reference). It replaced Overpass for the app and Playfair Display and Libre Franklin on news surfaces. It's loaded in `app/layout.tsx`.

| Role | Font | Tailwind | Where |
|---|---|---|---|
| **Everything** | **Geist**, a clean neo-grotesk | `font-sans` (the default) | Every screen |
| News headlines and body | Geist (same font) | `font-headline`, `font-news` | Kept as class names on news surfaces so a news face could return later; both point at Geist in `globals.css` |

News surfaces (the weekly brief, the timeline and the story sheet) now set themselves apart with size, weight and photos rather than a second typeface. Page headlines use `font-black` with tight tracking; story headlines use `font-bold`.

### Fonts we don't use

We avoid typefaces that make a product look template-generated: Inter, Plus Jakarta Sans, Geist, DM Sans, Manrope, Poppins, Space Grotesk, Public Sans, Fraunces, Newsreader, Instrument Serif, and similar. Don't add a font without team agreement.

### Separators

Write separators as ` · ` (a middle dot with a space on each side). Geist's own middle dot is spaced correctly, so no glyph fix is needed (the old Overpass "Middot Fix" was removed).

### Type scale

| Use | Classes | Example |
|---|---|---|
| Landing hero | `text-[2.6rem] md:text-6xl lg:text-[4.25rem] font-extrabold leading-[1.02] tracking-[-0.035em]` | "You live under a stack of governments." |
| Page title | `text-[2.1rem] font-extrabold leading-tight tracking-[-0.03em]` (home: `md:text-[2.6rem]`) | "Timeline" |
| Brief masthead (news) | `font-headline text-[2.6rem] md:text-[3.6rem] font-black` | "Your week in Third Ward" |
| Bento tile headline (news) | `font-headline text-[1.3rem]`–`text-[1.75rem] font-bold leading-[1.1]` | Brief tiles |
| Story headline (news) | `font-headline text-[1.15rem]`–`text-[1.5rem] font-bold` | Timeline rows, featured cards, "Also decided" |
| Dashboard feature headline | `text-[1.3rem]`–`text-[1.75rem] font-extrabold leading-[1.1] tracking-tight` | Persona card, countdown |
| Big number | `text-[2.6rem] font-extrabold leading-none tracking-tight tabular` | Stat cards |
| Section title | `text-[1.05rem] font-bold tracking-tight` (use `<SectionTitle>`) | "Coming up" |
| List item title | `text-sm`–`text-[0.98rem] font-bold leading-snug` | Feed rows |
| Body | `text-[0.95rem]` or `text-sm`, `leading-relaxed` for paragraphs | Summaries |
| Meta | `text-xs font-semibold text-muted-foreground` | "City Council · 2:00 PM" |
| Eyebrow label | `text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground` | "MENU", "ALSO DECIDED THIS WEEK" |

### Type rules

- **Headlines are heavy and tight**: `font-extrabold` (or `font-black` for page headlines) with negative tracking. Body text is regular weight with normal tracking.
- **Weights:** 400 for body, 600 (`font-semibold`) for meta and nav, 700 (`font-bold`) for titles and labels, and 800 (`font-extrabold`) only for headlines and big numbers.
- **Use sentence case everywhere**, including buttons, headings, and tabs. The only uppercase text is eyebrow labels and month abbreviations in date tiles.
- **Numbers that change or line up** (counts, money, timers) get the `tabular` utility.
- **Keep paragraph lines to 60–75 characters.** Use `max-w-xl` or `max-w-2xl` on long text.
- **Never use bold mid-sentence for emphasis.** The one exception is a leading label like "**For you:**".

---

## 5. Layout and spacing

### The shell (three layers)

```
canvas (#ECE7DF, p-2 md:p-3)
├── sidebar panel   bg-surface rounded-[28px] w-[248px], sticky, lg+ only
└── main panel      bg-surface rounded-[28px]
     ├── top bar     search pill · "Viewing as" · bell · avatar
     └── content     px-4 md:px-7, pb-10
          └── cards  bg-white rounded-[24px] p-5 md:p-6
```

- New app pages go in `src/app/app/<name>/page.tsx` and automatically get this shell from `src/app/app/layout.tsx`.
- The sidebar becomes a left `Sheet` below `lg`. Add new nav items to `MENU` or `GENERAL` in `src/components/app-shell.tsx`, not anywhere else.
- Every page starts with `pt-4`, then the page title and a one-line description in `text-muted-foreground`.

### Spacing scale

Use Tailwind steps only. These are the ones we use:

| Space | Value | Where |
|---|---|---|
| `gap-2` | 8px | Chips, button groups, icon and text |
| `gap-3` | 12px | Items in a list or card row; stat cards on mobile |
| `gap-4` | 16px | **Default gap between cards** |
| `gap-6` | 24px | Main column vs. right rail |
| `p-5 md:p-6` | 20 / 24px | **Default card padding** |
| `p-6 md:p-8` / `p-7 md:p-10` | | Hero and feature blocks |
| `space-y-5` / `mt-6` | | Between page sections |

### Grids

- **Dashboard:** `grid xl:grid-cols-4 gap-4`, where cards span 1–2 columns. Stat cards use `grid-cols-2 xl:grid-cols-4`.
- **Feed with rail:** `xl:grid-cols-[minmax(0,1fr)_320px] gap-6`, with a sticky rail (`xl:sticky xl:top-4 xl:self-start`).
- **Bento:** one column on phones, two at `sm`, four at `xl`; 220px minimum rows, 240px desktop rows. Tall tiles span rows only at `xl`, keeping headlines and actions apart at intermediate widths.
- Use `minmax(0,1fr)` for any column that holds text that might overflow.
- **Mobile first:** everything must work at 390px wide with no horizontal page scroll. Only horizontal chip rows may scroll (`overflow-x-auto scrollbar-none`).

---

## 6. Shape and elevation

### Radius

| Element | Radius |
|---|---|
| Shell panels (sidebar, main, hero blocks, bento tiles) | `rounded-[28px]` |
| Cards (`Panel`, stat cards, rails) | `rounded-[24px]` |
| Inner tiles, list rows, inputs in cards, icon tiles | `rounded-2xl` (16px) |
| Small icon tiles (≤ 36px) | `rounded-xl` |
| Buttons, chips, pills, search, tabs-as-pills | `rounded-full` |
| Phone mockup | `rounded-[44px]` outer / `rounded-[34px]` screen |

**Rule:** the nesting gets less round as you go in (28 → 24 → 16). Never put a rounder element inside a less round one.

### Elevation

The design is mostly **flat**: depth comes from color steps (canvas → surface → white), not shadows.

- **No shadows on cards at rest.**
- Hover lift on clickable cards: `hover:-translate-y-0.5` (and an optional soft `hover:shadow-[0_12px_32px_-16px_rgb(27_38_59/0.25)]`).
- Shadows are only for things that float: dropdowns and popovers (built in), the address suggestions menu, the landing "stack" cards, and the phone mockup.
- No gradients, blur, glow, or glassmorphism. The one exception is `backdrop-blur-sm` on fact chips over the body hero.

### Decorative marks

Each one is allowed only where it's already used:
- Large faded body or topic icon in the corner of a colored tile (`text-white/[0.07]`, `strokeWidth={1–1.2}`).
- Concentric ring outlines on the hero stat card and the dark tiles (`border-white/[0.04–0.06]`).

---

## 7. Components

Shared building blocks live in `src/components/civic.tsx`. shadcn primitives live in `src/components/ui/`. **Reuse before you build.**

### Button (`@/components/ui/button`)

Every button is a pill. Variants:

| Variant | Use for |
|---|---|
| `default` (denim) | The main action in a view. **One per view.** |
| `outline` | Secondary actions next to a primary one |
| `brick` | Only for "speak up" / comment actions and urgent CTAs |
| `ink` | Primary action on a brick or light background where denim would clash |
| `white` | Any action on a filled color tile (denim, brick, or ink) |
| `ghost` | Low-emphasis actions (Turn off, icon buttons in toolbars) |

Sizes: `xs` (h-6), `sm` (h-8), `default` (h-10), `lg` (h-12, hero forms and onboarding). Icons go inside with `data-icon="inline-start"` or `"inline-end"`. Arrows (`ArrowRight`) go at the end for forward actions.

```tsx
<Button asChild>
  <Link href="/app/speak">
    <Mic data-icon="inline-start" /> Draft a comment
  </Link>
</Button>
```

### Chip and TierPill

- `<Chip tone="outline | denim | brick | sand | ink | sage">` makes an `h-6` pill with 11px semibold text. Use it for categories, statuses, and vote results (`tone="sage"`).
- `<TierPill tier="urgent" />` renders the standard "Urgent" pill. **Show it only for urgent items**; digest and timeline items get no pill. Never hand-roll an urgent badge.
- Filter chips (on the Timeline) are `h-9` buttons. Selected ones turn `bg-ink text-white`.

### BodyIcon

`<BodyIcon kind={body.kind} />` is a 40px rounded tile with the body's icon and color. Resize it with `className="size-9 rounded-xl"`. **Every mention of a governing body in a list gets one.**

### Panel and SectionTitle

```tsx
<Panel>
  <SectionTitle action={<Button variant="outline" size="xs">See all</Button>}>Coming up</SectionTitle>
  …
</Panel>
```

`Panel` is the default white card. `SectionTitle` is the standard card heading with an optional action on the right.

### ArrowCircle

This is the circled ↗ from the dashboard reference. Use it on cards where **the whole card is a link**. It rotates 45° on hover (the parent needs `group`).

### Stat card (home)

The label is at top left, the `ArrowCircle` is at top right, and the big number with a one-line note sits at the bottom. **Only the first card in a row is filled (denim)**; the rest are white. An urgent count turns brick.

### Date tile

This is a `size-12 rounded-2xl` square with the month (10px bold) over the day (lg extrabold). It's `bg-brick-soft` if urgent, otherwise `bg-muted`.

### Story sheet

`const openStory = useStory()` and then `openStory(update)` opens the full-story side sheet. **Every update anywhere in the app must open with this.** Never make a separate detail page for an update.

### Forms

- Text inputs are `h-11`–`h-12`, `rounded-full` on their own or `rounded-2xl` inside cards, with `bg-surface` or `bg-white`, `ring-1 ring-border`, and `focus:ring-2 focus:ring-denim`.
- Show errors **inline, next to the submit button or under the field**, in `text-sm font-semibold text-brick`. Clear the error as soon as the user edits the field.
- Selection cards (personas, stances) are toggles with `aria-pressed`. When selected they turn `bg-denim text-white` (persona) or `bg-denim-soft ring-2 ring-denim` (stance).

### Toasts

Use `toast.success("Comment copied")` from `sonner` for confirmations of quiet actions (copy, save, turn on). Use past tense, no exclamation mark, and keep it under 6 words.

---

## 8. Page patterns

### A · Dashboard (`/app`)

- Location eyebrow, greeting headline, then a one-line status sentence, with one main action on the right.
- Three rows: 3 stat cards; then "Coming up" (4 items) and the countdown; then one slim persona feature. Rows wrap titles instead of truncating them. Secondary row text stays regular weight; numbers carry the hierarchy.
- **Don't add a fourth row or squeeze in another panel.** If something new belongs on home, it replaces something. Decorative charts and gamified scores were removed on purpose.
- **The persona feature changes based on who's viewing**: a quiet denim-tint voter-registration prompt for students, the MUD story for MUD residents, and the brief promo otherwise. General eligibility information does not use an urgent red fill. Add a branch here rather than another card.

### B · Feed (`/app/timeline`)

- Title, topic chips, then underline tabs: `For you / Coming up / Decided / Everything`. The active tab has a 3px brick underline.
- Up to **2 featured cards** for upcoming urgent items: the first is denim, the second ink, each with an "Urgent #n" white pill.
- Rows are grouped by posted day under an eyebrow label with a rule line. Each row has a body-colored thumbnail, a meta line (body · topic), a title, a persona "why" line, and a footer meta row with chips, plus a bookmark on the right.
- The right rail has two cards only: body toggles and key dates.
- Feed rows show at most: type, date, a vote result if decided, "Urgent" if urgent, and "Comment open" if you can speak. No other chips.

### C · Bento brief (`/app/brief`)

- Masthead: a `Weekly brief` brick chip, the date range, read time, a giant headline, and a one-line summary.
- **Exactly 5 tiles** in this order: denim (wide), ink (tall), brick (tall), sand, denim-soft. Each tile has the body name, a headline, and a white pill CTA ("Read more ›", or "Read and respond ›" if comment is open).
- Below that: "Also decided" as newspaper-style articles (a date column plus the article), with a sticky calendar rail and one brick "One thing you can do" card.

### Detail pages (`/app/districts/[id]`)

- A big hero block (denim, or ink for city and MUD) with the kind chip, your seat chip, title, tagline, and 3 fact chips.
- A row of 3: "What it controls," "Who's in charge," and the brick "How to speak" card.
- A list of updates, plus a turnout dot grid (each dot is 1% of eligible voters).

### Flows (`/start`, `/app/speak`)

- Show the steps visibly: a numbered rail (onboarding) or numbered pills (speak). Completed steps get a denim check.
- One question per screen region. The primary button is at the bottom left, and Back is an outline button or text link.
- **Validate on submit, not on blur.** Explain exactly what's missing.

---

## 9. Content and voice

**Voice:** a smart older friend who goes to the meetings so you don't have to. It's clear, warm, specific, and never preachy.

### Rules

- **Lead with the decision, then the impact.** "Board to vote on closing or merging 9 under-enrolled campuses," not "Important school board meeting."
- **Use numbers people can feel:** "+$4.10/mo," "$2,520 a year on a $300K home," "37 votes." Avoid percentages without a base.
- **Write "why it matters" in second person** and keep it concrete: "Decides when your summer ends." Write one line per persona in `why` (see `src/lib/data/updates.ts`).
- **Explain jargon the first time it appears on a screen:** "MUD (a small district that provides your water and sets its own tax)."
- **Buttons are verb first, 1–4 words:** "Draft my comment," "Turn on alerts," "Check my eligibility." Never use "Submit," "Click here," or "OK."
- **Use contractions.** "You'll," "don't," "it's."
- **Empty states are an invitation, not an apology:** "No open comment windows right now. We'll text you when a new agenda opens for comment."
- **Errors say what happened and what to do:** "Include a Houston-area ZIP code, like 77004."
- **Avoid:** "please," "simply," "just," "easy," "successfully," "leverage," "empower," "democracy is calling," and exclamation marks in UI copy.

### Dates and times

Use the helpers in `src/lib/format.ts`, and never format dates inline.

| Helper | Output | Use |
|---|---|---|
| `relDay(iso)` | Today · Tomorrow · Wednesday · 3 days ago · Oct 27 | Lists and headers |
| `relDayLower(iso)` | today · tomorrow · Wednesday | Mid-sentence ("sign up by tomorrow") |
| `fmtDateTime(iso)` | Tue, Oct 20 · 2:00 PM | Exact meeting and deadline times |
| `monthDay(iso)` | `{ month: "OCT", day: 20 }` | Date tiles |
| `money(n)` | $2,520 | All currency, with no cents |

Use a middle dot ` · ` to separate meta items. Use an en dash for ranges: "Oct 19–30."

### Personas

There are five: `student`, `parent`, `renter`, `homeowner`, and `voter` (first-time voter). Renters are first-class users. Taxes reach them through rent, so say so. Don't write copy that assumes the reader owns a home.

---

## 10. Civic neutrality and accuracy

This product is about trust. These rules are not optional.

- **We're nonpartisan.** Never tell people how to vote or what position to take. Summaries describe what's proposed and who it affects, giving both supporters' and opponents' main points when we mention either.
- **Comment drafting coaches; it doesn't argue.** Stance options are always balanced (support / oppose / ask for changes / ask for a delay). The user's own words go first, and our text only frames them.
- **Never invent officials' names or quotes.** Refer to roles ("your District D council member") unless the data comes from an official source.
- **Every update links to its source** (`update.source`), and the story sheet says to check the official agenda.
- **Label sample data.** While we use mock data, keep the "sample data" and "approximate" notes visible (story sheet, landing footer, tax card).
- **Tiers follow fixed rules**, not editorial mood:

### Tiers and urgency

| Tier | Gets | Criteria |
|---|---|---|
| `urgent` | SMS + brick styling | Tax rate hikes or hearings, bond elections, school closures or consolidations, utility rate increases, the start of early voting |
| `digest` | Weekly brief | Policy changes, budgets and contracts over about $1M, calendars, decided items that affect a persona |
| `timeline` | Timeline only, no pill | Routine contracts, workshops, operator reports, town halls |

If you're unsure, pick the lower tier.

---

## 11. Motion

Motion explains change. It's never decoration.

| Pattern | Spec |
|---|---|
| Content entering | `.rise`: 8px up and fade, 0.5s `cubic-bezier(0.2,0.8,0.2,1)`. Stagger lists with `animationDelay` of 50–90ms per item, capped at about 8 items. |
| Clickable card hover | `transition-transform motion-safe:hover:-translate-y-0.5` |
| Arrow circle | Rotates 45° on group hover |
| Decorative tile icon | `group-hover:scale-110` plus a slight rotate, `duration-500` |
| Toggles and selection | Color transitions only (`transition-colors`) |
| Live numbers | The countdown ticks every second; progress bars name only the property that changes |

- `prefers-reduced-motion` turns off `.rise` and reduces animation/transition duration. Transform-based hover effects must also use `motion-safe:`. Shared buttons press to `0.96` over 150ms ease-out only without reduced motion, never when disabled.
- Don't animate layout shifts, bounce, or loop anything except the live countdown and practice timer.

---

## 12. Icons

- Use **lucide-react** only. The default stroke is `2`. Big decorative icons use `1–1.2`.
- Sizes: `size-3.5` in chips and meta, `size-4` in buttons and lists, `size-[1.1rem]` in nav and the top bar, `size-5`–`size-7` as card leads, and `size-44`+ for faded decorations.
- Icons that mean a body kind come from `KIND_STYLE`. Icons that mean an update type come from `TYPE_ICON` (agenda `FileText`, decision `Gavel`, hearing `Megaphone`, election `Vote`, meeting `CalendarClock`, deadline `TimerReset`).
- No emoji in the UI.

---

## 13. Accessibility

- **Contrast:** stick to the pairs in [section 3](#checked-contrast-pairs-wcag-aa-needs-451-for-small-text). New pairs must reach 4.5:1 for text under 18px.
- **Don't rely on color alone.** Urgent items also say "Urgent," and selected toggles show a check.
- **Targets:** interactive elements are at least 40px tall (`h-10`) on touch. Icon-only buttons are `size-10` or larger.
- **Labels:** icon-only buttons need `aria-label` or `sr-only` text. Toggle cards use `aria-pressed`. Tabs use `role="tab"` and `aria-selected`. Decorative icons and thumbnails are `aria-hidden`.
- **Focus:** keep the shadcn focus rings. Inputs use `focus:ring-2 focus:ring-denim`. Never remove an outline without replacing it.
- **Keyboard:** everything clickable is a `<button>` or `<Link>`, never a `<div onClick>`. ⌘K / Ctrl+K opens search.
- **Language level:** aim for an 8th-grade reading level in summaries and "why" lines.

---

## 14. Code conventions

### Where things live

```
src/
  app/
    page.tsx                landing
    start/                  onboarding (address → persona → stack)
    app/                    the signed-in experience (gets the shell)
      page.tsx              A · dashboard
      timeline/             B · feed
      brief/                C · bento brief
      districts/[id]/       body detail
      speak/                comment drafter
      vote/  alerts/
  components/
    ui/                     shadcn primitives (restyled: pill buttons, 24px cards)
    dev-palette.tsx         dev-only palette studio
    civic.tsx               Logo, LogoMark, BodyIcon, Chip, TierPill, ArrowCircle, Panel, SectionTitle, KIND_STYLE, TYPE_ICON
    app-shell.tsx           sidebar, top bar, search, alerts popover
    story-sheet.tsx         useStory() + the update detail sheet
    address-form.tsx
  lib/
    data/                   types, ZIP lookup, bodies, update generators (mock "engine")
    profile.tsx             ProfileProvider, useProfile, useMarkDone, useNow
    format.ts               dates, money, persona and topic labels, APP_NAME
```

### Rules

- **Tokens, not values.** No hex codes, no arbitrary `text-[#…]`, and no new font families. The only font is Geist. Arbitrary sizes are fine only where this guide lists them (such as `rounded-[24px]` and `text-[2.1rem]`).
- **Compose with `cn()`** from `@/lib/utils` to merge classes.
- **Add shadcn components with** `npx shadcn@latest add <name>`, then restyle them to match this guide (pill buttons, 24px cards, no ring borders on cards).
- **Read "now" with `useNow()`**, not `Date.now()` in render. The React compiler lint rule rejects impure render code.
- **Data stays in `src/lib/data/`.** Pages never hard-code meetings or bodies. A new body kind needs a `BodyKind`, a `KIND_STYLE` entry, a `KIND_LABEL`, and an update generator in `MAKERS`.
- **Client-only state** (profile, saved items) lives in `ProfileProvider` and localStorage. Don't add new storage keys without a reason, and never store a street address anywhere except the profile.
- Run `npm run lint` and `npx tsc --noEmit` before you open a PR. Both must pass clean.

---

## 15. Contribution checklist

Copy this into your PR description and check each item.

```
Design
- [ ] Uses existing components (Panel, Chip, TierPill, BodyIcon, Button variants) before new ones
- [ ] Components use tokens; preset values live in lib/palette.ts; core shades derive from the four bases
- [ ] No font besides Geist (font-headline and font-news are Geist too)
- [ ] Brick is used only for urgent / speak-up / errors; one primary button per view
- [ ] Radius nests 28 → 24 → 16; cards have no resting shadow
- [ ] Type follows the scale (extrabold, tight headlines; sentence case)
- [ ] Works at 390px wide with no horizontal scroll

Content
- [ ] Plain language; jargon explained on first use
- [ ] Every update has a persona "why it matters" line and a source link
- [ ] Buttons are verb-first; no "please," "simply," or "!"
- [ ] Dates use the format.ts helpers
- [ ] Neutral: no recommended positions, no invented names or quotes

Accessibility
- [ ] Text contrast is at least 4.5:1 (see the table)
- [ ] Icon-only buttons have labels; toggles use aria-pressed or role="switch"
- [ ] Keyboard reachable; focus visible; respects reduced motion

Code
- [ ] npm run lint and npx tsc --noEmit pass
- [ ] Screenshot of desktop (1440px) and mobile (390px) attached
```
