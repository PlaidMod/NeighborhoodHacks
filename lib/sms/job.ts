import { db } from '@/lib/db'
import type { RuleKey } from '@/lib/rules/classify'
import type { AlertRule } from '@/lib/rules/ruleText'
import type { Stake } from '@/lib/stakes'
import { StorySchema } from '@/lib/stories/types'
import { canText } from './eligibility'
import { itemAlertText, reminderText } from './message'
import { buildTimeBasedAlerts, dueAlerts, enqueueItemAlerts, type ItemForAlerts, type RegistrationWindow } from './schedule'
import { alertKey, type AlertUser, type QueuedAlert } from './types'

// The alerts job behind /api/cron/alerts (Technical Plan §11):
//   1. queue rule alerts for SMS-tier items to the users who follow their body
//   2. queue time-based alerts (reminders 7a/7b and the HCAD protest reminder)
//   3. send what's due, inside 8 a.m.–8 p.m. Central, once per (user, item, rule)

export type ItemContext = {
  body: string
  headline_en: string
  headline_es: string
  meeting_at: string
  first_seen_at?: string | null
}

export interface AlertsStore {
  /** SMS-tier, upcoming items whose meeting hasn't started, with the bodies they belong to. */
  textableItems(now: Date): Promise<(ItemForAlerts & { body_id: string })[]>
  followers(bodyIds: string[]): Promise<Record<string, AlertUser[]>>
  reminders(): Promise<{ user_id: string; item_id: string }[]>
  users(ids?: string[]): Promise<Record<string, AlertUser>>
  protestDeadline(now: Date): Promise<{ at: string } | null>
  /** Keys already queued or sent, so nothing is queued twice. */
  knownKeys(): Promise<Set<string>>
  enqueue(rows: QueuedAlert[]): Promise<void>
  queued(): Promise<(QueuedAlert & { id: string })[]>
  itemContext(itemIds: string[]): Promise<Record<string, ItemContext>>
  /** Records the send and removes the queue row. */
  markSent(row: QueuedAlert & { id: string }): Promise<void>
  /** Removes a queue row that can no longer be sent (opted out, item gone). */
  drop(id: string): Promise<void>
}

/** Sends one text. Null means texting isn't set up: nothing is sent and nothing is marked sent. */
export type Sender = ((to: string, body: string) => Promise<void>) | null

export type AlertsJobResult = { queued: number; sent: number; dropped: number; failed: number; preview: boolean }

