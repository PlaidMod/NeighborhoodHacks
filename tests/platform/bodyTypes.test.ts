import { describe, expect, it } from 'vitest'
import { QUIZ_BODY_TYPES } from '@/lib/contracts/bodyTypes'

describe('QUIZ_BODY_TYPES', () => {
  it("has the plan's 12 types in order with no duplicates", () => {
    expect([...QUIZ_BODY_TYPES]).toEqual([
      'city_council',
      'commissioners_court',
      'school_board',
      'college_board',
      'mud',
      'esd',
      'water_authority',
      'flood_control',
      'port',
      'metro',
      'hcad',
      'hoa',
    ])
    expect(new Set(QUIZ_BODY_TYPES).size).toBe(QUIZ_BODY_TYPES.length)
  })
})
