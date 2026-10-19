# Project Plan

**Revision 5, Oct 19, 2026**
**Working name:** [App Name] (placeholder ideas: "MyLayers", "WhoDecides")

The companion file, *Technical_Implementation_Plan.md*, covers how each part is built.

---

## What changed in revision 5

- **News coverage perspectives (new core feature).** Each weekly story gets a collapsed "What news coverage says" block. It shows the viewpoints Houston news outlets report on that decision, grouped by who holds them, each with a short summary, an exact quote and a source link. When coverage is one-sided, the block says so. The full spec is `.plans/news-coverage-perspectives-spec.md`.
- **The "news is never data" rule is relaxed.** P2 now reads article text from outlets with no paywall, stores it admin-only and matches articles to items. News still never creates items or feeds alerts, the rule engine, the review queue or the official story text.
- **The "In the news" headline box on body pages is now core,** not stretch (scraper spec D26).

## What changed in revision 4

- **P5 rebalanced.** P5's Day 1 had about 10 items, and the other four parts can't connect anything real until P5's database and shared code exist. Four tasks moved to the parts they already overlap with:
  - **Meeting calendar checks and the news watchlist → P4.** P4 is already reading the same six bodies' websites on Day 1 for the registration recipes.
  - **Twilio registration → P3.** P3 owns texting and is already setting up Twilio Verify on Day 1.
  - **Picking and confirming the demo addresses → P1.** P1 has to verify those addresses' bodies anyway.
  - **Moving each screen's text into the English/Spanish translation files → each screen's owner.** P5 sets up the translation system only.
- **P5's Day 1 order:** the database schema comes first, so the other parts can connect by midday.
- **Real public comment timing risk:** if the best meeting falls before Speak up is ready (Day 2 or 3), P4 flags it on Day 1 (see "Evidence plan").
- **New Day 1 decision for everyone:** where the existing prototype in `web/` and this plan disagree (alert tier names, user types, Fort Bend coverage, the body list, page routes). See `CLAUDE.md`, "Prototype vs. plan."

## What changed in revision 3

- **Team:** split into five parts, one per teammate (see "Team: five parts").
- **Bodies covered:** a curated set of 11 tracked bodies, a ballot list, a "not a government" section (HOA, CenterPoint, water operator), and a "Regional: coming soon" section.
- **"Who governs you?" question:** one multi-select question shown right after the address is entered. It replaces the before-and-after survey; there is no follow-up survey.
- **Speak up tool:** replaces the comment coach. It's an end-to-end flow from an agenda item to being registered and ready, with registration as the core step. The AI coaches but never ghostwrites. It has guardrails and works in English and Spanish.
- **"I'm going" counter:** removed and moved to stretch goals.
- **Weekly report:** now styled as a local news site. Stories are written by Gemini from database facts, checked in code, and labeled.
- **Agenda data:** comes from a Legistar API adapter for Commissioners Court and HISD, Gemini extraction for messy sources, and manual entry as a fallback. AI-extracted items go through a review queue before triggering any text.
- **AI provider:** Gemini for everything.
- **Demo school districts:** HISD and CFISD, with one demo address in each.

## Facts fixed in earlier revisions (still apply)

- **UH survey:** in a Feb 3–10, 2026 survey of 2,000 likely voters per party, 54% to 77% of likely primary voters were undecided in several countywide primary races. Use it only as "even engaged voters are unsure."
- **MUD count:** "Harris County alone has hundreds of MUDs." Recheck the current count on the TCEQ district list before the pitch.
- **Flood Control:** has its own tax slice, but Commissioners Court sets the rate and makes its decisions.
- **Port of Houston Authority:** Commissioners Court adopts its tax rate. The appointed Port Commission runs operations.
- **Constables and JPs:** ballot list only, with no agenda tracking.
- **HISD:** the state-appointed board of managers holds power through at least June 2027, so the parent action there is public comment.
- **Voter registration:** Texas allows registration at 17 years 10 months, if the person will be 18 by Election Day.
- **Comparisons:** Legistar is an agenda system governments use. Hamlet is an AI meeting-video startup that sells topic alerts to businesses.
- **Wording:** "we will verify 20 addresses" is a task, not something already done. "I live under [N] governments": fill in [N] from a real demo address.
- **Results:** reported as raw counts with percentages beside them.

---

## Problem statement

