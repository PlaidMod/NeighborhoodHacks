# Plan stress test

Every teammate goes through these questions once, with their own agent. They come from the owner's review of the plan on Oct 18, 2026 (PlaidMod, P5). The goal is to find where teammates disagree before building, not to change the plan.

## Rules for agents

1. **When to run it.** At the start of a session, get your teammate's name with `git config user.name`. Then check two places: "Already done" below, and `agent_handoff.md` for an entry titled "Stress test answers: <that name>". If neither lists them, tell your teammate the stress test is waiting and run it before other work, unless they say to skip it or do it later. If they skip, record "skipped" in a handoff entry and don't ask again unless they ask. **Exception:** if you're running autonomously under a `.plans/` spec (for example P2's scraper spec), don't stop for this. Note in that spec's progress log that the stress test is pending, and run it at the next interactive session.
2. **How to ask.** Go in rounds. Number each question and give the recommended answer, worded so "yes" accepts it. Show the owner's answer too, so your teammate can see where they differ. Wait for answers before starting the next round.
3. **Check dates first.** These facts were checked on Oct 18, 2026. Drop any question whose date has passed and say so. Before asking about meeting dates or sign-up windows, re-check them.
4. **Finding facts is your job.** Don't ask your teammate for anything you can look up. Background facts and sources are in `agent_handoff.md`, in the "Planning review" entry dated 2026-10-18.
5. **Record the answers** in one new `agent_handoff.md` entry titled "Stress test answers: <name> (<part>)". List each question number with its answer, then every answer that differs from the owner's.
6. **Don't change the plan files or this file.** That's the owner's standing instruction. If your teammate wants a plan change, write it in their handoff entry as a proposal for the team.
7. **Follow `INSTRUCTIONS.md`.** Don't bring up Gemini's age terms beyond Q10; the owner says the team has that handled.
8. **P2's spec wins for P2.** `.plans/agent-scraper-spec.md` (v1.2) was written after some of these questions were first answered. Where a question touches P2's work (Q11, Q12, Q15, Q16), the spec's choice stands, and the question only asks whether your teammate sees a problem with it.

## Already done

- **PlaidMod (P5):** Oct 18, 2026. Answers are in the "Planning review" entry in `agent_handoff.md`.

---

## Round 1

❓ **Q1** - **Your part**: Which of the five parts (P1–P5) is yours? See "Team: five parts" in `Project_Plan.md`.

➡️ Whichever the team assigned you. **Owner:** P5.

---

❓ **Q2** - **Eligible and registered**: Neighborhood Hacks 2026 is for high school students only, with teams of up to 5, and each member registers individually on Devpost. You're a high school student and you've registered.

➡️ Yes. If you haven't registered, do it today. **Owner:** yes.

---

❓ **Q3** - **Work to the real deadline**: Submissions close **Fri Oct 23, 2026, 11:59 PM CST**, so the plan's seven days don't fit. Proposed schedule:
- **Mon:** setup and the Day 1 checks.
- **Tue–Wed:** build.
- **Thu:** feature freeze at noon, fix bugs, record the video.
- **Fri:** write the Devpost description and submit by 6 PM CST.

➡️ Yes. **Owner:** yes.

---

❓ **Q4** - **"Done" means the demo flow works**: Every step of "Demo flow" in `Project_Plan.md` works end to end for the two demo addresses, plus the evidence. Anything not in the demo flow waits until it works.

➡️ Yes. **Owner:** yes.

---

❓ **Q5** - **The video replaces the pitch**: There's no live demo or Q&A. Judges see only the Devpost write-up, a 2–6 minute video and the public repo. The proposal is a video of about 4 minutes:
- open with the problem
- show the demo flow as a screen recording with voiceover
- close with the evidence

There are no slides. Demo mode stays, to get a clean recording.

➡️ Yes. **Owner:** yes.

---

❓ **Q6** - **Disclose AI use in the write-up**: The rules require disclosing AI tools in the written description (rules §4), and misrepresenting AI use can get you disqualified (§9). The write-up gets a "Tools and AI we used" section, written by a teammate rather than an agent, as `INSTRUCTIONS.md`'s stop-and-ask rule requires. `INSTRUCTIONS.md` itself stays as it is.

➡️ Yes. **Owner:** yes.

---

❓ **Q7** - **The name is ShowUp HTX**: It replaces "[App Name]" everywhere.

➡️ Yes. **Owner:** yes.

---

❓ **Q8** - **Build at the repo root and leave `web/` alone**: The website in `web/` was only a test. The new app is built at the repo root using `Technical_Implementation_Plan.md` §2. `web/` stays untouched, then gets deleted before submission once sohankamsala agrees. The reason: judges read the public repo, and the prototype makes up MUDs. **If you're sohankamsala:** is it OK to delete `web/` before submission?

➡️ Yes. **Owner:** yes.

---

❓ **Q9** - **Keep only the prototype's look**: Carry over the design system: `web/DESIGN.md`, the color tokens, the fonts and the restyled shadcn components. Nothing else comes from the prototype.

➡️ Yes. **Owner:** yes.

---

❓ **Q10** - **An adult owns the paid accounts**: An 18+ teammate or a parent owns the Google Cloud billing account and the Gemini key, plus any paid Twilio account. Can you be that person, or do you know who will be?

➡️ Yes. Name the person on Monday morning. **Owner:** yes.

---

