import type { Body, Update } from './types'

/** Local ballot items belong to bodies returned by the address lookup. */
export function localBallotUpdates(updates: readonly Update[], bodies: readonly Body[]): Update[] {
  const bodyIds = new Set(bodies.map((body) => body.id))
  return updates.filter((update) => update.type === 'election' && bodyIds.has(update.bodyId))
}