Houston-area residents live under a stack of overlapping local governments, and most people can name only one or two of them. Depending on the address, that stack can include:

- City Council, if they live inside a city
- Harris County Commissioners Court (the County Judge plus four commissioners), which also sets the tax rates for Flood Control and the Port of Houston Authority
- A school board and a community college board
- Often a Municipal Utility District (MUD), a small special district that sets part of your property tax, issues bonds and holds elections very few people vote in. Harris County alone has hundreds of them.
- Often a regional water authority, which sets the water fee on MUD bills
- In unincorporated areas, an Emergency Services District (ESD), which funds your fire department or ambulance
- METRO, which runs transit and is funded by sales tax
- HCAD, which sets the property value your taxes are based on

On top of that, organizations that aren't governments shape daily life just as much: an HOA can fine you or put a lien on your home, and CenterPoint's electric delivery rates are set by a state regulator.

Decisions about people's money, schools and neighborhoods are made in meetings almost nobody hears about until it's too late to act. Even engaged voters struggle: in a February 2026 University of Houston Hobby School survey of likely primary voters, 54% to 77% were still undecided in several countywide races. Students know even less.

In HISD the state replaced the elected school board. Students and families can't vote those board members out, so public comment is one of the few ways left to be heard.

**One-line pitch:** "Type your address, see every government that affects you, including ones you've never heard of, and get help speaking up before the vote."

---

## What the product covers

### Tracked bodies

Each tracked body gets a card, its meetings, a weekly news story for each relevant item, and texts where the rules allow.

| # | Body | Texts? |
|---|---|---|
| 1 | City Council (if the address is inside a city) | SMS |
| 2 | Harris County Commissioners Court: the County Judge plus your commissioner precinct | SMS |
| 3 | Harris County Flood Control District (tax set by Commissioners Court; alerts come from its agendas) | SMS, through Commissioners Court |
| 4 | Port of Houston Authority (tax set by Commissioners Court; operations run by the Port Commission) | Weekly only |
| 5 | School district board | SMS |
| 6 | Community college district (HCC, Lone Star, San Jacinto or Lee) | SMS |
| 7 | MUD or other water district | SMS |
| 8 | Regional water authority (North, West or Central Harris County, or North Fort Bend) | Weekly only |
| 9 | Emergency Services District | SMS |
| 10 | METRO (if inside the service area) | Weekly only |
| 11 | HCAD and the Appraisal Review Board | One protest-deadline reminder per year |

### Ballot list (no agenda tracking)

County Judge, your commissioner, Sheriff, District Attorney, County Attorney, Tax Assessor-Collector, your Constable, your Justice of the Peace, and your voting precinct with a polling-place link.

Each entry shows the office, what it does in one line, the current holder, and the next election date.

### Not a government, but affects you

These are shown with a clear badge. They have no alerts and no agenda tracking.

- **HOA:** a private association. Its power comes from your deed restrictions and Texas Property Code Chapter 209: dues, fines, liens and architectural rules. Its meeting info is shown if the HOA posts it.
- **CenterPoint:** a private electric delivery utility. Its rates are set by the Public Utility Commission of Texas.
- **Your MUD's water operator:** a private company hired by your MUD board. The card points the user to the MUD board as the body that actually decides.

### Regional: coming soon

Names and one-line descriptions only, with no data:

- H-GAC Transportation Policy Council
- TxDOT Houston District
- TCEQ
- Public Utility Commission
- Harris-Galveston Subsidence District
- San Jacinto River Authority

---

## Features

### 1. Address lookup and HOA match

- The user enters an address. The app finds every body above for that address.
- **HOA:** the app reads the subdivision name from the HCAD legal description and matches it to an HOA. The user then sees "Is this your HOA?" with three choices: **Yes** / **No, it's ___** / **I don't have one or I'm not sure**.

### 2. "Who governs you?" question

- One screen, shown while the lookup runs: **"Which of these govern you? Pick all that apply."**
- **Options:** City Council, Commissioners Court, School board, Community college board, MUD, ESD, Regional water authority, Flood Control District, Port of Houston Authority, METRO, HCAD, HOA, and "I'm not sure."
- **Result:** "You knew 3 of your 9. Here are the 6 you missed." The missed bodies are highlighted on the results screen.
- **HOA as a teaching moment:** if the user checks HOA, it's marked as "Not a government, but it does affect you," along with what an HOA can do.
- The question is skippable and fully anonymous.

### 3. Results

