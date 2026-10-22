import type { PushTarget } from "@/lib/push/subscription"
import type { AlertRule } from "@/lib/rules/ruleText"
import type { Stake } from "@/lib/stakes"

export type Lang = "en" | "es"

/** The `users` row fields alerts read (plan §16). No address, no drafts. */
export type AlertUser = {
  id: string
  phone: string | null
  phone_verified: boolean
  language: Lang
  stakes: Stake[]
  is_minor: boolean
  parent_consent: boolean
  sms_opted_out: boolean
  /** The browser's push subscription, for readers who turned on browser notifications. */
  push?: PushTarget | null
}

/** One row of `alert_queue`. `item_id` is null for alerts with no agenda item (the HCAD protest reminder). */
export type QueuedAlert = {
  user_id: string
  item_id: string | null
  rule: AlertRule
  /** ISO 8601; already moved into sending hours. */
  scheduled_for: string
}

export function alertKey(a: { user_id: string; item_id: string | null; rule: AlertRule }) {
  // Matches alerts_sent's unique (user_id, item_id, rule), where nulls count as equal.
  return `${a.user_id}|${a.item_id ?? ""}|${a.rule}`
}
