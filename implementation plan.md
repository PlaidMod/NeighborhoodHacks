# Project Plan and Mock Implementation Plan (fixed)

**Date:** Oct 18, 2026
**Working name:** [App Name] (placeholder ideas: "MyLayers", "WhoDecides")

---

## What changed from the original plan

The plan keeps the same template and structure. The fixes below correct facts that were wrong or unverified, put back features from our original idea that went missing, and add the council's twists.

### Facts fixed

| Original said | Problem | Fixed to |
|---|---|---|
| "Most couldn't choose in several county races" (UH survey) | Close, but those voters were undecided in primary candidate races. That is not the same as not knowing local governments. | Exact numbers: 54% to 77% undecided in several countywide primary races (Feb 3–10, 2026, 2,000 likely voters per party). Used only as "even engaged voters are unsure." |
| "Texas has over a thousand MUDs" | Not verified. The last state count we found was 949 MUDs in Texas, 389 in Harris County (reported 2016). | "Harris County alone has hundreds of MUDs." Recheck the current count on the TCEQ district list before the pitch. |
| Harris County Flood Control listed as its own deciding body | Flood control has its own tax rate, but Commissioners Court makes its decisions. | Shown as its own tax slice, but its alerts come from Commissioners Court agendas. |
| Constables and justices of the peace listed with the bodies | They are elected officials, not boards that hold public meetings with agendas. | Shown on the ballot list only, with no agenda tracking. |
| Parent: "vote in trustee races" | In HISD the state-appointed board of managers holds power through at least June 2027, so voting for trustees changes little there for now. | Parent action depends on the district; in HISD it's public comment. |
| Student: voter registration "if 17+" | Texas allows registration at 17 years and 10 months, if you'll be 18 by Election Day. | Fixed everywhere. |
| "How is this different from Hamlet or Legistar?" | Legistar is an agenda-posting system that governments use, not a follow tool. Hamlet is an AI meeting-video startup that sells topic alerts to businesses. | Answer rewritten to describe each one correctly. |
| "We verified 20 addresses against HCAD" | Written as if it were already done. | Written as a task: "we will verify 20 addresses." |
| "I live under 9 governments" | A made-up number. | "[N]": fill in the real count from a teammate's actual address. |
| "Report before vs after as percentages" | Percentages from 15–20 people look like a study and invite pushback. | Report raw counts ("14 of 18"), with percentages beside them. |
| Python/FastAPI backend, Tesseract OCR, email service | More pieces than the team's stack needs, and scanned-PDF OCR is a time sink. | Next.js + Supabase (Postgres with PostGIS) + Vercel. Scanned PDFs get typed in by hand. Email is a stretch goal. |

### Features from our original idea that were missing (put back)

- The "draft your two-minute comment" tool, which is the main student feature.
- MUD turnout numbers ("how few people typically vote").
- The "one real public comment before demo day" goal.
- Minimal personal data as a design rule.

### Council twists added

- "Who sets each dollar" tax receipt, with turnout per slice.
- Rules-aware comment coach: sign-up deadline countdown, speaking time limit, rehearsal timer, written-comment option.
- "I'm going" counter on each meeting.
- "Name your governments" quiz as the first screen; it doubles as the survey.
- Source link on every summary (the original plan already had this; kept and enforced).

---

## Part 1: Project plan

### Problem statement

Houston-area residents live under a stack of overlapping local governments:

- City Council, if they live inside a city.
- Harris County Commissioners Court, which also runs flood control.
- A school board.
- Often a Municipal Utility District (MUD). MUDs are small special districts that set part of your property tax, issue bonds and hold elections very few people vote in. Harris County alone has hundreds of them.

Decisions about people's money, schools and neighborhoods are made in meetings almost nobody hears about until it's too late to act. Even engaged voters struggle. In a February 2026 University of Houston Hobby School survey of likely primary voters, 54% to 77% were still undecided in several countywide races. Students know even less.

