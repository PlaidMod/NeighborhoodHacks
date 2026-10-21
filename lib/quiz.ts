import { QUIZ_BODY_TYPES, type QuizBodyType } from '@/lib/contracts/bodyTypes'

export type QuizScore = {
  actual_types: QuizBodyType[]
  selected_types: QuizBodyType[]
  missed_types: QuizBodyType[]
  incorrect_types: QuizBodyType[]
  correct_count: number
  score_percent: number | null
  hoa_note: boolean
  unsure: boolean
}

export function scoreBodyQuiz(selected: readonly QuizBodyType[], actual: readonly QuizBodyType[], unsure = false): QuizScore {
  const actualTypes = [...new Set(actual.filter((type) => type !== 'hoa'))]
  const selectedTypes = unsure ? [] : [...new Set(selected)]
  const actualSet = new Set<QuizBodyType>(actualTypes)
  const selectedSet = new Set<QuizBodyType>(selectedTypes)
  const missed = unsure ? [] : actualTypes.filter((type) => !selectedSet.has(type))
  const incorrect = selectedTypes.filter((type) => !actualSet.has(type))
  const correctCount = selectedTypes.filter((type) => actualSet.has(type)).length
  return {
    actual_types: actualTypes,
    selected_types: selectedTypes,
    missed_types: missed,
    incorrect_types: incorrect,
    correct_count: correctCount,
    score_percent: unsure || !actualTypes.length ? null : Math.round((correctCount / actualTypes.length) * 100),
    hoa_note: selectedTypes.includes('hoa'),
    unsure,
  }
}

export function isQuizBodyType(value: unknown): value is QuizBodyType {
  return typeof value === 'string' && (QUIZ_BODY_TYPES as readonly string[]).includes(value)
}
