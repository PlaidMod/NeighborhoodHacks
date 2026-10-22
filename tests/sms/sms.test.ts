import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"
import { canAlert, canText, normalizeUsPhone, textBlock } from "@/lib/sms/eligibility"
import { MAX_SMS_CHARS, deadlineText, itemAlertText, reminderText } from "@/lib/sms/message"
import { inSendingHours, nextSendTime } from "@/lib/sms/quietHours"
import { buildTimeBasedAlerts, dueAlerts, enqueueItemAlerts } from "@/lib/sms/schedule"
import { inboundIntent, twilioClient, validTwilioSignature } from "@/lib/sms/twilio"
import { alertKey, type AlertUser } from "@/lib/sms/types"

const user = (over: Partial<AlertUser> = {}): AlertUser => ({
  id: "u1",
  phone: "+17135550142",
  phone_verified: true,
  language: "en",
  stakes: ["student"],
  is_minor: false,
  parent_consent: false,
  sms_opted_out: false,
  ...over,
})

// Central is UTC-5 in October (CDT).
const ct = (local: string) => new Date(`${local}-05:00`)

describe("phones and consent", () => {
  it("normalizes US numbers to E.164", () => {
    expect(normalizeUsPhone("(713) 555-0142")).toBe("+17135550142")
    expect(normalizeUsPhone("1-713-555-0142")).toBe("+17135550142")
    expect(normalizeUsPhone("555-0142")).toBeNull()
    expect(normalizeUsPhone("(013) 555-0142")).toBeNull()
  })

  it("blocks unverified, opted-out and under-18 without consent", () => {
    expect(canText(user())).toBe(true)
    expect(textBlock(user({ phone_verified: false }))).toBe("not_verified")
    expect(textBlock(user({ sms_opted_out: true }))).toBe("opted_out")
    expect(textBlock(user({ is_minor: true }))).toBe("needs_parent_consent")
    expect(canText(user({ is_minor: true, parent_consent: true }))).toBe(true)
    expect(textBlock(user({ phone: null }))).toBe("no_phone")
  })
})

describe("quiet hours (8 a.m.–8 p.m. Central)", () => {
  it("knows the window edges", () => {
    expect(inSendingHours(ct("2026-10-20T07:59:00"))).toBe(false)
    expect(inSendingHours(ct("2026-10-20T08:00:00"))).toBe(true)
    expect(inSendingHours(ct("2026-10-20T19:59:00"))).toBe(true)
    expect(inSendingHours(ct("2026-10-20T20:00:00"))).toBe(false)
  })

  it("holds late-night texts until 8 a.m. the next day", () => {
    expect(nextSendTime(ct("2026-10-20T22:30:00")).toISOString()).toBe(ct("2026-10-21T08:00:00").toISOString())
    expect(nextSendTime(ct("2026-10-20T03:00:00")).toISOString()).toBe(ct("2026-10-20T08:00:00").toISOString())
  })

  it("handles the switch back to standard time (Nov 1, 2026)", () => {
    // 9 p.m. CST Nov 1 → 8 a.m. CST Nov 2 (UTC-6).
    expect(nextSendTime(new Date("2026-11-01T21:00:00-06:00")).toISOString()).toBe(
      new Date("2026-11-02T08:00:00-06:00").toISOString(),
    )
  })
})