In HISD the state replaced the elected school board. Students and families can't vote those board members out, so public comment is one of the few ways left to be heard.

**One-line pitch:** "Type your address, see every government that affects you, including ones you've never heard of, and get help speaking up before the vote."

### Solution summary

- **"Name your governments" quiz (first screen, new).** Before seeing results, the user tries to name their local bodies. The same quiz runs again later. This is the before-and-after survey, built into the app.
- **Address lookup.** Shows every local governing body for an address, ordered by how much it affects you, with a one-line plain-English description of each. MUDs are highlighted as "a government you probably didn't know you had."
- **"Who sets each dollar" tax receipt (new).**
  - A bar that splits a typical yearly property tax bill for that address into slices: school district, county, flood control, MUD, and others.
  - Each slice shows its dollar amount, which body set the rate, when they voted, and how many people voted in that body's last election (for example, "this bond passed with N votes").
  - Labeled as an estimate before exemptions.
- **"What's your stake?" picker.** Student, Parent, Renter, Homeowner (pick any). First-time voters use the student path. This decides what's prioritized.
- **Comment coach, the main student feature (put back and upgraded).**
  - Pick an agenda item, read a plain-language explanation of it, and get help writing a short comment that cites that item.
  - Shows that meeting's real rules: sign-up deadline countdown, speaking time limit, and whether you must attend in person.
  - Rehearse-aloud timer that stops at the limit.
  - Option to send a written comment instead, where the body accepts them.
- **"I'm going" counter (new).** A button on each meeting. Classmates tap it and see how many others are going.
- **Three update layers:**
  - **Weekly summary page**, styled like a local news page, with two sections: "Coming up: you can still act" (date and how to weigh in) and "Decided this week" (FYI).
  - **SMS alerts** only for events that meet the published rules (see Published alert rules), sent before the vote with the date and the deciding body.
  - **Live timeline:** the full record of every update (new agendas, posted decisions), with no notifications. Presented as "the full record behind the summary."
- **Every item includes:**
  - a "what this means for you" line (for example, "could add about $X/year on a $250K home, before exemptions"), with a renter version
  - a "how to weigh in, by when" line
  - a link to the original source document
- **Neutrality rule, stated in the app:** "We summarize. We never recommend." The comment coach helps users say their own view; it never suggests a side.
- **Languages:** English and Spanish, written at about an 8th-grade reading level. Vietnamese is a stretch goal.

### Target users and what each stake gets

| Stake | Bodies shown first | Actions offered |
|---|---|---|
| **Student** (hero user) | School board, city council (if in a city), Commissioners Court | Use the comment coach; tap "I'm going"; tell a parent. Voter registration card if 17 years 10 months or older and 18 by Election Day. |
| **Parent** | School board, city, county | Attend or comment. Vote in trustee races where the board is elected; in HISD, public comment, since the board of managers is appointed. |
| **Renter** | City, county, flood control; MUD shown with "affects your rent" framing | Attend, comment, vote. |
| **Homeowner** | MUD, county, school district taxes, flood control | Tax receipt; rate hearings, bond elections, MUD director elections, with turnout numbers. |

**Hero user for testing and the demo:** Student, since that's the team and the classmate survey pool. Parent is second, as "the bill a student brings home."

### Published alert rules (SMS tier)

An item is sent by text only if it is **binding**, **affects money, schools or property**, and **has not yet been voted on**. Specifically:

1. A proposed tax rate above the no-new-revenue rate, from any body at your address. (In Texas, the no-new-revenue rate is the rate that would raise the same total tax as last year on the same properties.)
2. Any bond election or bond issuance vote.
3. A MUD director or school trustee election, with the registration deadline and early-voting dates.
4. A school closure, consolidation, rezoning or attendance boundary change vote.
5. A superintendent hire, firing or contract vote.
6. A date change to a meeting where one of the above is on the agenda.
7. **New:** a reminder when the public-comment sign-up deadline for an item matching rules 1–5 is less than 24 hours away (users who tapped "I'm going" only).

