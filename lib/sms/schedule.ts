import { DateTime } from "luxon"
import type { RuleKey, Tier } from "@/lib/rules/classify"
import { canText } from "./eligibility"
import { inSendingHours, nextSendTime } from "./quietHours"
import { alertKey, type AlertUser, type QueuedAlert } from "./types"

const ZONE = "America/Chicago"
const DAY_MS = 86_400_000

const centralDate = (d: Date) => DateTime.fromJSDate(d).setZone(ZONE).toISODate()

export type ItemForAlerts = {
  item_id: string
  tier: Tier
  rule_fired?: RuleKey
  status: "upcoming" | "awaiting_result" | "decided"
  /** P2's review queue: AI-extracted SMS items wait for a teammate's approval (plan §7). */
  review_status?: "pending" | "approved" | "rejected" | null
}

/**
 * Rule-based alerts for one item, to everyone who follows its body and can be
 * texted. Called after ingest classifies an item, and again when a reviewer
 * approves it.
 */
export function enqueueItemAlerts(item: ItemForAlerts, followers: AlertUser[], now: Date): QueuedAlert[] {
  if (item.tier !== "sms" || !item.rule_fired || item.status !== "upcoming") return []
  if (item.review_status === "pending" || item.review_status === "rejected") return []
  const at = nextSendTime(now).toISOString()
  return followers
    .filter(canText)
    .map((u) => ({ user_id: u.id, item_id: item.item_id, rule: item.rule_fired!, scheduled_for: at }))
}

export type RegistrationWindow = { opens_at?: string | null; closes_at?: string | null }

/**
 * Time-based alerts (plan §11): reminders 7a and 7b for users who asked for them
 * in Speak up, and the HCAD protest reminder for homeowners. Pure: the alerts
 * job passes in today's data and writes the result to alert_queue.
 */
export function buildTimeBasedAlerts(input: {
  now: Date
  /** `reminders` rows: (user_id, item_id). The only server record that someone started Speak up. */
  reminders: { user_id: string; item_id: string }[]
  /** From P4's registration resolver, keyed by item_id. */
  windows: Record<string, RegistrationWindow>
  users: Record<string, AlertUser>
  /** HCAD protest deadline (P1's `deadlines` row), if known. */
  protestDeadline?: { at: string } | null
}): QueuedAlert[] {
  const { now, reminders, windows, users } = input
  const out: QueuedAlert[] = []
  const today = centralDate(now)

  for (const r of reminders) {
    const u = users[r.user_id]
    const w = windows[r.item_id]
    if (!u || !w || !canText(u)) continue

    // 7a: registration opens today (Central), and hasn't closed.
    if (w.opens_at) {
      const opens = new Date(w.opens_at)
      const stillOpen = !w.closes_at || new Date(w.closes_at) > now
      if (centralDate(opens) === today && stillOpen) {
        const at = nextSendTime(opens > now ? opens : now)
        if (centralDate(at) === today) {
          out.push({ user_id: u.id, item_id: r.item_id, rule: "registration_opens", scheduled_for: at.toISOString() })
        }
      }
    }

    // 7b: registration closes within the next 24 hours. Skip it if quiet hours
    // would hold it until after the window has already closed.
    if (w.closes_at) {
      const closes = new Date(w.closes_at)
      const left = closes.getTime() - now.getTime()
      if (left > 0 && left <= DAY_MS) {
        const at = nextSendTime(now)
        if (at < closes) {
          out.push({ user_id: u.id, item_id: r.item_id, rule: "registration_closes", scheduled_for: at.toISOString() })
        }
      }
    }
  }

  // Protest reminder: once, 7 days before the deadline, homeowners only.
  const p = input.protestDeadline
  if (p) {
    const sendDay = DateTime.fromISO(p.at, { setZone: true }).setZone(ZONE).minus({ days: 7 }).toISODate()
    if (sendDay === today) {
      const at = nextSendTime(now).toISOString()
      for (const u of Object.values(users)) {
        if (u.stakes.includes("homeowner") && canText(u)) {
          // alert_queue.item_id references items, and there's no item for this, so it's null.
          out.push({ user_id: u.id, item_id: null, rule: "protest_deadline", scheduled_for: at })
        }
      }
    }
  }
  return out
}

/**
 * Which queued alerts to send right now: due, inside sending hours, not already
 * sent, and at most one per (user, item, rule) even if the queue holds duplicates.
 */
export function dueAlerts(queue: QueuedAlert[], now: Date, alreadySent: Set<string>): QueuedAlert[] {
  if (!inSendingHours(now)) return []
  const seen = new Set(alreadySent)
  const out: QueuedAlert[] = []
  for (const a of queue) {
    const key = alertKey(a)
    if (seen.has(key) || new Date(a.scheduled_for) > now) continue
    seen.add(key)
    out.push(a)
  }
  return out
}