describe("message text", () => {
  const deadline = { meeting_at: "2026-10-22T17:00:00-05:00", registration_closes_at: "2026-10-21T12:00:00-05:00" }

  it("never ends a Spanish time with two periods", () => {
    const t = itemAlertText({ body: "HISD", headline: "Votación", deadline, link: "https://showup.example/s/abc" }, "es")
    const r = reminderText("registration_closes", { body: "HISD", title: "Votación", at: deadline.registration_closes_at, link: "https://showup.example/s/abc" }, "es")
    for (const text of [t, r]) expect(text).not.toMatch(/\.\./)
  })

  it("follows the plan's format and fits two segments", () => {
    const t = itemAlertText(
      { body: "HISD board", headline: "Board to vote on closing 9 campuses", deadline, link: "https://showup.example/s/abc" },
      "en",
    )
    expect(t).toBe(
      "HISD board: Board to vote on closing 9 campuses. Sign-up to speak closes Wed, Oct 21, 12:00 PM. Speak up: https://showup.example/s/abc Reply STOP to opt out.",
    )
    expect(t.length).toBeLessThanOrEqual(MAX_SMS_CHARS)
  })

  it("shortens long headlines but keeps the deadline, link and STOP", () => {
    const t = itemAlertText({ body: "MUD 489", headline: "x ".repeat(300), deadline, link: "https://s.example/1" }, "es")
    expect(t.length).toBeLessThanOrEqual(MAX_SMS_CHARS)
    expect(t).toMatch(/Participa: https:\/\/s\.example\/1 Responde STOP para cancelar\.$/)
  })

  it("uses the late-added wording when the window closed before we saw the item", () => {
    const late = deadlineText({ ...deadline, first_seen_at: "2026-10-21T15:00:00-05:00" }, "en")
    expect(late.late).toBe(true)
    expect(late.text).toMatch(/may already be closed/)
    expect(deadlineText({ ...deadline, first_seen_at: "2026-10-19T09:00:00-05:00" }, "en").late).toBe(false)
  })

  it("writes reminders in both languages", () => {
    const a = { body: "City Council", title: "Public hearing on water rates", at: "2026-10-19T15:00:00-05:00", link: "https://s.example/2" }
    expect(reminderText("registration_closes", a, "en")).toMatch(/closes Mon, Oct 19, 3:00 PM\. Speak up: https/)
    expect(reminderText("registration_opens", a, "es")).toMatch(/^City Council: Hoy se abre/)
  })

  it("keeps every reminder's exact wording (shared with browser notifications)", () => {
    const a = { body: "City Council", title: "Public hearing on water rates.", at: "2026-10-19T15:00:00-05:00", link: "https://s.example/2" }
    const hcad = { ...a, body: "HCAD", title: "" }
    expect(reminderText("registration_opens", a, "en")).toBe(
      'City Council: Registration to speak on "Public hearing on water rates" opens today (Mon, Oct 19, 3:00 PM). Speak up: https://s.example/2 Reply STOP to opt out.',
    )
    expect(reminderText("registration_opens", a, "es")).toBe(
      'City Council: Hoy se abre la inscripción para hablar sobre "Public hearing on water rates" (lun 19 de oct, 3:00 p.m.). Participa: https://s.example/2 Responde STOP para cancelar.',
    )
    expect(reminderText("registration_closes", a, "en")).toBe(
      'City Council: Registration to speak on "Public hearing on water rates" closes Mon, Oct 19, 3:00 PM. Speak up: https://s.example/2 Reply STOP to opt out.',
    )
    expect(reminderText("registration_closes", a, "es")).toBe(
      'City Council: La inscripción para hablar sobre "Public hearing on water rates" cierra el lun 19 de oct, 3:00 p.m. Participa: https://s.example/2 Responde STOP para cancelar.',
    )
    expect(reminderText("protest_deadline", hcad, "en")).toBe(
      "HCAD: Your deadline to protest your home's appraised value is Mon, Oct 19, 3:00 PM. https://s.example/2 Reply STOP to opt out.",
    )
    expect(reminderText("protest_deadline", hcad, "es")).toBe(
      "HCAD: Tu fecha límite para protestar el valor de tasación de tu casa es el lun 19 de oct, 3:00 p.m. https://s.example/2 Responde STOP para cancelar.",
    )
  })
})

