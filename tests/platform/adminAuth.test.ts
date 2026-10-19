import { describe, expect, it } from 'vitest'
import { isAdminEmail } from '@/lib/adminAuth'

const ALLOW = ['a@x.com', 'b@y.org']

describe('isAdminEmail', () => {
  it('matches ignoring case and spaces', () => {
    expect(isAdminEmail('A@X.com', ALLOW)).toBe(true)
    expect(isAdminEmail('  b@y.org ', ALLOW)).toBe(true)
  })

  it("null and '' are not admins", () => {
    expect(isAdminEmail(null, ALLOW)).toBe(false)
    expect(isAdminEmail(undefined, ALLOW)).toBe(false)
    expect(isAdminEmail('', ALLOW)).toBe(false)
  })

  it('an email not on the list is not an admin', () => {
    expect(isAdminEmail('c@z.net', ALLOW)).toBe(false)
    expect(isAdminEmail('a@x.com.evil.net', ALLOW)).toBe(false)
  })

  it('an empty allowlist admits nobody', () => {
    expect(isAdminEmail('a@x.com', [])).toBe(false)
  })
})
