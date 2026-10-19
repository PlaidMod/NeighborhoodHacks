import { describe, expect, it } from 'vitest'
import { MAX_ADDRESS_LENGTH, normalizeAddressInput, validateAddress } from '@/lib/address'

describe('normalizeAddressInput', () => {
  it("normalizes '  123  Main St\nHouston TX ' to '123 Main St Houston TX'", () => {
    expect(normalizeAddressInput('  123  Main St\nHouston TX ')).toBe('123 Main St Houston TX')
  })

  it('collapses tabs and Windows line breaks', () => {
    expect(normalizeAddressInput('12014\tFallbrook Dr\r\nHouston, TX 77065')).toBe('12014 Fallbrook Dr Houston, TX 77065')
  })
})

describe('validateAddress', () => {
  it("empty or whitespace is 'empty'", () => {
    expect(validateAddress('')).toEqual({ ok: false, reason: 'empty' })
    expect(validateAddress('   \n\t ')).toEqual({ ok: false, reason: 'empty' })
  })

  it("201 characters is 'too_long' and 200 is ok", () => {
    expect(MAX_ADDRESS_LENGTH).toBe(200)
    expect(validateAddress('a'.repeat(201))).toEqual({ ok: false, reason: 'too_long' })
    expect(validateAddress('a'.repeat(200))).toEqual({ ok: true, value: 'a'.repeat(200) })
  })

  it('returns the normalized value', () => {
    expect(validateAddress('  3100 Cleburne St ')).toEqual({ ok: true, value: '3100 Cleburne St' })
  })
})
