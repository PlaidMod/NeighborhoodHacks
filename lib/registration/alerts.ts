import { getWindow } from './deadlines'
import { getRecipe } from './recipes'

/** Known common bounds only: method-specific or unknown windows never become guessed SMS dates. */
export function alertWindow(bodyId: string, meeting: { date: string; type: string | null; status: string }, now: Date) {
  if (meeting.status !== 'scheduled') return null
  const recipe = getRecipe(bodyId, meeting.type, meeting.date)
  if (!recipe) return null
  const window = getWindow(recipe, meeting.date, now)
  if (!window.opensAt && !window.closesAt) return null
  return { opens_at: window.opensAt ?? null, closes_at: window.closesAt ?? null }
}
