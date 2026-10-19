import { describe, expect, it, vi } from 'vitest'
import { MissingEnvError } from '@/lib/env'
import {
  BROWSER_ID_COOKIE,
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  hashIp,
  newBrowserId,
  readBrowserId,
  windowStart,
  type RateLimitStore,
} from '@/lib/rateLimit'

/** In-memory stand-in for the increment_rate_limit database function. */
function memoryStore(): RateLimitStore & { counts: Map<string, number> } {
  const counts = new Map<string, number>()
  return {
    counts,
    async increment(key, start) {
      const k = `${key}@${start.toISOString()}`
      const next = (counts.get(k) ?? 0) + 1
      counts.set(k, next)
      return next
    },
  }
}

const RULE = { limit: 3, windowSeconds: 3600 }
const NOW = new Date('2026-10-20T10:15:00Z')

describe('checkRateLimit', () => {
  it('allows exactly limit calls then blocks', async () => {
    const store = memoryStore()
    const results = []
    for (let i = 0; i < 4; i++) results.push((await checkRateLimit('k', RULE, { store, now: NOW })).allowed)
    expect(results).toEqual([true, true, true, false])
  })

  it('remaining counts down to zero', async () => {
    const store = memoryStore()
    const remaining = []
    for (let i = 0; i < 4; i++) remaining.push((await checkRateLimit('k', RULE, { store, now: NOW })).remaining)
    expect(remaining).toEqual([2, 1, 0, 0])
  })

  it('a new window allows again', async () => {
    const store = memoryStore()
    for (let i = 0; i < 3; i++) await checkRateLimit('k', RULE, { store, now: NOW })
    expect((await checkRateLimit('k', RULE, { store, now: NOW })).allowed).toBe(false)
    const nextHour = new Date('2026-10-20T11:00:00Z')
    const result = await checkRateLimit('k', RULE, { store, now: nextHour })
    expect(result.allowed).toBe(true)
    expect(result.resetAt.toISOString()).toBe('2026-10-20T12:00:00.000Z')
  })

  it('lookup preset allows 120 calls from one IP in an hour', async () => {
    const store = memoryStore()
    let allowed = 0
    for (let i = 0; i < 121; i++) {
      if ((await checkRateLimit('lookup:ip:abc', RATE_LIMITS.lookupPerIp, { store, now: NOW })).allowed) allowed++
    }
    expect(allowed).toBe(120)
  })

  it('coach presets match the plan (20 an hour)', () => {
    expect(RATE_LIMITS.coachPerBrowser).toEqual({ limit: 20, windowSeconds: 3600 })
    expect(RATE_LIMITS.coachPerIp).toEqual({ limit: 20, windowSeconds: 3600 })
  })

  it('rethrows MissingEnvError instead of failing open', async () => {
    const misconfigured: RateLimitStore = { increment: () => Promise.reject(new MissingEnvError('SUPABASE_SERVICE_ROLE_KEY')) }
    await expect(checkRateLimit('k', RULE, { store: misconfigured, now: NOW })).rejects.toBeInstanceOf(MissingEnvError)
  })

  it('warns, without the key, when it fails open', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken: RateLimitStore = { increment: () => Promise.reject(new Error('database down')) }
    await checkRateLimit('coach:ip:secret-hash', RULE, { store: broken, now: NOW })
    const logged = warn.mock.calls.map((call) => call.join(' ')).join('\n')
    warn.mockRestore()
    expect(logged).toContain('database down')
    expect(logged).not.toContain('secret-hash')
  })

  it('store failure returns allowed and degraded', async () => {
    const broken: RateLimitStore = { increment: () => Promise.reject(new Error('database down')) }
    const result = await checkRateLimit('k', RULE, { store: broken, now: NOW })
    expect(result.allowed).toBe(true)
    expect(result.degraded).toBe(true)
  })
})

describe('windowStart', () => {
  it('floors 10:59:59 to 10:00:00 for 3600', () => {
    expect(windowStart(new Date('2026-10-20T10:59:59Z'), 3600).toISOString()).toBe('2026-10-20T10:00:00.000Z')
  })
})

describe('hashIp', () => {
  const SECRET = 'test-ip-secret'

  it("is stable within a Chicago day, changes the next day, and doesn't contain the IP", () => {
    const morning = hashIp('203.0.113.7', { secret: SECRET, now: new Date('2026-10-20T13:00:00Z') })
    const evening = hashIp('203.0.113.7', { secret: SECRET, now: new Date('2026-10-21T03:00:00Z') }) // 10 PM Chicago, same day
    const nextDay = hashIp('203.0.113.7', { secret: SECRET, now: new Date('2026-10-21T13:00:00Z') })
    expect(morning).toBe(evening)
    expect(nextDay).not.toBe(morning)
    expect(morning).not.toContain('203.0.113.7')
    expect(morning).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs for different IPs', () => {
    const now = new Date('2026-10-20T13:00:00Z')
    expect(hashIp('203.0.113.7', { secret: SECRET, now })).not.toBe(hashIp('203.0.113.8', { secret: SECRET, now }))
  })
})

describe('clientIp', () => {
  it('takes the first x-forwarded-for entry', () => {
    const req = new Request('https://x.test', { headers: { 'x-forwarded-for': ' 198.51.100.4 , 10.0.0.1' } })
    expect(clientIp(req)).toBe('198.51.100.4')
  })

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(new Request('https://x.test', { headers: { 'x-real-ip': '198.51.100.9' } }))).toBe('198.51.100.9')
    expect(clientIp(new Request('https://x.test'))).toBe('unknown')
  })
})

describe('browser ID', () => {
  it('readBrowserId accepts a UUID cookie and rejects non-UUID values', () => {
    const id = newBrowserId()
    const ok = new Request('https://x.test', { headers: { cookie: `a=1; ${BROWSER_ID_COOKIE}=${id}` } })
    expect(readBrowserId(ok)).toBe(id)
    const bad = new Request('https://x.test', { headers: { cookie: `${BROWSER_ID_COOKIE}=not-a-uuid` } })
    expect(readBrowserId(bad)).toBeNull()
    expect(readBrowserId(new Request('https://x.test'))).toBeNull()
  })
})
