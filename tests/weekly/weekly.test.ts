import { describe, expect, it } from "vitest"
import { buildTimeline, buildWeekly, introLine, type WeeklyItem } from "@/lib/weekly/build"

const now = new Date("2026-10-19T10:00:00-05:00")

const base = (over: Partial<WeeklyItem>): WeeklyItem => ({
  item_id: "x",
  body_id: "b",
  body_name: "Body",
  body_type: "commissioners_court",
  title: "Item",
  item_type: "other",
  tier: "weekly",
  status: "upcoming",
  meeting_date: "2026-10-22T17:00:00-05:00",
  source_url: "https://example.org",
  ...over,
})

const items: WeeklyItem[] = [
  base({ item_id: "budget", body_id: "cc", body_type: "commissioners_court", item_type: "budget", meeting_date: "2026-10-29T10:00:00-05:00" }),
  base({
    item_id: "hisd",
    body_id: "hisd",
    body_type: "school_board",
    tier: "sms",
    rule_fired: "school_change",
    registration_closes_at: "2026-10-21T12:00:00-05:00",
  }),
  base({
    item_id: "mud",
    body_id: "mud",
    body_type: "mud",
    tier: "sms",
    rule_fired: "bond",
    meeting_date: "2026-10-28T11:00:00-05:00",
    registration_closes_at: "2026-10-28T11:00:00-05:00",
  }),
  base({ item_id: "rate", body_id: "cc", tier: "weekly", registration_closes_at: "2026-10-20T17:00:00-05:00", meeting_date: "2026-10-21T10:00:00-05:00" }),
  base({ item_id: "decided", body_id: "council", status: "decided", meeting_date: "2026-10-14T09:00:00-05:00", outcome: { vote_result: "passed" } }),
  base({ item_id: "pending", body_id: "mud", status: "awaiting_result", meeting_date: "2026-10-15T11:00:00-05:00" }),
  base({ item_id: "old", status: "decided", meeting_date: "2026-09-01T09:00:00-05:00" }),
  base({ item_id: "routine", tier: "timeline" }),
  base({ item_id: "cancelled", meeting_status: "cancelled", meeting_date: "2026-10-27T10:00:00-05:00" }),
]

const bodies = [
  { body_id: "cc", body_name: "Commissioners Court" },
  { body_id: "hisd", body_name: "HISD board" },
  { body_id: "mud", body_name: "MUD 489" },
  { body_id: "council", body_name: "City Council" },
]

describe("buildWeekly", () => {
  const ed = buildWeekly({ items, bodies, stakes: ["student"], now, lang: "en" })

  it("leads with the SMS item whose sign-up closes first", () => {
    expect(ed.lead?.item_id).toBe("hisd")
  })

  it("lists the rest of coming up by sign-up close, then meeting date", () => {
    expect(ed.comingUp.map((i) => i.item_id)).toEqual(["rate", "mud", "budget"])
  })

  it("shows decided items and flags ones whose outcome isn't posted", () => {
    expect(ed.decided.map((i) => [i.item_id, i.outcomePending])).toEqual([
      ["pending", true],
      ["decided", false],
    ])
  })

  it("keeps timeline-tier and out-of-window items off the page, and lists cancellations separately", () => {
    const all = [ed.lead, ...ed.comingUp, ...ed.decided].map((i) => i?.item_id)
    expect(all).not.toContain("routine")
    expect(all).not.toContain("old")
    expect(ed.cancelled.map((i) => i.item_id)).toEqual(["cancelled"])
  })

  it("collects deadlines in the next 7 days", () => {
    expect(ed.deadlines.map((d) => d.item_id)).toEqual(["rate", "hisd"])
  })

  it("writes a counts-only intro", () => {
    expect(ed.intro).toBe("This week: 4 decisions coming up across your 4 local governments, 2 with sign-up deadlines in the next 7 days.")
  })

  it("orders by the reader's stake when SMS tier and deadlines tie", () => {
    const tie = [
      base({ item_id: "school", body_type: "school_board", meeting_date: "2026-10-30T10:00:00-05:00" }),
      base({ item_id: "water", body_type: "mud", meeting_date: "2026-10-30T10:00:00-05:00" }),
    ]
    expect(buildWeekly({ items: tie, bodies, stakes: ["homeowner"], now, lang: "en" }).lead?.item_id).toBe("water")
    expect(buildWeekly({ items: tie, bodies, stakes: ["student"], now, lang: "en" }).lead?.item_id).toBe("school")
  })
})

describe("introLine", () => {
  it("handles Spanish and empty weeks", () => {
    expect(introLine(0, 6, 0, "en")).toBe("This week: no decisions coming up across your 6 local governments.")
    expect(introLine(3, 6, 0, "es")).toBe("Esta semana: 3 decisiones próximas en tus 6 gobiernos locales.")
    expect(introLine(1, 1, 1, "es")).toBe(
      "Esta semana: 1 decisión próxima en tu gobierno local, 1 con fecha límite de inscripción en los próximos 7 días.",
    )
  })
})

describe("buildTimeline", () => {
  it("sorts newest meeting first and filters", () => {
    const t = buildTimeline(items, { body_id: "mud" })
    expect(t.map((i) => i.item_id)).toEqual(["mud", "pending"])
  })
})
