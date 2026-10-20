/** One eligibility predicate for the item picker and the server-side resolver. */
export function isSpeakItem(item: { type: string; comment?: unknown }) {
  return Boolean(item.comment) || ["agenda", "hearing", "meeting"].includes(item.type)
}
export function selectSpeakItems<T extends { id: string; type: string; date: string; comment?: unknown; outcomePending?: boolean }>(items: T[], requestedId: string | null, now: number): T[] {
  return items.filter(item => isSpeakItem(item) && (item.id === requestedId || (!item.outcomePending && Date.parse(item.date) >= now)))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}
export function speakingTarget(recipe: { minutes: number | null; practiceMinutes?: number } | null) {
  if (recipe && Number.isFinite(recipe.minutes) && (recipe.minutes ?? 0) > 0) return { minutes: recipe.minutes!, verified: true }
  const practice = recipe?.practiceMinutes
  return { minutes: practice && Number.isFinite(practice) && practice > 0 ? practice : 2, verified: false }
}
