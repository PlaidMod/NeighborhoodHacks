import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertServer } from '@/lib/env'
import { db } from '@/lib/db'

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test_only')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('assertServer', () => {
  it('throws in a browser-like environment', () => {
    vi.stubGlobal('window', {})
    expect(() => assertServer('thing')).toThrow('thing')
  })
})

describe('db', () => {
  it('throws in a browser-like environment', () => {
    vi.stubGlobal('window', {})
    expect(() => db()).toThrow('db()')
  })

  it('returns the same client twice', () => {
    const first = db()
    expect(first).toBeDefined()
    expect(db()).toBe(first)
  })
})