Everything else goes to the weekly summary or the timeline. Show these rules on one slide and on a "Why did I get this text?" page in the app.

**Who can get texts:** opt-in only. Users under 18 need parent consent; without it they get in-app alerts only.

### Evidence plan

Three pieces of proof, from strongest to weakest: one real comment delivered, the before-and-after survey, and the UH data.

**1. The survey (Day 1 before, Days 6–7 after).** Run it with 15–20 classmates (and parents if possible) before anyone sees the app. Use the same questions in the app's first-screen quiz so later users add to the data.

- Can you name your MUD, or say whether you live in one?
- Who decides your property tax rate?
- Can you name your school board trustee (or, in HISD, say who runs the board)?
- When does your school board meet next?
- When is the next local election at your address?
- Name one local decision this year that affected you.

Report results as raw counts with percentages beside them ("14 of 18, 78%, couldn't name their trustee"). Present it as "a quick survey of [N] classmates," not a study.

**2. One real public comment before demo day (put back from the original idea).**

1. Day 1: check the school board and MUD calendars for any meeting with public comment before demo day.
2. A teammate drafts a comment in the app, signs up and delivers it (or submits it in writing where accepted).
3. Bring a photo, short clip, or the meeting video timestamp.
4. Describe it accurately: "drafted in our app and delivered at the [body] meeting on [date]." The app does not submit comments for you.

**3. UH Hobby School data as context only:** "even engaged likely voters were 54–77% undecided in several countywide primary races." Then: "ordinary students know even less," backed by your own survey.

---

## Part 2: Mock implementation plan

This is an illustrative plan, updated to match the team's existing setup (Next.js, Supabase, Vercel, and the skills and MCP servers already installed).

### Architecture

- **Frontend and backend:** Next.js (React) with API routes, mobile-first, no login needed for lookup. One codebase, so no separate Python server.
- **Database:** Supabase Postgres with the PostGIS extension turned on (for "which boundary is this point in?" queries).
- **Scheduled jobs:** Vercel Cron, one daily job for fetching and parsing and one weekly job for the summary.
- **Messaging:** Twilio for SMS. On Day 1, publish a privacy policy page and a terms page, then start 10DLC or toll-free registration; Twilio now requires both pages for registration. Email is a stretch goal.
- **AI (comment coach only):** one LLM API call that drafts from the agenda item's text. Summaries use templates, not AI.
- **Hosting:** Vercel. Supabase hosts the database.

### Data sources

| What | Source | Notes |
|---|---|---|
| Address → coordinates, county, city, school district | US Census Geocoder (free, no key) | Its "geographies" lookup also returns county, incorporated place (city) and unified school district for the point, which saves three boundary files. |
| MUD and other water districts | TCEQ water district map layer | Can be queried by point directly, or downloaded once into PostGIS. Cross-check with HCAD jurisdiction codes. |
| City of Houston council districts | City of Houston GIS open data | Only for addresses inside the city. |
| Commissioners Court precincts | Harris County GIS | |
| School trustee districts | District GIS files, or typed in by hand for the demo district | |
| Flood control | Countywide | Every Harris County address gets it; decisions come from Commissioners Court. |
| Agendas and decisions | Hand-made source list (one row per body: name, agenda URL, format, parser template) | Check what each body uses: an agenda platform, a city website, or a law firm or management company page for MUDs. |
| Public comment rules | Each body's posted policy, typed in by hand | Sign-up deadline, time limit, in-person or written. |
| Tax rates | County tax office Truth-in-Taxation rate tables and HCAD jurisdiction data | Adopted, no-new-revenue and voter-approval rates. |
| Election turnout | County election results, or MUD canvass records in the board minutes | Typed in by hand for the demo bodies. |

### Data model (main tables)

Tables marked **new** support the twists. Everything else is from the original plan, with small fixes.

