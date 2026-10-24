import type { WeeklyEdition, WeeklyItem } from "./build"

/**
 * "This week in 30 seconds": the main points of the weekly brief, worked out
 * from the brief's own data. Pure and deterministic, with no generated text,
 * so it can only ever restate what the agendas say (we summarize, we never
 * recommend).
 */
export type WeeklySummary = {
  /** Items still to be decided, and how many governments they're spread across. */
  coming: { count: number; bodies: number }
  /** The day with the most items, and whose meeting it is. */
  busiest: { date: string; body_name: string; count: number } | null
  /** The most common kinds of decision, biggest first (at most three). */
  topics: { type: WeeklyItem["item_type"]; count: number }[]
  /** The soonest sign-up deadline to speak, with the item it's for. */
  nextDeadline: { at: string; item: WeeklyItem } | null
  /** What already happened: outcomes of this week's decisions. */
  decided: { count: number; passed: number; failed: number; pending: number }
  cancelled: number
}

const dayKey = (iso: string) => iso.slice(0, 10)

export function summarizeWeek(edition: WeeklyEdition, now: Date = new Date()): WeeklySummary {
  const coming = [edition.lead, ...edition.comingUp].filter((i): i is WeeklyItem => !!i)

  // Busiest day: the date (and the government meeting that day) with the most items.
  const byDay = new Map<string, { count: number; bodies: Map<string, number>; date: string }>()
  for (const item of coming) {
    const key = dayKey(item.meeting_date)
    const entry = byDay.get(key) ?? { count: 0, bodies: new Map(), date: item.meeting_date }
    entry.count += 1
    entry.bodies.set(item.body_name, (entry.bodies.get(item.body_name) ?? 0) + 1)
    byDay.set(key, entry)
  }
  const top = [...byDay.values()].sort((a, b) => b.count - a.count)[0]
  const busiest =
    top && top.count > 1
      ? {
          date: top.date,
          count: top.count,
          body_name: [...top.bodies.entries()].sort((a, b) => b[1] - a[1])[0][0],
        }
      : null

  // What it's mostly about. "other" says nothing, so it's left out.
  const byType = new Map<WeeklyItem["item_type"], number>()
  for (const item of coming) {
    if (item.item_type === "other") continue
    byType.set(item.item_type, (byType.get(item.item_type) ?? 0) + 1)
  }
  const topics = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }))

  const open = coming
    .filter((i) => i.registration_closes_at && +new Date(i.registration_closes_at) > +now)
    .sort((a, b) => +new Date(a.registration_closes_at!) - +new Date(b.registration_closes_at!))
  const nextDeadline = open[0] ? { at: open[0].registration_closes_at!, item: open[0] } : null

  const decided = {
    count: edition.decided.length,
    passed: edition.decided.filter((d) => d.outcome?.vote_result === "passed").length,
    failed: edition.decided.filter((d) => d.outcome?.vote_result === "failed").length,
    pending: edition.decided.filter((d) => d.outcomePending).length,
  }

  return {
    coming: { count: coming.length, bodies: new Set(coming.map((i) => i.body_id)).size },
    busiest,
    topics,
    nextDeadline,
    decided,
    cancelled: edition.cancelled.length,
  }
}