export async function runAlertsJob(opts: {
  store: AlertsStore
  send: Sender
  siteUrl: string
  now?: Date
  /** Registration windows from P4's resolver, keyed by item ID. Empty until P4's resolver exists. */
  windows?: Record<string, RegistrationWindow>
}): Promise<AlertsJobResult> {
  const { store } = opts
  const now = opts.now ?? new Date()
  const result: AlertsJobResult = { queued: 0, sent: 0, dropped: 0, failed: 0, preview: opts.send === null }

  // 1 + 2: queue
  const known = await store.knownKeys()
  const fresh: QueuedAlert[] = []
  const add = (rows: QueuedAlert[]) => {
    for (const r of rows) {
      const key = alertKey(r)
      if (known.has(key)) continue
      known.add(key)
      fresh.push(r)
    }
  }

  const items = await store.textableItems(now)
  const followers = await store.followers([...new Set(items.map((i) => i.body_id))])
  for (const item of items) add(enqueueItemAlerts(item, followers[item.body_id] ?? [], now))

  const users = await store.users()
  const protest = await store.protestDeadline(now)
  add(
    buildTimeBasedAlerts({
      now,
      reminders: await store.reminders(),
      windows: opts.windows ?? {},
      users,
      protestDeadline: protest,
    }),
  )
  if (fresh.length) await store.enqueue(fresh)
  result.queued = fresh.length

  // 3: send
  if (opts.send === null) return result
  const queue = await store.queued()
  const due = dueAlerts(queue, now, new Set()) as (QueuedAlert & { id: string })[]
  const context = await store.itemContext([...new Set(due.map((d) => d.item_id).filter((id): id is string => !!id))])

  for (const row of due) {
    const user = users[row.user_id]
    const ctx = row.item_id ? context[row.item_id] : undefined
    if (!user || !canText(user) || (row.item_id && !ctx)) {
      await store.drop(row.id)
      result.dropped++
      continue
    }
    const body = textFor(row.rule, user, ctx, opts.siteUrl, row.item_id, opts.windows?.[row.item_id ?? ''], protest?.at ?? row.scheduled_for)
    try {
      await opts.send(user.phone!, body)
      await store.markSent(row)
      result.sent++
    } catch (error) {
      result.failed++
      // Never log the phone number or message text.
      console.error(`alert send failed for rule ${row.rule}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return result
}

function textFor(
  rule: AlertRule,
  user: AlertUser,
  ctx: ItemContext | undefined,
  siteUrl: string,
  itemId: string | null,
  window: RegistrationWindow | undefined,
  protestAt: string,
) {
  const lang = user.language
  const base = siteUrl.replace(/\/$/, '')
  if (rule === 'protest_deadline') {
    return reminderText(rule, { body: 'HCAD', title: '', at: protestAt, link: `${base}/alerts/why?rule=${rule}` }, lang)
  }
  const link = `${base}/items/${itemId}?why=${rule}`
  if (rule === 'registration_opens' || rule === 'registration_closes') {
    const at = (rule === 'registration_opens' ? window?.opens_at : window?.closes_at) ?? ctx!.meeting_at
    return reminderText(rule, { body: ctx!.body, title: lang === 'es' ? ctx!.headline_es : ctx!.headline_en, at, link }, lang)
  }
  return itemAlertText(
    {
      body: ctx!.body,
      headline: lang === 'es' ? ctx!.headline_es : ctx!.headline_en,
      deadline: {
        meeting_at: ctx!.meeting_at,
        registration_closes_at: window?.closes_at ?? null,
        first_seen_at: ctx!.first_seen_at,
      },
      link,
    },
    lang,
  )
}

// ---------------------------------------------------------------------------
// Supabase store. Server-only.
// ---------------------------------------------------------------------------

type UserRow = {
  id: string
  phone: string | null
  phone_verified: boolean
  language: string
  stakes: string[]
  is_minor: boolean
  parent_consent: boolean
  sms_opted_out: boolean
}

const USER_COLUMNS = 'id, phone, phone_verified, language, stakes, is_minor, parent_consent, sms_opted_out'

function toUser(r: UserRow): AlertUser {
  return {
    id: r.id,
    phone: r.phone,
    phone_verified: r.phone_verified,
    language: r.language === 'es' ? 'es' : 'en',
    stakes: r.stakes.filter((s): s is Stake => ['student', 'parent', 'renter', 'homeowner'].includes(s)),
    is_minor: r.is_minor,
    parent_consent: r.parent_consent,
    sms_opted_out: r.sms_opted_out,
  }
}

function headline(story: unknown, fallback: string) {
  const s = StorySchema.safeParse(story)
  return s.success ? s.data.headline : fallback
}

export const supabaseAlertsStore: AlertsStore = {
  async textableItems(now) {
    const { data, error } = await db()
      .from('items')
      .select('id, body_id, tier, rule_fired, status, review_status, meeting:meetings!inner(date, status)')
      .eq('tier', 'sms')
      .eq('status', 'upcoming')
      .is('removed_at', null)
      .gt('meeting.date', now.toISOString())
      .eq('meeting.status', 'scheduled')
      .limit(200)
    if (error) throw error
    return (data ?? [])
      .filter((r) => r.body_id)
      .map((r) => ({
        item_id: r.id,
        body_id: r.body_id!,
        tier: 'sms' as const,
        rule_fired: (r.rule_fired ?? undefined) as RuleKey | undefined,
        status: 'upcoming' as const,
        review_status: r.review_status as ItemForAlerts['review_status'],
      }))
  },

  async followers(bodyIds) {
    if (!bodyIds.length) return {}
    const { data, error } = await db().from('user_bodies').select(`body_id, user:users!inner(${USER_COLUMNS})`).in('body_id', bodyIds)
    if (error) throw error
    const out: Record<string, AlertUser[]> = {}
    for (const row of (data ?? []) as unknown as { body_id: string; user: UserRow }[]) {
      ;(out[row.body_id] ??= []).push(toUser(row.user))
    }
    return out
  },

  async reminders() {
    const { data, error } = await db().from('reminders').select('user_id, item_id')
    if (error) throw error
    return data ?? []
  },

  async users(ids) {
    let q = db().from('users').select(USER_COLUMNS).eq('phone_verified', true).eq('sms_opted_out', false)
    if (ids) q = q.in('id', ids)
    const { data, error } = await q
    if (error) throw error
    return Object.fromEntries(((data ?? []) as UserRow[]).map((r) => [r.id, toUser(r)]))
  },

  async protestDeadline(now) {
    const { data, error } = await db()
      .from('deadlines')
      .select('date')
      .eq('type', 'protest')
      .gte('date', now.toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data?.date ? { at: data.date } : null
  },

  async knownKeys() {
    const [queued, sent] = await Promise.all([
      db().from('alert_queue').select('user_id, item_id, rule'),
      db().from('alerts_sent').select('user_id, item_id, rule'),
    ])
    if (queued.error) throw queued.error
    if (sent.error) throw sent.error
    return new Set([...(queued.data ?? []), ...(sent.data ?? [])].map((r) => alertKey({ ...r, rule: r.rule as AlertRule })))
  },

  async enqueue(rows) {
    const { error } = await db().from('alert_queue').insert(rows)
    if (error) throw error
  },

  async queued() {
    const { data, error } = await db().from('alert_queue').select('id, user_id, item_id, rule, scheduled_for').order('scheduled_for')
    if (error) throw error
    return (data ?? []).map((r) => ({ ...r, rule: r.rule as AlertRule }))
  },

  async itemContext(itemIds) {
    if (!itemIds.length) return {}
    const { data, error } = await db()
      .from('items')
      .select('id, body_id, title, story_en, story_es, first_seen_at, meeting:meetings!inner(date)')
      .in('id', itemIds)
    if (error) throw error
    const rows = (data ?? []) as unknown as {
      id: string
      body_id: string | null
      title: string
      story_en: unknown
      story_es: unknown
      first_seen_at: string
      meeting: { date: string }
    }[]
    const bodyIds = [...new Set(rows.map((r) => r.body_id).filter((id): id is string => !!id))]
    const { data: bodies } = await db().from('bodies').select('id, name').in('id', bodyIds)
    const name = new Map((bodies ?? []).map((b) => [b.id, b.name]))
    return Object.fromEntries(
      rows.map((r) => [
        r.id,
        {
          body: name.get(r.body_id ?? '') ?? r.body_id ?? '',
          headline_en: headline(r.story_en, r.title),
          headline_es: headline(r.story_es, r.title),
          meeting_at: r.meeting.date,
          first_seen_at: r.first_seen_at,
        },
      ]),
    )
  },

  async markSent(row) {
    const { error } = await db().from('alerts_sent').insert({ user_id: row.user_id, item_id: row.item_id, rule: row.rule })
    // A unique violation means another run already sent it: still clear the queue row.
    if (error && error.code !== '23505') throw error
    const del = await db().from('alert_queue').delete().eq('id', row.id)
    if (del.error) throw del.error
  },

  async drop(id) {
    const { error } = await db().from('alert_queue').delete().eq('id', id)
    if (error) throw error
  },
}