| Table | Columns | Change |
|---|---|---|
| `bodies` | id, name, type (city, county, school, MUD, etc.), description, plain-English summary, meeting info URL, decided_by_body_id | Fixed: decided_by_body_id lets flood control point to Commissioners Court. |
| `boundaries` | body_id, geometry | |
| `sources` | body_id, url, format (html, text_pdf, scanned_pdf), parser_template, last_checked, last_success | scanned_pdf sources are entered by hand. |
| `documents` | id, source_id, fetched_at, raw_file, extracted_text | |
| `items` | id, document_id, body_id, title, item_type, meeting_date, status (upcoming or decided), tier (sms, weekly, timeline), rule_fired, what_it_means, how_to_weigh_in, source_url | Fixed: rule_fired stored for the "Why did I get this?" page; source_url replaces source_line. |
| `comment_rules` | body_id, signup_opens, signup_deadline, minutes_per_speaker, reduced_minutes_rule, in_person_only, written_accepted, policy_url | **New**, for the comment coach. |
| `tax_rates` | body_id, year, adopted_rate, no_new_revenue_rate, voter_approval_rate, source_url | **New**, for the tax receipt. |
| `elections` | body_id, date, type (director, trustee, bond), votes_cast, registered_voters, result, source_url | **New**, for turnout numbers. |
| `going` | item_id, anon_id, created_at | **New**, for the "I'm going" counter. Anonymous browser id, no name. |
| `quiz_responses` | id, phase (before or after), answers, created_at | **New.** Anonymous; no address or name stored. |
| `users` | id, address_point, stakes, phone (optional, opt-in), language, is_minor, parent_consent | Email removed (stretch goal). |
| `user_bodies` | user_id, body_id (computed once at sign-up) | |
| `alerts_sent` | user_id, item_id, sent_at, channel | |

**Comment drafts are not stored on the server.** They stay in the user's browser.

### Processing pipeline (runs daily)

1. **Fetch:** for each source with an automatic importer (one body for the hackathon), download the latest agenda or minutes and store the raw file.
2. **Extract:** HTML with a parser library; text PDFs with a PDF text library. Scanned PDFs are not processed automatically. A teammate types their items in by hand (OCR was cut because it takes too long to get reliable).
3. **Parse:** apply the source's template parser to split the document into items with titles, dates and amounts.
4. **Classify:** run the rule engine (below) to set item_type, tier and rule_fired.
5. **Enrich:** fill "what this means for you" and "how to weigh in, by when" from templates, using tax_rates and comment_rules.
6. **Store and route:** save items. SMS-tier items queue alerts for every opted-in user whose bodies include that body (or its decided_by body). Everything else appears in the timeline and the weekly summary.
7. **Health check:** flag any source that failed to fetch, returned nothing new for too long, or didn't match its template. Hand-entered bodies get a "last checked by hand" date instead.

### Rule engine (example logic, written as pseudocode)

```yaml
rules:
  tax_rate_increase: text matches "proposed tax rate" or "adopt tax rate"
                     AND parsed_rate > tax_rates.no_new_revenue_rate
  bond:              text matches "bond" AND ("election" or "issuance" or "sale")
  board_election:    text matches ("director" or "trustee") AND "election"
  school_change:     text matches "closure" or "consolidation" or "rezoning"
                     or "attendance boundary"
  superintendent:    text matches "superintendent" AND ("appoint" or "hire"
                     or "terminate" or "employment contract")
  meeting_moved:     item is a date change AND that meeting has an item
                     matching any rule above

for each item:
  if any rule matches AND item.status == upcoming:
    tier = sms; rule_fired = that rule
  else if item.item_type in (tax, bond, budget, school, zoning, property):
    tier = weekly
  else:
    tier = timeline

daily:
  for each sms-tier item with a sign-up deadline in the next 24 hours:
    remind users who tapped "I'm going" on it (rule: signup_reminder)
```

**Fixes from the original:**

