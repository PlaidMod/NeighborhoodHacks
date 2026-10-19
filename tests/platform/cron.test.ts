import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAuthorizedCron, unauthorizedCronResponse } from '@/lib/cron'

const URL = 'https://example.com/api/cron/ingest'
const withAuth = (value?: string) => new Request(URL, value === undefined ? {} : { headers: { authorization: value } })

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isAuthorizedCron', () => {
  it('accepts the right bearer token', () => {
    expect(isAuthorizedCron(withAuth('Bearer s3cret'), 's3cret')).toBe(true)
  })

  it('rejects a wrong token', () => {
    expect(isAuthorizedCron(withAuth('Bearer nope'), 's3cret')).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(isAuthorizedCron(withAuth(), 's3cret')).toBe(false)
  })

  it("rejects 'Bearer undefined' and 'Bearer ' when the secret is unset", () => {
    vi.stubEnv('CRON_SECRET', undefined)
    expect(isAuthorizedCron(withAuth('Bearer undefined'), undefined)).toBe(false)
    expect(isAuthorizedCron(withAuth('Bearer '), undefined)).toBe(false)
  })

  it("rejects everything when the secret is ''", () => {
    expect(isAuthorizedCron(withAuth('Bearer '), '')).toBe(false)
    expect(isAuthorizedCron(withAuth(''), '')).toBe(false)
  })

  it('rejects a token of different length without throwing', () => {
    expect(() => isAuthorizedCron(withAuth('Bearer s3cret-but-much-longer'), 's3cret')).not.toThrow()
    expect(isAuthorizedCron(withAuth('Bearer s3cret-but-much-longer'), 's3cret')).toBe(false)
  })

  it('rejects the raw secret without the Bearer prefix', () => {
    expect(isAuthorizedCron(withAuth('s3cret'), 's3cret')).toBe(false)
  })
})

describe('unauthorizedCronResponse', () => {
  it('is a 401 with a JSON error', async () => {
    const res = unauthorizedCronResponse()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })
})
