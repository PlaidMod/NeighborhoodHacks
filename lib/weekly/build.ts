import type { BodyType } from "@/lib/contracts/bodyTypes"
import type { ItemType, RuleKey, Tier } from "@/lib/rules/classify"
import type { Stake } from "@/lib/stakes"
import type { Coverage } from "@/lib/perspectives/types"
import type { Story } from "@/lib/stories/types"

const DAY = 86_400_000

export type Lang = "en" | "es"

/** "Shown first" lists from Project_Plan.md "Target users". Earlier = higher. */
const STAKE_ORDER: Record<Stake, BodyType[]> = {
  student: ["school_board", "college_board", "metro", "city_council", "commissioners_court"],
  parent: ["school_board", "city_council", "commissioners_court", "esd"],
  renter: ["city_council", "commissioners_court", "flood_control", "metro", "mud", "water_authority"],
  homeowner: [
    "mud",
    "water_authority",
    "esd",
    "school_board",
    "college_board",
    "commissioners_court",
    "flood_control",
    "port",
    "hcad",
    "hoa",
  ],
}

export type WeeklyItem = {
  item_id: string
  body_id: string
  body_name: string
  body_type: BodyType | string
  title: string
  item_type: ItemType
  tier: Tier
  rule_fired?: RuleKey
  status: "upcoming" | "awaiting_result" | "decided"
  outcome?: { action?: string; vote_result?: "passed" | "failed" | "no_action" }
  meeting_date: string
  meeting_status?: "scheduled" | "cancelled"
  registration_closes_at?: string | null
  story_en?: Story | null
  story_es?: Story | null
  story_source?: "ai" | "template" | null
  source_url: string
  agenda_number?: string | null
  meeting_type?: "regular" | "special" | null
  first_seen_at?: string | null
  /** True for the labeled sample data shown before the database has items. */
  is_sample?: boolean
  /** Distinct news outlets covering the item (item_perspectives.outlet_count). Last-place tie-breaker only. */
  outlet_count?: number
  /** "What news coverage says" (perspectives spec §7.5). */
  coverage?: Coverage | null
}

export type Deadline = { kind: "registration" | "election" | "protest"; label: string; at: string; item_id?: string }

export type WeeklyEdition = {
  from: string
  to: string
  intro: string
  lead: WeeklyItem | null
  comingUp: WeeklyItem[]
  decided: (WeeklyItem & { outcomePending: boolean })[]
  cancelled: WeeklyItem[]
  deadlines: Deadline[]
  bodiesAtAGlance: { body_id: string; body_name: string; upcoming: number }[]
}

function stakeRank(type: string, stakes: Stake[]) {
  let best = 99
  for (const s of stakes) {
    const i = STAKE_ORDER[s].indexOf(type as BodyType)
    if (i >= 0) best = Math.min(best, i)
  }
  return best
}

const ts = (iso?: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY)

/** Lead story order (plan §10, open decision 5): SMS tier, soonest sign-up close, the reader's stake, then meeting date. */
export function leadOrder(stakes: Stake[]) {
  return (a: WeeklyItem, b: WeeklyItem) =>
    (a.tier === "sms" ? 0 : 1) - (b.tier === "sms" ? 0 : 1) ||
    ts(a.registration_closes_at) - ts(b.registration_closes_at) ||
    stakeRank(a.body_type, stakes) - stakeRank(b.body_type, stakes) ||
    ts(a.meeting_date) - ts(b.meeting_date)
}

/**
 * Assemble one reader's weekly edition (plan §10) from the items of the bodies in
 * their `bodies_token`. Pure: the route fetches items and passes them in.
 */
