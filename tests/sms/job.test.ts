import { describe, expect, it } from 'vitest'
import type { PushNotice } from '@/lib/push/message'
import { runAlertsJob, type AlertsStore, type ItemContext } from '@/lib/sms/job'
import { signSubscriber, verifySubscriber } from '@/lib/sms/subscriber'
import { alertKey, type AlertUser, type QueuedAlert } from '@/lib/sms/types'

const ct = (local: string) => new Date(`${local}-05:00`)

const user = (over: Partial<AlertUser> = {}): AlertUser => ({
  id: 'u1',
  phone: '+17135550142',
  phone_verified: true,
  language: 'en',
  stakes: ['student'],
  is_minor: false,
  parent_consent: false,
  sms_opted_out: false,
  ...over,
})

/** An in-memory store, so the job runs without a database. */
function memoryStore(init: { users: AlertUser[]; follows: Record<string, string[]>; items: string[]; sent?: QueuedAlert[] }) {
  let queue: (QueuedAlert & { id: string })[] = []
  const sent: QueuedAlert[] = [...(init.sent ?? [])]
  const removed: string[] = []
  let n = 0
  const ctx: ItemContext = {
    body: 'HISD board',
    headline_en: 'Board to vote on closing 9 campuses',
    headline_es: 'La junta votará sobre cerrar 9 escuelas',
    meeting_at: '2026-10-22T17:00:00-05:00',
  }
  const store: AlertsStore = {
    async textableItems() {
      return init.items.map((id) => ({ item_id: id, body_id: 'hisd_board', tier: 'sms' as const, rule_fired: 'school_change' as const, status: 'upcoming' as const }))
    },
    async followers(ids) {
      return Object.fromEntries(ids.map((b) => [b, init.users.filter((u) => init.follows[u.id]?.includes(b))]))
    },
    async reminders() {
      return []
    },
    async users() {
      return Object.fromEntries(init.users.filter((u) => (u.phone_verified && !u.sms_opted_out) || u.push).map((u) => [u.id, u]))
    },
    async removePush(id) {
      removed.push(id)
      const u = init.users.find((x) => x.id === id)
      if (u) u.push = null
    },
    async protestDeadline() {
      return null
    },
    async knownKeys() {
      return new Set([...queue, ...sent].map(alertKey))
    },
    async enqueue(rows) {
      queue.push(...rows.map((r) => ({ ...r, id: `q${n++}` })))
    },
    async queued() {
      return queue
    },
    async itemContext(ids) {
      return Object.fromEntries(ids.map((id) => [id, ctx]))
    },
    async markSent(row) {
      sent.push(row)
      queue = queue.filter((q) => q.id !== row.id)
    },
    async drop(id) {
      queue = queue.filter((q) => q.id !== id)
    },
  }
  return { store, sent, removed, queue: () => queue }
}

const push = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'key', auth: 'auth' }
const browser = (over: Partial<AlertUser> = {}) => user({ id: 'p1', phone: null, phone_verified: false, push, ...over })

describe('runAlertsJob with browser notifications', () => {
  it('sends a notification to a follower who signed up in the browser', async () => {
    const notices: { target: unknown; notice: PushNotice }[] = []
    const m = memoryStore({ users: [browser()], follows: { p1: ['hisd_board'] }, items: ['item-1'] })
    const r = await runAlertsJob({
      store: m.store,
      send: null,
      push: async (target, notice) => {
        notices.push({ target, notice })
        return 'sent'
      },
      siteUrl: 'https://showup.example',
      now: ct('2026-10-19T10:00:00'),
    })
    expect(r).toMatchObject({ queued: 1, sent: 1, failed: 0, preview: false })
    expect(notices).toEqual([
      {
        target: push,
        notice: {
          title: 'HISD board',
          body: 'Board to vote on closing 9 campuses. Meeting Thu, Oct 22, 5:00 PM.',
          url: 'https://showup.example/items/item-1?why=school_change',
          tag: 'school_change:item-1',
          lang: 'en',
        },
      },
    ])
    expect(m.sent).toHaveLength(1)
  })

  it('deletes an expired subscription and drops its alert', async () => {
    const m = memoryStore({ users: [browser()], follows: { p1: ['hisd_board'] }, items: ['item-1'] })
    const r = await runAlertsJob({ store: m.store, send: null, push: async () => 'gone', siteUrl: 'https://s', now: ct('2026-10-19T10:00:00') })
    expect(r).toMatchObject({ sent: 0, dropped: 1, removed: 1 })
    expect(m.removed).toEqual(['p1'])
    expect(m.queue()).toHaveLength(0)
  })

  it('keeps a texting-only alert queued while only notifications are switched on', async () => {
    const m = memoryStore({ users: [user()], follows: { u1: ['hisd_board'] }, items: ['item-1'] })
    const r = await runAlertsJob({ store: m.store, send: null, push: async () => 'sent', siteUrl: 'https://s', now: ct('2026-10-19T10:00:00') })
    expect(r).toMatchObject({ queued: 1, sent: 0, dropped: 0, preview: false })
    expect(m.queue()).toHaveLength(1)
  })

  it('never notifies an under-18 reader without a parent’s OK', async () => {
    let calls = 0
    const m = memoryStore({ users: [browser({ is_minor: true })], follows: { p1: ['hisd_board'] }, items: ['item-1'] })
    const r = await runAlertsJob({
      store: m.store,
      send: null,
      push: async () => {
        calls++
        return 'sent'
      },
      siteUrl: 'https://s',
      now: ct('2026-10-19T10:00:00'),
    })
    expect(r).toMatchObject({ queued: 0, sent: 0 })
    expect(calls).toBe(0)
  })

  it('holds notifications during quiet hours, like texts', async () => {
    const m = memoryStore({ users: [browser()], follows: { p1: ['hisd_board'] }, items: ['item-1'] })
    const night = await runAlertsJob({ store: m.store, send: null, push: async () => 'sent', siteUrl: 'https://s', now: ct('2026-10-19T22:00:00') })
    expect(night).toMatchObject({ queued: 1, sent: 0 })
  })

  it('keeps a failed notification queued for the next run', async () => {
    const m = memoryStore({ users: [browser()], follows: { p1: ['hisd_board'] }, items: ['item-1'] })
    const r = await runAlertsJob({
      store: m.store,
      send: null,
      push: async () => {
        throw new Error('push service answered 500')
      },
      siteUrl: 'https://s',
      now: ct('2026-10-19T10:00:00'),
    })
    expect(r).toMatchObject({ sent: 0, failed: 1 })
    expect(m.queue()).toHaveLength(1)
  })
})

