// DRAFT shared contract, waiting on P1's sign-off (P1 owns bodies.type).
// The plan's 12 "Who governs you?" choices (Project_Plan.md, feature 2), in display order.
export const QUIZ_BODY_TYPES = [
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
] as const

export type QuizBodyType = (typeof QUIZ_BODY_TYPES)[number]
/** A body's type. "other" covers anything outside the quiz list, such as CenterPoint. */
export type BodyType = QuizBodyType | 'other'
