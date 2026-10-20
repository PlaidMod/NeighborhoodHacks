import { describe, expect, it } from 'vitest'
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
      return Object.fromEntries(init.users.filter((u) => u.phone_verified && !u.sms_opted_out).map((u) => [u.id, u]))
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
  return { store, sent, queue: () => queue }
}

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
