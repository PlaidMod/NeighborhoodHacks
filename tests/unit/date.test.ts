import { describe, expect, it } from 'vitest'
import { houstonDate } from '@/lib/date'

describe('houstonDate', () => {
  it('uses the Harris County calendar date across the UTC day boundary', () => {
    expect(houstonDate(new Date('2026-10-21T02:00:00.000Z'))).toBe('2026-10-20')
  })
})