- "Affects money, schools or property" is now a defined list of item types, not a vague check.
- The superintendent rule matches "employment contract," not just "contract." Plain "contract" would fire on every vendor contract.
- The tax rule reads the no-new-revenue rate from `tax_rates` instead of guessing it from the agenda.
- Store which rule fired so the "Why did I get this text?" page can show it.

### Summary templates (no AI needed)

- **Tax:** "[Body] will hold a public hearing on [date] on a proposed tax rate of $[rate] per $100 of value. For a $250K home, that's about $[amount] a year before exemptions. Renters: this affects what your landlord pays. How to weigh in: attend on [date] at [location] (sign up by [deadline]) or contact [link]."
- **Bond:** "[Body] is voting on [date] on $[amount] in bonds for [purpose]. Last time, [votes_cast] people voted in this body's election. How to weigh in: [method] by [deadline]."
- **Election:** "[Body] election on [date]. Register by [deadline]. Early voting runs [dates]. In the last one, [votes_cast] people voted."
- **School change:** "[School board] votes on [date] on [summary]. Sign up to speak by [deadline]; each speaker gets [minutes] minutes."

Every template ends with a link to the source document.

### Tax receipt (new)

1. Look up every taxing body at the address (from `user_bodies`).
2. For each, read `adopted_rate` from `tax_rates`.
3. Slice amount = rate × (home value ÷ 100). Default home value $250K; the user can change it.
4. Draw a stacked bar, one slice per body, sorted largest first.
5. Under each slice: who set it, the vote date, last election turnout from `elections`, and the source link.
6. Label: "Estimate before exemptions. Check your real bill at HCAD."

### Comment coach (put back, upgraded)

1. The user picks an agenda item. The app shows the plain-language summary and the source link.
2. The app reads `comment_rules` for that body and shows: "Sign-up closes [deadline] (countdown)", "[N] minutes per speaker", "In person only" or "Written comments accepted."
3. The user answers three short prompts: who you are ("a junior at ___"), how this item affects you, and what you want the board to do.
4. One LLM call turns those answers into a draft that quotes the agenda item number and fits the time limit (about 130 spoken words per minute). The prompt tells it to keep the user's view and never add one.
5. **Rehearse:** a timer counts down from the limit while the user reads aloud; the draft can be trimmed until it fits.
6. **Finish:** a checklist covering how to sign up, what to bring, and where to go, or a copy-ready version for written comment.

### Weekly summary generation (runs each week)

1. For each user, collect items for their bodies from the past week and the next two weeks.
2. Rank by stake: items matching the user's chosen stakes come first.
3. Layout: "Coming up: you can still act" (sorted by deadline, with the "I'm going" count), then "Decided this week," each item linking to its source.
4. Shown as a page in the app. Email delivery is a stretch goal.

### Frontend screens

- **Quiz (new, first screen):** "How many of your local governments can you name?" Skippable, anonymous.
- **Home:** address box and the one-line pitch.
- **Results ("Your governments"):** every body ordered by impact; MUD highlighted; tap any body for a plain-English explanation and next meeting.
- **Tax receipt (new):** the stacked bar with who set each slice and turnout.
- **Stake picker:** Student / Parent / Renter / Homeowner, plus language choice.
- **Meeting and item page:** summary, source link, "I'm going" button and count, "Draft a comment" button.
- **Comment coach (new):** rules panel with countdown, three prompts, draft, rehearsal timer, finish checklist.
- **Weekly page:** the news-style layout.
- **Timeline:** the full record, filterable by body.
- **Alerts setup:** phone opt-in, the published rules, parent consent for under 18.
- **"Why did I get this?" page:** the rule that fired and the source link.
- **Voter registration card (students):** checks the 17-years-10-months rule and links to the official state page to check or register. The app does not register anyone.
- **About:** neutrality statement, data sources, privacy policy and terms (needed for Twilio registration).

### Privacy and safety

