import type { LookupState } from '@/lib/flow/lookupState'

// The visitor's "stakes" (Project_Plan.md feature 5): who they are, so each part can show
// what matters to them first. Shared contract: P1 sorts results, P3 picks the lead story,
// P4 applies the student rule. Stored in the showup_stakes cookie, which holds no personal data.

export const STAKES = ['student', 'parent', 'renter', 'homeowner'] as const
export type Stake = (typeof STAKES)[number]
export const STAKES_COOKIE = 'showup_stakes'

export function isStake(value: unknown): value is Stake {
  return typeof value === 'string' && (STAKES as readonly string[]).includes(value)
}

/**
 * Reads the cookie value: drops unknown entries and duplicates, returns them in display order.
 * Accepts the URL-encoded form too ("student%2Crenter"), which is what document.cookie shows,
 * because commas aren't allowed raw in cookie values.
 */
export function parseStakes(raw: string | undefined): Stake[] {
  let text = raw ?? ''
  try {
    text = decodeURIComponent(text)
  } catch {
    return []
  }
  const chosen = new Set(text.split(',').map((part) => part.trim().toLowerCase()))
  return STAKES.filter((stake) => chosen.has(stake))
}

export function serializeStakes(stakes: readonly Stake[]): string {
  return STAKES.filter((stake) => stakes.includes(stake)).join(',')
}

/** Where Continue goes: results while a lookup is running or done, otherwise back home for an address. */
export function nextAfterStake(status: LookupState['status']): '/results' | '/' {
  return status === 'loading' || status === 'done' ? '/results' : '/'
}
