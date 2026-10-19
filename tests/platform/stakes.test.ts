import { describe, expect, it } from 'vitest'
import { STAKES, STAKES_COOKIE, nextAfterStake, parseStakes, serializeStakes } from '@/lib/stakes'

describe('stakes', () => {
  it("has the plan's four stakes in display order and the shared cookie name", () => {
    expect([...STAKES]).toEqual(['student', 'parent', 'renter', 'homeowner'])
    expect(STAKES_COOKIE).toBe('showup_stakes')
  })

  it("parseStakes('renter,student,renter,admin') → ['student','renter']", () => {
    expect(parseStakes('renter,student,renter,admin')).toEqual(['student', 'renter'])
  })

  it('parseStakes(undefined) → []', () => {
    expect(parseStakes(undefined)).toEqual([])
    expect(parseStakes('')).toEqual([])
  })

  it('parseStakes reads the URL-encoded value a browser sees in document.cookie', () => {
    expect(parseStakes('student%2Crenter')).toEqual(['student', 'renter'])
    expect(parseStakes('%E0%A4%A')).toEqual([])
  })

  it('parseStakes ignores spaces and case', () => {
    expect(parseStakes(' Parent , HOMEOWNER ')).toEqual(['parent', 'homeowner'])
  })

  it("serializeStakes(['homeowner','student']) → 'student,homeowner'", () => {
    expect(serializeStakes(['homeowner', 'student'])).toBe('student,homeowner')
  })
})

describe('nextAfterStake', () => {
  it("'idle' → '/' (no lookup running, e.g. a reload or a direct visit)", () => {
    expect(nextAfterStake('idle')).toBe('/')
  })
  it("'error' → '/' (try another address)", () => {
    expect(nextAfterStake('error')).toBe('/')
  })
  it("'loading' → '/results'", () => {
    expect(nextAfterStake('loading')).toBe('/results')
  })
  it("'done' → '/results'", () => {
    expect(nextAfterStake('done')).toBe('/results')
  })
})
