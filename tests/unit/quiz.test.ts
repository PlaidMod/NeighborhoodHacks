import { describe, expect, it } from 'vitest'
import { scoreBodyQuiz } from '@/lib/quiz'

describe('scoreBodyQuiz', () => {
  it('returns missed and incorrect types without counting HOA as a government', () => {
    expect(scoreBodyQuiz(['school_board', 'hoa'], ['school_board', 'mud', 'hoa'])).toMatchObject({
      missed_types: ['mud'],
      incorrect_types: ['hoa'],
      correct_count: 1,
      score_percent: 50,
      hoa_note: true,
    })
  })

  it('reveals the actual set without grading an unsure response', () => {
    expect(scoreBodyQuiz(['city_council'], ['school_board'], true)).toMatchObject({
      selected_types: [],
      actual_types: ['school_board'],
      missed_types: [],
      incorrect_types: [],
      score_percent: null,
      unsure: true,
    })
  })
})