❓ **Q11** - **Gemini setup**: Use the paid tier. On the free tier Google may use and human-review what you send, which breaks the plan's privacy promise. Use one model everywhere: `gemini-3.8-flash`, with structured JSON output. **Exception for P2:** the scraper spec (D17) uses Flash by default, retries with Pro when validation drops more than 20% of items, and reads model names from env vars. That stands for P2.

➡️ Yes. **Owner:** yes (answered before the scraper spec; the spec wins for P2).

---

❓ **Q12** - **Stay on Vercel's free plan**: Hobby runs a scheduled job at most once a day. Keep one daily run, and add a manual trigger (calling the job with `CRON_SECRET`) to use before testing and before recording the video. **For P2's data job,** the scraper spec (D5) has GitHub Actions call `/api/cron/ingest` every 30 minutes, with the daily Vercel run as backup. P5 adds the `CRON_SECRET` repo secret and the deployed URL.

➡️ Yes. **Owner:** yes (answered before the scraper spec; the spec wins for the data job).

---

❓ **Q13** - **No classmate survey until the real lookup works**: The prototype's ZIP lookup makes up MUDs, so survey results collected on it would be wrong. The survey waits until the Census + HCAD lookup works.

➡️ Yes. **Owner:** yes.

---

❓ **Q14** - **What Speak up may write for the user**: Only a factual opener built from what the user entered and the official item title: "My name is ___, I'm a ___ in ___, and I'm speaking on item ___." The user writes their position, experience, ask and closing.

➡️ Yes. **Owner:** yes.

---

## Round 2 (after round 1, because these depend on Q1 and Q4)

❓ **Q15** - **What waits until the demo flow works**:
- the other four registration recipes (City Council and HISD stay)
- reminders 7a/7b and the protest reminder
- the timeline
- the "Why did I get this text?" page
- HISD Spanish agenda linking (the scraper spec defers it too)
- the HOA top-50 list
- Spanish coach tests
- Port, METRO and water authority stories

Look closely at the items in your part. **Not on this list:** health checks and results-from-minutes. The owner first put them here, but the scraper spec builds them in Phase 1 (Steps 10 and 12), and the spec wins for P2.

➡️ Yes. **Owner:** yes.

---

❓ **Q16** - **Agenda data sources follow the scraper spec** (mainly P2): `.plans/agent-scraper-spec.md` v1.2 already decides these:
- **Legistar:** Commissioners Court and HISD.
- **BoardBook:** CFISD (HTML parsing, no Gemini).
- **PrimeGov:** City Council. Meetings come from JSON; items come from the agenda PDF through Gemini.
- **Gemini extraction:** Lone Star's PDFs and the demo MUD, **HC MUD 489**.
- **YAML manual entry** as a fallback.

It also adds a news "might come up" box on body pages: headline links only, never items, alerts or stories. With three build days, do you see a problem with this plan? If P2 falls behind by Wed, which adapters should fall back to manual entry first?

➡️ Yes to the spec as written. If P2 is behind on Wed, move City Council (PrimeGov plus PDF) and CFISD to manual entry first, since the demo needs their items but not live adapters. **Owner:** answered an earlier version (Legistar for HISD only, manual for the rest, skip PrimeGov) before the spec existed. The spec wins.

---

❓ **Q17** - **Your Day 1 still fits** (P1, P3, P4): Revision 4 moved tasks onto three parts:
- P1 picks the demo addresses.
- P3 does the Twilio registration.
- P4 checks meeting calendars and runs the news watchlist.

With the shorter schedule, does your Monday still fit?

➡️ Yes. If not, say which task should move. **Owner:** not asked.

---

❓ **Q18** - **Where not to give the real comment**: Not HISD on Oct 22. That agenda is only teacher employment hearings that name the teachers, and commenting on them would break the app's own privacy guardrail. Skip CFISD on Mon Oct 19 (that date has probably passed).

➡️ Yes. **Owner:** yes.

---

## Round 3 (the owner wasn't sure about these)

❓ **Q19** - **Real alert texts, with a fallback** (mainly P3): Twilio's free trial can only send preset templates, not custom alerts. The proposal:
- An adult upgrades Twilio, and P3 submits "Sole Proprietor" registration on Monday. That needs a real US mobile number and address, and P5's privacy and terms pages must be live first.
- P3 builds against the real Twilio API either way.
- **If it's approved by Thu noon,** the video shows a real text arriving.
- **If not,** the video shows the exact generated message on a phone mockup labeled "preview, not delivered."

➡️ Yes. **Owner:** unsure.

---

❓ **Q20** - **Survey timing** (P1, P5): Send it Wed evening and count at Thu noon for the video. Aim for 15 responses, with 10 as the minimum. Report raw counts with percentages beside them, described as "results from N people who used our app," not a study.

➡️ Yes. **Owner:** unsure.

---

❓ **Q21** - **Register with the app for City Council on Oct 27** (P4, P5): City Council's **Tue Oct 27, 5 PM** session already takes sign-ups on the city's online form. Speakers can talk about any topic for 1–3 minutes, in person. The proposal:
- On Wed Oct 21 or Thu Oct 22, a teammate uses Speak up to register on their own topic, by the online form or by email to speakers@houstontx.gov.
- The video shows the registration and the city's "received" screen.
- The write-up says "registered," not "delivered."
- The teammate then speaks on Oct 27.
- P4's City Council recipe needs a "your own topic" path for this.

Also say whether you'd be willing to be that teammate.

➡️ Yes. **Owner:** unsure.
