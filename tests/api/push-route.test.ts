import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  saved: [] as unknown[],
  deleted: [] as string[],
  deletedId: null as string | null,
  sent: [] as { target: unknown; notice: { body: string; lang: string } }[],
  sendResult: 'sent' as 'sent' | 'gone' | Error,
  cookies: new Map<string, string>(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (state.cookies.has(name) ? { name, value: state.cookies.get(name)! } : undefined),
    set: (name: string, value: string) => void state.cookies.set(name, value),
    delete: (name: string) => void state.cookies.delete(name),
  }),
}))

vi.mock('@/lib/sms/subscribers', () => ({
  savePushSubscriber: async (input: unknown) => {
    state.saved.push(input)
    return '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'
  },
  deletePushSubscriber: async (endpoint: string) => {
    state.deleted.push(endpoint)
    return state.deletedId
  },
}))

vi.mock('@/lib/push/send', async (original) => ({
  ...(await original<typeof import('@/lib/push/send')>()),
  createPushSender: () => async (target: unknown, notice: { body: string; lang: string }) => {
    state.sent.push({ target, notice })
    if (state.sendResult instanceof Error) throw state.sendResult
    return state.sendResult
  },
}))

import { DELETE, POST } from '@/app/api/alerts/push/route'
import { SUBSCRIBER_COOKIE, signSubscriber } from '@/lib/sms/subscriber'
import { signBodiesToken } from '@/lib/tokens'

const secret = 'test-token-secret-long-enough-123456'
const userId = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  expirationTime: null,
  keys: { p256dh: 'B' + 'A'.repeat(86), auth: 'Q'.repeat(22) },
}
const call = (method: 'POST' | 'DELETE', body: unknown) =>
  (method === 'POST' ? POST : DELETE)(
    new Request('http://localhost/api/alerts/push', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  )

describe('POST /api/alerts/push', () => {
  beforeEach(() => {
    state.saved = []
    state.deleted = []
    state.sent = []
    state.sendResult = 'sent'
    state.deletedId = null
    state.cookies = new Map()
    vi.unstubAllEnvs()
    vi.stubEnv('BODIES_TOKEN_SECRET', secret)
    vi.stubEnv('VAPID_PUBLIC_KEY', 'pub')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'priv')
    vi.stubEnv('VAPID_SUBJECT', 'https://showup.example')
    vi.stubEnv('SITE_URL', 'https://showup.example')
    vi.stubEnv('IP_HASH_SECRET', '')
  })

  it('saves the subscription with the governments from the lookup and sends a confirmation', async () => {
    const t = signBodiesToken(['hisd_board', 'houston_city_council'], secret)
    const res = await call('POST', { subscription, t, lang: 'es', consent: true })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(state.saved).toEqual([
      {
        target: { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        language: 'es',
        stakes: [],
        is_minor: false,
        parent_consent: false,
        bodyIds: ['hisd_board', 'houston_city_council'],
      },
    ])
    expect(state.cookies.get(SUBSCRIBER_COOKIE)).toBe(signSubscriber(userId, secret))
    expect(state.sent).toHaveLength(1)
    expect(state.sent[0]!.notice).toMatchObject({ lang: 'es', url: 'https://showup.example/app/alerts' })
  })

  it('answers with a preview and saves nothing when push keys are missing', async () => {
    vi.stubEnv('VAPID_PRIVATE_KEY', '')
    const res = await call('POST', { subscription, t: signBodiesToken(['hisd_board'], secret), consent: true })
    expect(await res.json()).toEqual({ preview: true })
    expect(state.saved).toEqual([])
  })

  it('refuses a subscription that does not point at a browser push service', async () => {
    const res = await call('POST', {
      subscription: { ...subscription, endpoint: 'https://attacker.example/collect' },
      t: signBodiesToken(['hisd_board'], secret),
      consent: true,
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_subscription' })
    expect(state.saved).toEqual([])
  })

  it('needs consent, and a parent’s OK for under-18 readers', async () => {
    const t = signBodiesToken(['hisd_board'], secret)
    expect((await call('POST', { subscription, t, consent: false })).status).toBe(400)
    const minor = await call('POST', { subscription, t, consent: true, is_minor: true })
    expect(await minor.json()).toEqual({ error: 'parent_consent_required' })
    expect((await call('POST', { subscription, t, consent: true, is_minor: true, parent_consent: true })).status).toBe(200)
  })

  it('still signs up, and logs why, when the confirmation fails, without the push address', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    state.sendResult = new Error('push service answered 403')
    const res = await call('POST', { subscription, t: signBodiesToken(['hisd_board'], secret), consent: true })
    expect(await res.json()).toEqual({ ok: true })
    expect(log).toHaveBeenCalledWith('push confirmation failed: push service answered 403')
    state.sendResult = 'gone'
    await call('POST', { subscription, t: signBodiesToken(['hisd_board'], secret), consent: true })
    expect(log).toHaveBeenLastCalledWith('push confirmation failed: subscription gone')
    expect(JSON.stringify(log.mock.calls)).not.toContain(subscription.endpoint)
    log.mockRestore()
  })

  it('needs a valid lookup token', async () => {
    const res = await call('POST', { subscription, t: 'forged', consent: true })
    expect(await res.json()).toEqual({ error: 'no_bodies' })
    expect(state.saved).toEqual([])
  })
})

describe('DELETE /api/alerts/push', () => {
  beforeEach(() => {
    state.deleted = []
    state.cookies = new Map()
    vi.unstubAllEnvs()
    vi.stubEnv('BODIES_TOKEN_SECRET', secret)
  })

  it('deletes the subscriber and forgets this browser', async () => {
    state.deletedId = userId
    state.cookies.set(SUBSCRIBER_COOKIE, signSubscriber(userId, secret))
    const res = await call('DELETE', { endpoint: subscription.endpoint })
    expect(await res.json()).toEqual({ ok: true })
    expect(state.deleted).toEqual([subscription.endpoint])
    expect(state.cookies.has(SUBSCRIBER_COOKIE)).toBe(false)
  })

  it('keeps a cookie that belongs to someone else’s sign-up', async () => {
    state.deletedId = userId
    const other = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
    state.cookies.set(SUBSCRIBER_COOKIE, signSubscriber(other, secret))
    await call('DELETE', { endpoint: subscription.endpoint })
    expect(state.cookies.get(SUBSCRIBER_COOKIE)).toBe(signSubscriber(other, secret))
  })

  it('refuses addresses that are not push services', async () => {
    const res = await call('DELETE', { endpoint: 'https://attacker.example/x' })
    expect(res.status).toBe(400)
    expect(state.deleted).toEqual([])
  })
})
