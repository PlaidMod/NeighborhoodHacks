import { describe, expect, it } from 'vitest'
import { filterByWindow, formatQuizLine, summarizeQuiz, type QuizRow } from '@/lib/quizReport'

const row = (actual: string[], selected: string[], created_at = '2026-10-21T23:00:00Z'): QuizRow => ({
  actual_types: actual,
  selected_types: selected,
  created_at,
})

describe('summarizeQuiz and formatQuizLine', () => {
  it("matches the plan's example: 14 of 18 (78%) didn't know they had a MUD", () => {
    const rows = [
      ...Array.from({ length: 14 }, () => row(['mud', 'city_council'], ['city_council'])),
      ...Array.from({ length: 4 }, () => row(['mud', 'city_council'], ['mud', 'city_council'])),
    ]
    const mud = summarizeQuiz(rows).find((s) => s.type === 'mud')!
    expect(mud).toEqual({ type: 'mud', had: 18, missed: 14 })
    expect(formatQuizLine(mud, 'a MUD')).toBe("14 of 18 (78%) didn't know they had a MUD")
  })

  it("rows without the type don't count toward had", () => {
    const rows = [row(['mud'], []), row(['esd'], ['esd']), row(['city_council'], [])]
    expect(summarizeQuiz(rows).find((s) => s.type === 'mud')).toEqual({ type: 'mud', had: 1, missed: 1 })
  })

  it('2 of 3 rounds to 67%', () => {
    expect(formatQuizLine({ had: 3, missed: 2 }, 'an ESD')).toBe("2 of 3 (67%) didn't know they had an ESD")
  })

  it('sorts by most missed, then by type', () => {
    const rows = [row(['mud', 'esd', 'hcad'], []), row(['mud', 'esd'], ['esd'])]
    expect(summarizeQuiz(rows).map((s) => s.type)).toEqual(['mud', 'esd', 'hcad'])
  })

  it('no rows gives []', () => {
    expect(summarizeQuiz([])).toEqual([])
  })
})

describe('filterByWindow', () => {
  it('keeps since and drops until', () => {
    const rows = [
      row([], [], '2026-10-21T17:59:59Z'),
      row([], [], '2026-10-21T18:00:00Z'),
      row([], [], '2026-10-22T16:59:59Z'),
      row([], [], '2026-10-22T17:00:00Z'),
    ]
    const kept = filterByWindow(rows, '2026-10-21T18:00:00Z', '2026-10-22T17:00:00Z')
    expect(kept.map((r) => r.created_at)).toEqual(['2026-10-21T18:00:00Z', '2026-10-22T16:59:59Z'])
  })

  it('keeps everything when no window is given', () => {
    const rows = [row([], [], '2026-10-01T00:00:00Z'), row([], [], '2026-12-01T00:00:00Z')]
    expect(filterByWindow(rows)).toHaveLength(2)
  })
})