Results appear in four sections:

1. **Your governments.** MUD, ESD and regional water authority are highlighted as "a government you probably didn't know you had."
2. **On your ballot.**
3. **Not a government, but affects you.**
4. **Regional: coming soon.**

Each body page shows:
- a plain-English description
- who sets its tax and who runs it
- whether it's elected or appointed
- its next meeting

### 4. "Who sets each dollar" tax receipt

- A stacked bar shows each taxing body's slice of a typical yearly bill. The default home value is $250K and can be changed.
- **Under each slice:** who set the rate, when they voted, the turnout in that body's last election, and the source link.
- **Labeled:** "Estimate before exemptions. Check your real bill and protest deadline at HCAD."

### 5. Stake picker

Student, Parent, Renter or Homeowner (pick any), plus a language choice. First-time voters use the Student path.

### 6. Weekly report: local news style

- **Masthead:** "[App Name] Weekly: Your Local Governments," with the week's date range and an English/Spanish toggle.
- **Lead story:** the most urgent "you can still act" item, with a large headline, dek, story, deadline countdown, a Speak up button and the source link.
- **"Coming up: you can still act":** story cards, each with a headline, dek, body tag, registration-closes countdown, Speak up button and source link.
- **"Decided this week":** short briefs with the outcome, the vote count where available, and the source link. If a meeting has happened but its minutes aren't posted yet (common for MUDs and college boards), the brief says "Outcome not posted yet" and updates when the minutes appear.
- **Sidebar:** "Deadlines this week" and "Your governments at a glance."
- **"What news coverage says"** (on every story card, collapsed): the viewpoints news outlets report about the item, grouped by who holds them (for example "Residents near the plant" or "District board"). Each viewpoint has a one-sentence summary, a short exact quote and the outlet, date and link. A Sources list always shows every article used. If coverage mostly presents one view, a note says so; the app never fills in the missing side. Items with no coverage show "No news coverage found for this item."
- **Footer:** "We summarize. We never recommend." Plus how stories are written and the data sources.

**How stories are written:**
- Gemini writes one short news-style story per agenda item, in English and Spanish, from facts in the database.
- Code checks every number and date against those facts and screens headlines for loaded words.
- If a story fails the check, the app uses a plain template instead.
- Every story is labeled: "Written with AI from the official agenda — see source."

Example headline style: *"Harris County MUD 123 to vote Oct. 28 on $14 million water bond."*

**How the news coverage block is built:**
- Sources: Houston Public Media, Community Impact, Houston Landing, and the Houston TV stations' sites where their feeds and terms allow it. Only outlets with no paywall; the Houston Chronicle is excluded. News reporting and explainers only; opinion pieces and editorials are left out.
- Gemini matches each article to the agenda item it's about, and must quote the article to prove the link.
- Gemini then pulls out the viewpoints the articles report. Code checks that every quote is exact and every number appears in the article, and rejects loaded words and stance labels like "opponents." A second, separate Gemini pass checks each viewpoint against the articles and drops anything unfaithful or not neutral.
- Public officials and organizations are named as the article names them. Private residents are described by role only.
- Only coverage published before the meeting counts, so "Decided this week" briefs keep the debate as it stood before the vote.
- English only for now; Spanish pages show it with a note.
- Labeled: "Summaries written with AI from news coverage and checked by AI. Quotes are exact. Opinion pieces aren't included. We don't take sides."
- News coverage never changes which items are shown, never triggers texts, and never changes the official story. Its only other effect: when two stories are otherwise tied, the one covered by more outlets is listed first.

### 7. Speak up tool

**Purpose:** take a user from "I saw this on the agenda" to "I'm registered and ready." Registration is the most important step. The AI coaches; it never ghostwrites.

**Entry points**
- The Speak up button on "Coming up" items in the weekly report.
- The link in every SMS alert.

**Step A: Find your point**
- The AI explains the item in plain language: what it changes, who it affects, and when the vote is. It's labeled "AI explanation — check the source."
- It asks questions: How does this affect you? What have you seen or experienced? What do you want the board to do (vote yes, vote no, delay, change it, or answer a question)?
- It never suggests a side.
- **Fit check:** is the topic on the agenda, and is this a regular or special meeting? Off-agenda comments can be heard but not acted on that day, and may not be allowed at all at special meetings.

