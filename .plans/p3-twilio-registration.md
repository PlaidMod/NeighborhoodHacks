# P3: Twilio texting registration (paperwork)

Owner: P3 (sohankamsala). Plan refs: `Project_Plan.md` §8, `Technical_Implementation_Plan.md` §11, §19, §22.

> **Status, Oct 22, 2026: not being submitted for the hackathon.** Twilio asks the account owner to verify their identity with an ID, and the team decided not to send one. Carrier review would also take days. Alerts go out as browser notifications instead (`Technical_Implementation_Plan.md` §11), and text sign-up stays a labeled preview. Everything below still applies if an adult registers a sender later. The privacy and terms pages now also describe browser notifications, so recheck §4's wording against them before submitting.

Texts to real users need a registered sender. This file has everything to paste into Twilio, plus what has to happen first. **An agent can't submit any of this:** it needs a real account, a real person's identity and payment, and the team owner's sign-off. Check every requirement against the Twilio Console when you start; Twilio and carriers change these forms often.

---

## 1. Before you can submit

- [ ] **Account owner is an adult.** Team decision (`agent_handoff.md`, planning review, answer 4): any paid Twilio account is owned by an 18+ teammate or a parent.
- [ ] **Privacy policy and terms pages are live** at public URLs. P5 owns these. Twilio's reviewers check them. They must include the SMS language in §4 below.
- [ ] **Opt-in screen is live** (or a screenshot of it is hosted), showing the consent text in §3. Reviewers check that consent is collected.
- [ ] **Decide the sender type** (see §2) and upgrade from trial if needed.
- [ ] **A Verify Service exists** (Console → Verify → Services). Copy its SID into `TWILIO_VERIFY_SID`.
- [ ] **A Messaging Service exists** with the registered number in its sender pool. Copy its SID into `TWILIO_MESSAGING_SERVICE_SID`.
- [ ] **Inbound webhook** on the Messaging Service points to `https://<deployed-url>/api/twilio/inbound` (P3 builds this route once P5's app exists).

## 2. Which registration

| Option | What it needs | Notes |
|---|---|---|
| **10DLC, Sole Proprietor** | A real US mobile number for an OTP check, the owner's name and address, and the website, privacy and terms URLs | Planning review: campaign review can take several days. One campaign, low volume, which fits us. |
| **Toll-free number + toll-free verification** | A toll-free number, business/website info, the opt-in description and sample messages | Also takes days. No brand registration. |

**Recommendation:** start whichever the adult account owner can finish **today**. With submissions closing **Fri Oct 23, 11:59 PM CST**, approval may not land in time either way.

**If it isn't approved in time:** the planning review found that a trial account can send only preset templates, not our custom alert text. So the fallback is the team's open option, a clearly labeled **"preview" mockup** of the texts in the demo (the prototype's alerts page already shows one). Don't present preview texts as real sends.

## 3. Opt-in (call to action) text

Shown on the alerts opt-in screen, next to an **unchecked** checkbox, before the phone number is verified:

> I agree to receive automated text messages from ShowUp HTX about upcoming votes by the local governments that cover my address, such as tax rate increases, bond elections and school closures, plus sign-up reminders I request. Usually 1–3 messages a month. Message and data rates may apply. Reply HELP for help or STOP to opt out at any time. Consent is not a condition of any purchase. See our Privacy Policy and Terms.

Spanish:

> Acepto recibir mensajes de texto automáticos de ShowUp HTX sobre próximas votaciones de los gobiernos locales de mi dirección, como aumentos de la tasa de impuestos, elecciones de bonos y cierres de escuelas, además de los recordatorios de inscripción que pida. Normalmente de 1 a 3 mensajes al mes. Pueden aplicar tarifas de mensajes y datos. Responde HELP para ayuda o STOP para cancelar en cualquier momento. El consentimiento no es condición para ninguna compra. Consulta nuestra Política de Privacidad y Términos.

Under-18 users also need a parent-consent checkbox (plan §8, §11). Without it they get in-app alerts only.

**Opt-in flow description** (for the "how do users opt in" field):

> Users visit our website, enter a Houston-area address to see their local governments, then open the Alerts page. There they enter their mobile number, check an unchecked consent box showing the text above (users under 18 must also check a parent-consent box), and confirm the number with a one-time code sent by Twilio Verify. Texts are sent only after the code is confirmed. Users can reply STOP at any time.

## 4. Required privacy and terms language (for P5's pages)

Privacy policy, SMS section:

> We use your mobile number only to send the alerts you signed up for. No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. We share your number only with Twilio, our text-message provider, to deliver messages. Text messaging originator opt-in data and consent will not be shared with any third parties.

Terms, SMS section:

> **ShowUp HTX alerts.** By opting in, you agree to receive automated texts about upcoming votes by your local governments and sign-up reminders you request. Message frequency varies, usually 1–3 messages a month. Message and data rates may apply. Reply HELP for help. Reply STOP to cancel; you'll get one confirmation and no further messages. Carriers are not liable for delayed or undelivered messages. Texts are sent only between 8 a.m. and 8 p.m. Central.

## 5. Campaign fields

**Use case:** Sole Proprietor (10DLC), or "Public service announcement / civic information" on the toll-free form.

**Campaign description:**

> ShowUp HTX is a free, nonpartisan civic app built by Houston high school students. Users who opt in get texts when a local government that covers their address (city council, county commissioners court, school board, community college board, or water/utility district) schedules a vote on a tax rate increase, a bond, a school closure or boundary change, an election for its own seats, or the hiring of a superintendent or chancellor. Users can also ask for reminders before public-comment sign-up opens or closes. Each text names the government and the item, gives the deadline, and links to the official source. We never send marketing or tell anyone how to vote.

**Sample messages** (these match `lib/sms/message.ts`; check them against the final build):

1. `HISD board: Board to vote on closing 9 campuses. Sign-up to speak closes Wed, Oct 21, 12:00 PM. Speak up: https://<domain>/s/abc123 Reply STOP to opt out.`
2. `Harris County MUD 489: MUD 489 to vote Oct. 28 on ordering a $38.5 million bond election. Meeting Wed, Oct 28, 11:00 AM. Speak up: https://<domain>/s/def456 Reply STOP to opt out.`
3. `City Council: Registration to speak on "Public hearing on water rates" closes Mon, Oct 19, 3:00 PM. Speak up: https://<domain>/s/ghi789 Reply STOP to opt out.`
4. `ShowUp HTX: You're signed up for texts about big local votes (tax rates, bonds, school closures). Usually 1-3 a month. Msg & data rates may apply. Reply HELP for help, STOP to opt out.`

**Message contents:** embedded links, yes. Phone numbers, no. Age-gated content, no. Direct lending, no.

**Opt-out keywords:** STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT (plus PARAR and ALTO, handled in our webhook).
**Opt-out reply:** Twilio's default STOP confirmation.
**Help keywords:** HELP, INFO, AYUDA.
**Help reply:** `ShowUp HTX sends texts about big votes by your local governments. Why you got a text: tap its link. Reply STOP to opt out.`

**Volume:** under 1,000 messages a month.

## 6. Environment variables (P5's list, plan §21)

`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_VERIFY_SID`. Server-only; never sent to the browser.

## 7. Status log

| Date | Step | Who | Result |
|---|---|---|---|
| 2026-10-19 | Paperwork drafted (this file) | sohankamsala | Not submitted. Waiting on an adult account owner and P5's privacy and terms pages. |
| 2026-10-22 | Twilio dropped for the submission | PlaidMod (helping P3) | Not submitted: Twilio requires ID verification, which the team declined. Alerts switched to browser notifications; texting code kept, off. |
