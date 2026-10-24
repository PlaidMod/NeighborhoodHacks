import type { LiveData } from "./live"
import type { Persona, Update } from "./types"
import { relevance } from "./updates"
import { daysFromNow } from "./format"

// The short version of the weekly brief, on the dashboard home. It picks from the same data and order as
// /app/brief: buildWeekly's lead, "Coming up" and "Decided" lists with real data (plan §10), and
// the demo's own ranking otherwise. Pure: no I/O, no new text. Every line it shows is an
// item's existing headline.

export const TLDR_COMING = 5
export const TLDR_DECIDED = 3

export type Tldr = {
  /** Up to TLDR_COMING items you can still act on, most important first. */
  coming: Update[]
  /** Up to TLDR_DECIDED recent decisions. */
  decided: Update[]
  /** The coming-up item whose sign-up to speak closes soonest, or null if none is open. */
  next: Update | null
  /** Totals before the lists are cut short. */
  counts: { coming: number; open: number; decided: number }
}

/** The demo's ranking, the same as /app/brief's: urgent first, then relevance, then closeness. */
function score(u: Update, personas: Persona[]) {
  const tier = u.tier === "urgent" ? 30 : u.tier === "digest" ? 15 : 0
  return tier + relevance(u, personas) * 10 - Math.abs(daysFromNow(u.date))
}

export function buildTldr({
  updates,
  weekly,
  personas,
  now,
}: {
  updates: Update[]
  weekly: LiveData["weekly"] | null
  personas: Persona[]
  now: number
}): Tldr {
  const byId = new Map(updates.map((u) => [u.id, u]))
  const pick = (ids: string[]) => [...new Set(ids)].map((id) => byId.get(id)).filter((u): u is Update => !!u)

  let coming: Update[]
  let decided: Update[]
  if (weekly) {
    coming = pick([...(weekly.leadId ? [weekly.leadId] : []), ...weekly.comingUpIds])
    decided = pick(weekly.decidedIds)
  } else {
    coming = updates
      .filter((u) => u.type !== "decision" && u.tier !== "timeline" && daysFromNow(u.date) >= 0 && daysFromNow(u.date) <= 12)
      .sort((a, b) => score(b, personas) - score(a, personas))
    decided = updates
      .filter((u) => u.type === "decision" && daysFromNow(u.date) >= -8 && daysFromNow(u.date) <= 0)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }

  const open = coming
    .filter((u) => u.comment && +new Date(u.comment.deadline) > now)
    .sort((a, b) => +new Date(a.comment!.deadline) - +new Date(b.comment!.deadline))

  return {
    coming: coming.slice(0, TLDR_COMING),
    decided: decided.slice(0, TLDR_DECIDED),
    next: open[0] ?? null,
    counts: { coming: coming.length, open: open.length, decided: decided.length },
  }
}

/** The dashboard paragraph shows this many headlines in all, so it stays a few sentences long. */
export const TLDR_SENTENCES = 3

// Template stories for meetings without a posted result (lib/stories/template.ts) say only that.
const PLACEHOLDER = /^(Outcome not posted yet|Aún no se publica el resultado):/i

/**
 * The headlines in the dashboard's "This week, in short" paragraph: up to two decisions, then
 * what's coming up, three in all. When one kind is empty the other gets all three. Plain-language
 * AI headlines come first, then other items with a summary, then the rest: template stories and
 * items without a story use the official agenda title, cut short.
 */
export function tldrPick({ coming, decided }: Pick<Tldr, "coming" | "decided">) {
  const rank = (u: Update) => (u.aiWritten ? 0 : u.summary ? 1 : 2)
  // Array sort is stable, so the brief's order holds within each rank.
  const real = (list: Update[]) => list.filter((u) => !PLACEHOLDER.test(u.title)).sort((a, b) => rank(a) - rank(b))
  const c = real(coming)
  const d = real(decided).slice(0, c.length ? 2 : TLDR_SENTENCES)
  return { decided: d, coming: c.slice(0, TLDR_SENTENCES - d.length) }
}

/** A headline as a sentence: trimmed, ending in a period unless it already ends one. */
export function asSentence(title: string) {
  const s = title.trim()
  return /[.!?]$/.test(s) ? s : `${s}.`
}