**Step B: Register (core step)**
- The tool shows only the channels this body accepts: online form, email, phone, written comment, remote, or a sign-up card at the meeting.
- **Window status:**
  - "Opens [date]" (offers a reminder)
  - "Open, closes in [countdown]"
  - "Closed" (switches to written comment or email)
- **By channel:**
  - **Online form:** a deep link plus a checklist of the fields it asks for.
  - **Email:** a pre-filled email the user sends from their own account. The AI helps shorten the subject to the word limit, and the user approves it.
  - **Phone:** a call script.
  - **Card at the meeting:** an "arrive by" time.
- **Confirmation:** "Did you get a confirmation?" If none arrives by the expected time, the tool shows who to contact.
- **Extras, where the body offers them:** student priority, remote speaking, translation requests (speakers using a translator generally get double time), and handouts.
- **Progress is saved in the browser:** Not started → Registered → Confirmed.
- **The app never registers or submits for the user.**

**Step C: Coach the draft**
- The user writes the comment. The AI asks follow-up questions, gives feedback on structure (who you are, the item number, your experience, your ask), clarity and timing, and points to sentences to cut. It never writes new sentences.
- A time estimate (about 130 spoken words per minute) is measured against the body's time limit.
- **Guardrails:** the coach highlights, explains and removes three things:
  1. **Personal attacks:** insults, name-calling, comments on character or appearance.
  2. **Private information about other people:** naming private individuals or their health, discipline, family or contact details.
  3. **Threats.**

  Criticism of a decision, policy or the body is always allowed. Board members and officials may be named in their public role.

**Step D: Practice and go**
- A rehearse-aloud timer.
- **Checklist:** registration confirmed, address and arrive-by time, what to bring, how speakers are called, and remote link instructions.
- For written or email comments, the checklist is replaced by a final review before sending.

**Student rule:** for Student users, Speak up on MUDs, ESDs and Commissioners Court opens on "Send a written comment" instead of "Speak in person." Speaking in person stays available as an option. These bodies often take sign-ups only at the meeting, usually on weekday mornings.

**Languages:** the whole flow, including the AI coach, works in English and Spanish. It notes when a body's process is English-only and points to its translation request option.

**Demo registration recipes:** six bodies get full registration recipes for the demo:
- Houston City Council
- HISD board
- CFISD board
- Commissioners Court
- the demo MUD
- the demo college board

Other bodies show "Registration details coming soon" with a link to the body's own page.

### 8. SMS alerts (published rules)

Texts come only from SMS-eligible bodies: City Council, Commissioners Court (including Flood Control items), school boards, community college boards, MUDs and ESDs.

An item is texted only if it is binding, affects money, schools or property, and hasn't been voted on yet:

1. A proposed tax rate above the no-new-revenue rate (the rate that would raise the same total tax as last year on the same properties).
2. Any bond election or bond issuance vote.
3. An election for a seat on an SMS-eligible body, with the registration deadline and early-voting dates.
4. A school closure, consolidation, rezoning or attendance boundary change vote.
5. A superintendent or college chancellor hire, firing or contract vote.
6. A date change to a meeting with one of the above on its agenda.

**Reminders and deadlines:**
- **7a:** "Registration for [item] opens today."
- **7b:** "Registration for [item] closes in 24 hours."

  Both 7a and 7b go only to users who opted into reminders for that item from Speak up.
- **8:** the HCAD protest deadline. One reminder 7 days before the deadline (usually May 15, or 30 days after the notice is mailed), for Homeowner users.

Port, METRO and regional water authority items go to the weekly report only.

**Other rules:**
- Agenda items extracted by AI must be approved by a teammate in the review queue before they can trigger a text.
- Texts are sent only between 8 a.m. and 8 p.m. Central.
- Opt-in only. Users under 18 need parent consent; without it they get in-app alerts only.
- The rules appear on one pitch slide and on a "Why did I get this text?" page.

### 9. Neutrality and labeling

- "We summarize. We never recommend."
- No AI output takes a side, and every story and item links to its source document.

### 10. Languages

English and Spanish throughout, at about an 8th-grade reading level. Vietnamese is a stretch goal.

---

## Target users

**Student (hero user)**
- Shown first: school board, community college board, METRO, City Council, Commissioners Court.
- Actions: Speak up (written comment by default for MUD, ESD and Commissioners Court); tell a parent; voter registration card if 17 years 10 months or older and 18 by Election Day.