- Store only a coordinate point, not the full address, after the lookup. Lookup without saving works with no account.
- Phone is optional and opt-in. No email unless the stretch goal is built.
- Under 18: SMS only with parent consent; otherwise in-app alerts only. For the hackathon, show the consent step but don't build real parent verification.
- Quiz answers and "I'm going" taps are anonymous.
- Comment drafts stay in the user's browser and are never stored on the server.
- Neutral language, every item sourced; the comment coach never adds an opinion.

### Testing

- **Address verification:** run 20 real addresses through the app and HCAD's jurisdiction list by hand; show the match table to judges.
- **Parser golden tests:** save 5–10 real agendas from the auto-imported body and their expected parsed items; rerun after every change.
- **Rule tests:** sample items for every rule, plus near-misses that should not trigger (for example, a vendor "contract" that must not fire the superintendent rule, or a tax rate at the no-new-revenue rate).
- **Tax receipt check:** for 3 demo addresses, compare the receipt's total with the real HCAD bill and explain any gap (usually exemptions).
- **Comment coach check:** draft 5 comments and confirm each cites its agenda item, fits the time limit, and adds no opinion the user didn't give.
- **Demo fallback:** cache all data for the demo address and pre-record a backup video.

### Seven-day schedule (example for 4 teammates: A, B, C, D)

Day 1 has the three tasks with waiting times: Twilio registration, the meeting calendar check, and the "before" survey.

| Day | A (lookup + data) | B (sources + rules) | C (backend + coach) | D (frontend + evidence) |
|---|---|---|---|---|
| 1 | Set up Census Geocoder + TCEQ MUD lookup end to end | Build the source list for 3–4 bodies (one MUD, school board, Commissioners Court, City Council); pick the ONE to auto-import; download sample agendas | Set up Next.js + Supabase (PostGIS on), data model | Publish privacy + terms pages, start Twilio registration; run the "before" survey; check meeting calendars; pick the demo address |
| 2 | Verify lookup with 20 addresses against HCAD | Template parser for the auto-imported body; type in the other bodies' items by hand | Fetch and extract steps | Home, quiz and results screens |
| 3 | Tax rates + turnout data into `tax_rates` and `elections`; tax receipt math | Rule engine + rule tests | Enrich step and summary templates; type in `comment_rules` | Stake picker, body and item pages, tax receipt screen |
| 4 | SMS sending and alert queue (verified phones if registration isn't done) | Parser golden tests and health checks | Comment coach: prompts, LLM draft, rehearsal timer | Weekly page, timeline, "I'm going" button |
| 5 | "Why did I get this?" page and published rules screen | Harden the importer, or add one more source | Spanish templates and plain-language pass | Mobile polish and accessibility checks; teammate delivers the real comment if a meeting falls here |
| 6 | Everyone: run the "after" survey; fix bugs; cache demo data. Draft pitch slides. | | | |
| 7 | Everyone: rehearse the 3-beat pitch several times; record the backup video; practice the hard judge questions. | | | |

The real comment happens on whatever day the meeting falls. **Plan around the calendar from Day 1, not around this table.**

---

## Stretch goals (only if time allows)

- Vietnamese translation.
- Weekly summary by email.
- More MUD parser templates (more auto-imported bodies).
- "What happened after you spoke": after the meeting, show the vote result and the video timestamp of your comment.
- A scaling slide showing how the source list extends to other Texas districts.

---

## Sources

- UH Hobby School: Harris County primary survey, Feb 2026: undecided shares of 54% to 77% across several countywide races.
- Texas Standard: HISD takeover extended to 2027.
- Off the Kuff, quoting the Houston Chronicle (2016): 949 MUDs in Texas, 389 in Harris County. This count is old; recheck it.
- TCEQ: Municipal Utility Districts.
- TCEQ Water Districts map viewer and MUD map layer.
- Census Geocoder geographies: returns county, incorporated place and unified school district for an address.
- TechCrunch on Hamlet: AI meeting summaries and topic alerts for enterprise customers.
- Twilio: privacy policy and terms now required for 10DLC registration.
