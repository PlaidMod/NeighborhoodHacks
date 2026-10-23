import 'server-only'
import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { buildWeekly } from '@/lib/weekly/build'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { loadItems, resolveBodies } from '@/lib/weekly/data'
import { toLiveData, type LiveData } from './live'

// The reader's real data for the /app screens. The bodies_token from the address lookup is
// kept in this cookie (body IDs only, signed: lib/tokens.ts), set by /app/use?t=<token>.
export const BODIES_COOKIE = 'showup_bodies'
/** Guests stay remembered on this browser for about six months. */
export const BODIES_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

/** Real bodies and items when the reader has looked up an address; null means "show the demo". */
export async function loadLiveData(now: Date = new Date()): Promise<LiveData | null> {
  const jar = await cookies()
  const token = jar.get(BODIES_COOKIE)?.value
  if (!token) return null
  const resolved = await resolveBodies(token)
  if (!resolved.bodies) return null
  // The timeline looks further back and ahead than the weekly brief (plan §10).
  const items = await loadItems(resolved.mode, resolved.bodies, { now, fromDays: 30, toDays: 60 })
  const stakes = parseStakes(jar.get(STAKES_COOKIE)?.value)
  const lang = (await getLocale()) === 'es' ? 'es' : 'en'
  // The brief's sections and order come from P3's buildWeekly (plan §10), which applies its own 7-back/14-ahead window.
  const edition = buildWeekly({ items, bodies: resolved.bodies, stakes, now, lang })
  return toLiveData(resolved.mode, resolved.bodies, items, stakes, edition, lang)
}