**Parent**
- Shown first: school board, City Council, Commissioners Court, ESD.
- Actions: Speak up; vote in trustee races where the board is elected. In HISD, public comment.

**Renter**
- Shown first: City Council, Commissioners Court, Flood Control, METRO. The MUD and regional water authority are shown as "affects your rent and water bill"; HOA and CenterPoint appear in the "not a government" section.
- Actions: Speak up, vote.

**Homeowner**
- Shown first: MUD, regional water authority, ESD, school district, college district, Commissioners Court, Flood Control, Port, HCAD, HOA.
- Actions: tax receipt; rate hearings; bond and board elections with turnout numbers; the HCAD protest deadline.

## Demo addresses

- **HISD address, inside the City of Houston:** City Council, HCC, the appointed HISD board.
- **CFISD address, unincorporated:** likely a MUD, an ESD, a regional water authority, Lone Star College and an HOA. This is the "governments you didn't know you had" showcase.

P1 picks both addresses on Day 1 and checks their bodies against HCAD records by hand, then confirms them again with the lookup once it works, before locking them in.

## Demo flow (about 3 minutes)

1. Enter the CFISD address → the "Who governs you?" question → "You knew 3 of 9" → results with MUD, ESD and HOA highlighted.
2. Tax receipt: "who sets each dollar," with turnout per slice.
3. The weekly news page, with the lead story. Open "What news coverage says" on a real item that several outlets have covered (picked by P4's watchlist).
4. An SMS alert → Speak up → find your point → register by email with Houston City Council (using the HISD address) → the coach catches a guardrail issue → rehearsal timer.
5. Close with evidence: the real comment delivered, plus the "Who governs you?" results.

---

## Evidence plan

Strongest to weakest:

**1. One real public comment before demo day.**
- P4 checks every demo body's meeting calendar on Day 1. P5 organizes everything after that.
- A teammate uses Speak up, registers, and delivers the comment (or submits it in writing where accepted).
- Bring a photo, a short clip, or the meeting video timestamp.
- Describe it as: "drafted with our app's coaching and delivered at the [body] meeting on [date]."
- **Timing risk:** if the best meeting falls on Day 2 or 3, Speak up won't be ready yet. P4 flags this to the team on Day 1, and the speaking teammate prepares from the body's official speaker instructions instead. In that case, don't describe the comment as drafted with the app's coaching; describe only what actually happened.

**2. "Who governs you?" results.**
- 15–20 classmates (and parents if possible) use the app once lookup works (Days 3–5).
- Report per-body-type counts with percentages beside them, for example "14 of 18 (78%) didn't know they had a MUD."
- Present it as "results from [N] people who used our app," not a study.

**3. UH Hobby School data, as context only.**

---

## Team: five parts

Each teammate owns one part end to end: data, backend and screens. The technical plan lists the exact files and tasks for each part.

Each part also moves the text on its own screens into the English and Spanish translation files. P5 sets up the translation system only (technical plan §17 lists which prototype screens belong to which part).

### Part 1: Lookup and Results ("Who governs me?")

- Picking the two demo addresses and confirming their bodies.
- Address lookup: Census Geocoder, HCAD bulk data, GIS boundaries.
- Rules for when sources disagree, and the 20-address verification.
- HOA matching and the HOA table: management certificates, demo subdivisions, survey subdivisions, top 50.
- The "Who governs you?" question.
- Results screen, body pages, ballot list, not-a-government cards, regional section.
- Tax receipt: data entry for rates, turnout and deadlines at both demo addresses, plus the screen.

### Part 2: Agenda Data (the scraper)

- Legistar adapter (Commissioners Court, HISD).
- PrimeGov check for City Council.
- Gemini extraction adapter (MUD, college board, CFISD if not on Legistar), with the quote check.
- Manual entry fallback.
- Recheck rules: meetings in the next 72 hours on every run, to catch late-added items; past meetings until their results are posted (up to 45 days).
- Linking HISD's Spanish agendas to their Legistar meetings.
- Official sources only for agenda data. News never creates or changes items.
- News collection: the "In the news" headline feed for body pages, plus article text (outlets with no paywall, admin-only storage) and Gemini article-to-item matching for the coverage block.
- Review queue admin page.
- Ingest scheduled job and health checks.
- Golden tests for both adapters.

### Part 3: Weekly News and Alerts

- Rule engine and rule tests.
- Gemini story writing, fact-check and template fallback.
- News coverage perspectives: viewpoint extraction, code checks, the Gemini judge pass, and the "What news coverage says" block.
- Weekly news page and timeline.
- SMS opt-in, phone verification, sending, quiet hours, reminders 7a/7b, protest reminder.
- Twilio registration paperwork (10DLC or toll-free).
- "Why did I get this text?" page and the published rules screen.

### Part 4: Speak up

- Registration engine: deadline math, window states, channel builders.
- The six demo registration recipes.
- Gemini coach (Steps A and C) with guardrails and rate limits.
- Speak up screens: Steps A–D, rehearsal timer, checklist, student rule.
- Coach golden tests in English and Spanish.
- Checking the demo bodies' meeting calendars and running the news watchlist, to find the best meeting for the real public comment and a real item with coverage from 2+ outlets for the demo's coverage block.

### Part 5: Platform, Evidence and Pitch

- Next.js, Supabase and Vercel setup; database schema; security settings; environment variables. The Next.js app and Vercel deployment already exist from the prototype.
- Shared design (app shell, navigation, components) and the English/Spanish translation setup (the system only; each part moves its own screens' text into it).
- Home and stake picker screens.
- Privacy policy and terms pages (P3 needs them live for Twilio registration).
- Demo mode and demo cache.
- Organizing the real public comment, and collecting the "Who governs you?" results from classmates.
- Pitch slides, demo script, backup video.

---

## Seven-day schedule

The real public comment happens on whatever day its meeting falls. Plan around the meeting calendar from Day 1.

### Day 1

- **Everyone:** agree on the shared schema, types and token format, and decide where the prototype and this plan disagree (see "What changed in revision 4").
- **P1 Lookup:** load HCAD bulk data and boundary layers; Census Geocoder working end to end; pick the two demo addresses and check their bodies against HCAD records.
- **P2 Agenda Data:** confirm Legistar works without a token for Commissioners Court and HISD; 2-hour PrimeGov check; check CFISD's agenda system; download sample MUD and college agendas.
- **P3 News and Alerts:** rule engine skeleton; write story-writing prompt drafts; set up Twilio Verify; start Twilio registration as soon as P5's privacy and terms pages are live.
- **P4 Speak up:** research and write the six registration recipes; deadline math; check the six demo bodies' meeting calendars. Also run a **news watchlist**: skim Community Impact, Houston Public Media, the Houston Chronicle and Houston Landing for upcoming fights at the demo bodies. This is for the team only; it helps find the best meeting for the real public comment, and a real upcoming item covered by 2+ outlets with no paywall to use as the demo's coverage block. If that meeting falls on Day 2 or 3, tell the team the same day.
- **P5 Platform and Pitch:** in this order: Supabase project and the full database schema first, so the other parts can connect by midday; then security settings, the shared code files (`gemini.ts`, `db.ts`, `tokens.ts`, `rateLimit.ts`), translation setup, privacy and terms pages, and the Gemini and Vercel checks.

### Day 2

- **P1:** lookup working with merge rules; start the 20-address check; HOA table for demo subdivisions.
- **P2:** Legistar adapter plus golden tests.
- **P3:** rule engine done with tests; story writing plus fact-check.
- **P4:** Step B (registration) working end to end for City Council.
- **P5:** adapt the prototype's app shell, home screen and stake picker to this plan; shared components.
- **Everyone:** once P5's translation setup is in, start moving your own screens' text into the message files.

### Day 3

- **P1:** "Who governs you?" question; results screen; HOA confirm screen; enter tax and election data.
- **P2:** Gemini extraction adapter plus quote check; review queue page.
- **P3:** weekly news page (layout plus data).
- **P4:** coach (Steps A and C) plus guardrails.
- **P5:** demo mode; start classmates using the app.

### Day 4

- **P1:** tax receipt; body pages; ballot list.
- **P2:** ingest scheduled job; health checks; news article fetcher and article-to-item matching (after the agenda adapters are done).
- **P3:** SMS opt-in, sending, quiet hours, reminders; start the news coverage extraction and judge pass.
- **P4:** Steps C and D screens, rehearsal timer, student rule.
- **P5:** collect "Who governs you?" results; begin the pitch outline.

### Day 5

- **P1:** finish the 20-address check; HOA top 50.
- **P2:** harden adapters; golden tests for extraction.
- **P3:** "Why did I get this text?" page; timeline; "What news coverage says" block on the weekly page.
- **P4:** Spanish coach plus guardrail tests.
- **P5:** accessibility and mobile polish; the real comment if a meeting falls here.

### Day 6

Everyone fixes bugs. P5 caches demo data and drafts the slides.

### Day 7

Everyone rehearses the demo flow several times; P5 records the backup video; everyone practices hard judge questions.

---

## Stretch goals

Don't start these unless everything else is done.

- **More bodies:** Harris Health, HCDE, management districts and TIRZs, and housing authorities (Houston and Harris County). *Don't add these unless everything else is done.*
- **Regional section, live:** real data for H-GAC Transportation Policy Council, TxDOT Houston District, TCEQ, PUC, the Subsidence District and SJRA.
- **"I'm going" counter** and group features.
- **"What happened after you spoke":** the vote result and the video timestamp of your comment.
- ~~**"In the news" box on body pages**~~: moved to core in revision 5 (scraper spec D26).
- **News coverage block in Spanish:** translated summaries, with quotes kept in English.
- **News coverage block on body pages, Speak up or item pages.**
- **A full meeting-day screen.**
- **More registration recipes and more auto-imported bodies.**
- **Vietnamese translation.**
- **Weekly report by email.**
- **A scaling slide:** any Legistar government is one row in the sources table.

---

## Open decisions (defaults applied, change if needed)

1. **Tax receipt and stretch bodies:** Harris Health and HCDE taxes appear on every bill, so they're shown as receipt slices (name, rate, who set it) without a full body page.
2. **HOA table:** coverage stops at the top 50 subdivisions in each demo school district, plus survey participants' subdivisions.
3. **Ballot list:** county-level offices only; state offices are not included.
4. **Demo college board:** Lone Star College (matches the CFISD address). HCC shows "Registration details coming soon."
5. **Weekly lead story:** picked automatically (SMS-tier items first, then the soonest registration deadline, then the reader's stake).
6. **Weekly stories:** publish automatically once they pass the fact-check. Only SMS-triggering AI-extracted items go through the review queue.
7. **Cross-device progress:** Speak up progress doesn't carry between devices.
8. **Weekly page without an account:** shareable through a link based on body IDs; no signup needed.
9. **News coverage block:** publishes automatically once it passes the code checks and the Gemini judge pass; there's no human review. Articles with no surviving viewpoint still appear in its Sources list.

---

## Sources

**Problem statement and context**
- UH Hobby School: Harris County primary survey, Feb 2026.
- Texas Standard: HISD takeover extended to 2027.
- Off the Kuff, quoting the Houston Chronicle (2016): MUD counts. This count is old; recheck it.
- TCEQ: Municipal Utility Districts; Water Districts map viewer.

**Bodies and taxes**
- HCAD annual report: https://hcad.org/assets/uploads/pdf/resources/2025/HCAD-2024-Annual-Report1.pdf
- Harris County OCA, review of ESDs: https://oca.harriscountytx.gov/Media/Blog/review-of-emergency-services-districts-esds-in-harris-county
- Harris County Tax Office, 2025 rate notices (Port, Flood Control): https://www.hctax.net/About/Announcements/Tax%20Hearing%20Notices/2025/2025%20Notice%20of%20Adopted%20Tax%20Rates%20HF,%20HP,%20HCHD%2009-19-2025.pdf
- Texas Legislature, SB 1299 bill analysis (regional water authorities): https://capitol.texas.gov/tlodocs/83R/analysis/html/SB01299F.htm
- Texas Property Code Chapter 209 (HOA management certificates). Confirm the exact section before the pitch.

**Public comment rules**
- Texas Gov't Code §551.007 (public testimony): https://texas.public.law/statutes/tex._gov%27t_code_section_551.007
- Commissioners Court appearance request: https://agenda.harriscountytx.gov/Speak-at-Court/Appearance-Request-Form
- Houston City Council meetings info: https://houstontx.gov/council/meetingsinfo.html
- HISD board meetings and speaker registration: https://www.houstonisd.org/fs/pages/231931

**Agenda data**
- HISD agendas on Legistar: https://www.houstonisd.org/agenda
- Commissioners Court agenda site: https://agenda.harriscountytx.gov/
- Legistar Web API examples: https://webapi.legistar.com/Home/Examples

**Tools and services**
- Census Geocoder geographies.
- TechCrunch on Hamlet.
- Twilio: 10DLC registration requirements.