export function buildWeekly(input: {
  items: WeeklyItem[]
  bodies: { body_id: string; body_name: string }[]
  stakes: Stake[]
  now: Date
  lang: Lang
  extraDeadlines?: Deadline[]
}): WeeklyEdition {
  const { now, stakes, lang } = input
  const from = new Date(now.getTime() - 7 * DAY)
  const to = new Date(now.getTime() + 14 * DAY)
  const inWindow = input.items.filter((i) => {
    const t = new Date(i.meeting_date).getTime()
    return t >= from.getTime() && t <= to.getTime() && i.tier !== "timeline"
  })

  const cancelled = inWindow.filter((i) => i.meeting_status === "cancelled")
  const live = inWindow.filter((i) => i.meeting_status !== "cancelled")

  const upcoming = live
    .filter((i) => i.status === "upcoming" && new Date(i.meeting_date) >= now)
    .sort(leadOrder(stakes))
  const lead = upcoming[0] ?? null
  const comingUp = upcoming
    .slice(1)
    // Coverage is only ever the last key, and the lead is already picked (perspectives spec §7.4).
    .sort(
      (a, b) =>
        ts(a.registration_closes_at) - ts(b.registration_closes_at) ||
        ts(a.meeting_date) - ts(b.meeting_date) ||
        (b.outlet_count ?? 0) - (a.outlet_count ?? 0),
    )

  const decided = live
    .filter((i) => i.status === "decided" || i.status === "awaiting_result")
    .sort((a, b) => ts(b.meeting_date) - ts(a.meeting_date) || (b.outlet_count ?? 0) - (a.outlet_count ?? 0))
    .map((i) => ({ ...i, outcomePending: i.status === "awaiting_result" }))

  const weekEnd = now.getTime() + 7 * DAY
  const deadlines: Deadline[] = [
    ...upcoming
      .filter((i) => i.registration_closes_at && ts(i.registration_closes_at) > now.getTime() && ts(i.registration_closes_at) <= weekEnd)
      .map((i) => ({
        kind: "registration" as const,
        label: lang === "en" ? `Sign up to speak: ${i.title}` : `Inscríbete para hablar: ${i.title}`,
        at: i.registration_closes_at!,
        item_id: i.item_id,
      })),
    ...(input.extraDeadlines ?? []).filter((d) => ts(d.at) > now.getTime() && ts(d.at) <= weekEnd),
  ].sort((a, b) => ts(a.at) - ts(b.at))

  const bodiesAtAGlance = input.bodies.map((b) => ({
    ...b,
    upcoming: upcoming.filter((i) => i.body_id === b.body_id).length,
  }))

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    intro: introLine(upcoming.length, input.bodies.length, deadlines.filter((d) => d.kind === "registration").length, lang),
    lead,
    comingUp,
    decided,
    cancelled,
    deadlines,
    bodiesAtAGlance,
  }
}

/** The template intro line (plan §10). Counts only; never an opinion. */
export function introLine(upcoming: number, bodies: number, withDeadline: number, lang: Lang) {
  if (lang === "en") {
    const d = upcoming === 1 ? "decision" : "decisions"
    const g = bodies === 1 ? "government" : "governments"
    const tail = withDeadline ? `, ${withDeadline} with sign-up deadlines in the next 7 days` : ""
    return upcoming === 0
      ? `This week: no decisions coming up across your ${bodies} local ${g}.`
      : `This week: ${upcoming} ${d} coming up across your ${bodies} local ${g}${tail}.`
  }
  const d = upcoming === 1 ? "decisión próxima" : "decisiones próximas"
  const g = bodies === 1 ? "tu gobierno local" : `tus ${bodies} gobiernos locales`
  const tail = withDeadline ? `, ${withDeadline} con fecha límite de inscripción en los próximos 7 días` : ""
  return upcoming === 0
    ? `Esta semana: no hay decisiones próximas en ${g}.`
    : `Esta semana: ${upcoming} ${d} en ${g}${tail}.`
}

/** The timeline (plan §2, Project_Plan §6): every item, newest meeting first, with optional filters. */
export function buildTimeline(
  items: WeeklyItem[],
  opts: { body_id?: string; status?: WeeklyItem["status"]; tier?: Tier } = {},
) {
  return items
    .filter((i) => (!opts.body_id || i.body_id === opts.body_id) && (!opts.status || i.status === opts.status) && (!opts.tier || i.tier === opts.tier))
    .sort((a, b) => ts(b.meeting_date) - ts(a.meeting_date))
}
