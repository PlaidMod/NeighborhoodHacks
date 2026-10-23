import { describe, expect, it } from 'vitest'
import { signedInWithPassword } from '@/lib/adminAuth'

describe('signedInWithPassword', () => {
  it('accepts a password sign-in and rejects Google or missing claims', () => {
    expect(signedInWithPassword({ amr: [{ method: 'password', timestamp: 1 }] })).toBe(true)
    expect(signedInWithPassword({ amr: [{ method: 'oauth', timestamp: 1 }] })).toBe(false)
    expect(signedInWithPassword({})).toBe(false)
    expect(signedInWithPassword(null)).toBe(false)
  })
})