describe("alert scheduling", () => {
  const smsItem = { item_id: "i1", tier: "sms" as const, rule_fired: "bond" as const, status: "upcoming" as const }

  it("queues rule alerts only for textable followers, held to sending hours", () => {
    const q = enqueueItemAlerts(smsItem, [user(), user({ id: "u2", sms_opted_out: true })], ct("2026-10-20T21:00:00"))
    expect(q).toEqual([{ user_id: "u1", item_id: "i1", rule: "bond", scheduled_for: ct("2026-10-21T08:00:00").toISOString() }])
  })

  it("never queues pending-review, weekly or decided items", () => {
    const now = ct("2026-10-20T10:00:00")
    expect(enqueueItemAlerts({ ...smsItem, review_status: "pending" }, [user()], now)).toEqual([])
    expect(enqueueItemAlerts({ ...smsItem, tier: "weekly" }, [user()], now)).toEqual([])
    expect(enqueueItemAlerts({ ...smsItem, status: "decided" }, [user()], now)).toEqual([])
  })

  it("7a fires on the day registration opens; 7b within 24 hours of close", () => {
    const users = { u1: user() }
    const reminders = [{ user_id: "u1", item_id: "i1" }]
    const windows = { i1: { opens_at: "2026-10-16T08:00:00-05:00", closes_at: "2026-10-21T12:00:00-05:00" } }

    const openDay = buildTimeBasedAlerts({ now: ct("2026-10-16T06:00:00"), reminders, windows, users })
    expect(openDay.map((a) => a.rule)).toEqual(["registration_opens"])
    expect(openDay[0]!.scheduled_for).toBe(ct("2026-10-16T08:00:00").toISOString())

    const dayBefore = buildTimeBasedAlerts({ now: ct("2026-10-20T13:00:00"), reminders, windows, users })
    expect(dayBefore.map((a) => a.rule)).toEqual(["registration_closes"])

    const twoDaysBefore = buildTimeBasedAlerts({ now: ct("2026-10-19T11:00:00"), reminders, windows, users })
    expect(twoDaysBefore).toEqual([])
  })

  it("skips 7b when quiet hours would hold it past the close", () => {
    const users = { u1: user() }
    const windows = { i1: { closes_at: "2026-10-21T07:30:00-05:00" } }
    const r = buildTimeBasedAlerts({ now: ct("2026-10-20T21:00:00"), reminders: [{ user_id: "u1", item_id: "i1" }], windows, users })
    expect(r).toEqual([])
  })

  it("sends the protest reminder to homeowners 7 days before the deadline", () => {
    const users = { u1: user({ stakes: ["homeowner"] }), u2: user({ id: "u2", stakes: ["renter"] }) }
    const r = buildTimeBasedAlerts({
      now: ct("2027-05-08T09:00:00"),
      reminders: [],
      windows: {},
      users,
      protestDeadline: { at: "2027-05-15T23:59:00-05:00" },
    })
    expect(r).toEqual([
      { user_id: "u1", item_id: null, rule: "protest_deadline", scheduled_for: ct("2027-05-08T09:00:00").toISOString() },
    ])
  })

  it("queues for browser-notification followers too, but not under-18s without a parent's OK", () => {
    const push = { endpoint: "https://fcm.googleapis.com/fcm/send/x", p256dh: "k", auth: "a" }
    const browser = user({ id: "p1", phone: null, phone_verified: false, push })
    const minor = user({ id: "p2", phone: null, phone_verified: false, push, is_minor: true })
    const now = ct("2026-10-20T10:00:00")
    expect(canAlert(browser)).toBe(true)
    expect(canAlert(minor)).toBe(false)
    expect(canAlert(user({ id: "p3", phone: null, phone_verified: false }))).toBe(false)
    expect(enqueueItemAlerts(smsItem, [browser, minor], now).map((a) => a.user_id)).toEqual(["p1"])
    const protest = buildTimeBasedAlerts({
      now: ct("2027-05-08T09:00:00"),
      reminders: [{ user_id: "p1", item_id: "i1" }],
      windows: { i1: { closes_at: "2027-05-08T17:00:00-05:00" } },
      users: { p1: { ...browser, stakes: ["homeowner"] } },
      protestDeadline: { at: "2027-05-15T23:59:00-05:00" },
    })
    expect(protest.map((a) => a.rule)).toEqual(["registration_closes", "protest_deadline"])
  })

  it("sends each (user, item, rule) once and nothing during quiet hours", () => {
    const a = { user_id: "u1", item_id: "i1", rule: "bond" as const, scheduled_for: ct("2026-10-20T08:00:00").toISOString() }
    expect(dueAlerts([a, a], ct("2026-10-20T09:00:00"), new Set())).toHaveLength(1)
    expect(dueAlerts([a], ct("2026-10-20T09:00:00"), new Set([alertKey(a)]))).toEqual([])
    expect(dueAlerts([a], ct("2026-10-20T21:00:00"), new Set())).toEqual([])
  })
})

describe("twilio", () => {
  it("recognizes STOP, START and HELP keywords", () => {
    expect(inboundIntent(" stop ")).toBe("stop")
    expect(inboundIntent("Unsubscribe")).toBe("stop")
    expect(inboundIntent("start")).toBe("start")
    expect(inboundIntent("AYUDA")).toBe("help")
    expect(inboundIntent("stop texting me about bonds")).toBe("other")
  })

  it("validates webhook signatures", () => {
    const token = "test_token"
    const url = "https://showup.example/api/twilio/inbound"
    const params = { From: "+17135550142", Body: "STOP", MessageSid: "SM1" }
    const data = url + Object.keys(params).sort().map((k) => k + params[k as keyof typeof params]).join("")
    const sig = createHmac("sha1", token).update(data).digest("base64")
    expect(validTwilioSignature(token, url, params, sig)).toBe(true)
    expect(validTwilioSignature(token, url, { ...params, Body: "START" }, sig)).toBe(false)
  })

  it("sends through the Messaging Service with basic auth", async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ sid: "SM123", status: "queued" }), { status: 201 })
    }) as unknown as typeof fetch
    const c = twilioClient({ accountSid: "AC1", authToken: "t", verifyServiceSid: "VA1", messagingServiceSid: "MG1" }, fake)
    expect(await c.sendSms("+17135550142", "hi")).toEqual({ sid: "SM123", status: "queued" })
    expect(calls[0]!.url).toBe("https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json")
    expect(String(calls[0]!.init.body)).toBe("To=%2B17135550142&MessagingServiceSid=MG1&Body=hi")
  })

  it("surfaces Twilio errors", async () => {
    const fake = (async () =>
      new Response(JSON.stringify({ message: "Unverified number", code: 21608 }), { status: 400 })) as unknown as typeof fetch
    const c = twilioClient({ accountSid: "AC1", authToken: "t", verifyServiceSid: "VA1", messagingServiceSid: "MG1" }, fake)
    await expect(c.sendSms("+17135550142", "hi")).rejects.toMatchObject({ status: 400, code: 21608 })
  })
})