describe('runAlertsJob', () => {
  it('queues and sends one text per follower, with the plan format and a why link', async () => {
    const texts: { to: string; body: string }[] = []
    const m = memoryStore({ users: [user()], follows: { u1: ['hisd_board'] }, items: ['item-1'] })
    const r = await runAlertsJob({
      store: m.store,
      send: async (to, body) => void texts.push({ to, body }),
      siteUrl: 'https://showup.example',
      now: ct('2026-10-19T10:00:00'),
    })
    expect(r).toMatchObject({ queued: 1, sent: 1, failed: 0, preview: false })
    expect(texts[0]!.body).toBe(
      'HISD board: Board to vote on closing 9 campuses. Meeting Thu, Oct 22, 5:00 PM. Speak up: https://showup.example/items/item-1?why=school_change Reply STOP to opt out.',
    )
  })

  it('never sends the same alert twice across runs', async () => {
    const send = async () => {}
    const m = memoryStore({ users: [user()], follows: { u1: ['hisd_board'] }, items: ['item-1'] })
    await runAlertsJob({ store: m.store, send, siteUrl: 'https://s', now: ct('2026-10-19T10:00:00') })
    const second = await runAlertsJob({ store: m.store, send, siteUrl: 'https://s', now: ct('2026-10-19T11:00:00') })
    expect(second).toMatchObject({ queued: 0, sent: 0 })
    expect(m.sent).toHaveLength(1)
  })

  it('holds texts during quiet hours and sends them the next morning', async () => {
    const send = async () => {}
    const m = memoryStore({ users: [user()], follows: { u1: ['hisd_board'] }, items: ['item-1'] })
    const night = await runAlertsJob({ store: m.store, send, siteUrl: 'https://s', now: ct('2026-10-19T22:00:00') })
    expect(night).toMatchObject({ queued: 1, sent: 0 })
    const morning = await runAlertsJob({ store: m.store, send, siteUrl: 'https://s', now: ct('2026-10-20T08:05:00') })
    expect(morning).toMatchObject({ sent: 1 })
  })

  it('drops queued texts for someone who opted out after they were queued', async () => {
    const u = user()
    const m = memoryStore({ users: [u], follows: { u1: ['hisd_board'] }, items: ['item-1'] })
    await runAlertsJob({ store: m.store, send: null, siteUrl: 'https://s', now: ct('2026-10-19T10:00:00') })
    u.sms_opted_out = true
    const r = await runAlertsJob({ store: m.store, send: async () => {}, siteUrl: 'https://s', now: ct('2026-10-19T10:30:00') })
    expect(r).toMatchObject({ sent: 0, dropped: 1 })
  })

  it('in preview mode (no Twilio) it queues but never sends or marks anything sent', async () => {
    const m = memoryStore({ users: [user()], follows: { u1: ['hisd_board'] }, items: ['item-1'] })
    const r = await runAlertsJob({ store: m.store, send: null, siteUrl: 'https://s', now: ct('2026-10-19T10:00:00') })
    expect(r).toMatchObject({ queued: 1, sent: 0, preview: true })
    expect(m.sent).toHaveLength(0)
  })

  it('keeps a failed send queued for the next run', async () => {
    const m = memoryStore({ users: [user()], follows: { u1: ['hisd_board'] }, items: ['item-1'] })
    const r = await runAlertsJob({
      store: m.store,
      send: async () => {
        throw new Error('Twilio down')
      },
      siteUrl: 'https://s',
      now: ct('2026-10-19T10:00:00'),
    })
    expect(r).toMatchObject({ sent: 0, failed: 1 })
    expect(m.queue()).toHaveLength(1)
  })
})

describe('subscriber cookie', () => {
  const id = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'
  it('round-trips and rejects edits or another secret', () => {
    const value = signSubscriber(id, 'secret-a')
    expect(verifySubscriber(value, 'secret-a')).toBe(id)
    expect(verifySubscriber(value, 'secret-b')).toBeNull()
    expect(verifySubscriber(value.replace(/.$/, value.endsWith('A') ? 'B' : 'A'), 'secret-a')).toBeNull()
    expect(verifySubscriber(`not-a-uuid.${value.split('.')[1]}`, 'secret-a')).toBeNull()
  })
})
