import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissingEnvError, adminEmails, getEnv, getOptionalEnv, isDemoMode, isDemoRecord } from '@/lib/env'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getEnv', () => {
  it('throws MissingEnvError naming the variable when unset', () => {
    vi.stubEnv('CRON_SECRET', undefined)
    expect(() => getEnv('CRON_SECRET')).toThrow(MissingEnvError)
    expect(() => getEnv('CRON_SECRET')).toThrow(
      'Missing environment variable CRON_SECRET. Add it to .env.local (see .env.example).',
    )
  })

  it("throws MissingEnvError when set to ''", () => {
    vi.stubEnv('CRON_SECRET', '')
    expect(() => getEnv('CRON_SECRET')).toThrow(MissingEnvError)
  })

  it('returns the value when set', () => {
    vi.stubEnv('CRON_SECRET', 'abc123')
    expect(getEnv('CRON_SECRET')).toBe('abc123')
  })
})

describe('getOptionalEnv', () => {
  it("returns undefined when unset or ''", () => {
    vi.stubEnv('SITE_URL', undefined)
    expect(getOptionalEnv('SITE_URL')).toBeUndefined()
    vi.stubEnv('SITE_URL', '')
    expect(getOptionalEnv('SITE_URL')).toBeUndefined()
  })
})

describe('demo flags', () => {
  it("isDemoMode is true only for 'true'", () => {
    vi.stubEnv('DEMO_MODE', 'true')
    expect(isDemoMode()).toBe(true)
    for (const value of ['TRUE', '1', 'yes', '']) {
      vi.stubEnv('DEMO_MODE', value)
      expect(isDemoMode()).toBe(false)
    }
    vi.stubEnv('DEMO_MODE', undefined)
    expect(isDemoMode()).toBe(false)
  })

  it("isDemoRecord is true only for 'true'", () => {
    vi.stubEnv('DEMO_RECORD', 'true')
    expect(isDemoRecord()).toBe(true)
    vi.stubEnv('DEMO_RECORD', '1')
    expect(isDemoRecord()).toBe(false)
  })
})

describe('adminEmails', () => {
  it("parses ' A@x.com, ,b@y.com '", () => {
    vi.stubEnv('ADMIN_EMAILS', ' A@x.com, ,b@y.com ')
    expect(adminEmails()).toEqual(['a@x.com', 'b@y.com'])
  })

  it('is empty when unset', () => {
    vi.stubEnv('ADMIN_EMAILS', undefined)
    expect(adminEmails()).toEqual([])
  })
})
