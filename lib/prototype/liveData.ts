import 'server-only'
import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { buildWeekly } from '@/lib/weekly/build'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { readerItems } from '@/lib/weekly/readerItems'
import { toLiveData, type LiveData } from './live'

// The reader's real data for the /app screens. The bodies_token from the address lookup is
// kept in this cookie (body IDs only, signed: lib/tokens.ts), set by /app/use?t=<token>.
// The AI weekly summary isn't loaded here: the dashboard fetches it from /api/weekly/summary
// after the page shows, so writing it (up to ~15s) never holds the page up.
export const BODIES_COOKIE = 'showup_bodies'
/** Guests stay remembered on this browser for about six months. */
export const BODIES_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

/** Real bodies and items when the reader has looked up an address; null means "show the demo". */
export async function loadLiveData(now: Date = new Date()): Promise<LiveData | null> {
  const jar = await cookies()
  const token = jar.get(BODIES_COOKIE)?.value
  if (!token) return null
  const lang = (await getLocale()) === 'es' ? 'es' : 'en'
  const { resolved, items } = await readerItems(token, lang, now)
  if (!resolved.bodies) return null
  const stakes = parseStakes(jar.get(STAKES_COOKIE)?.value)
  // The brief's sections and order come from P3's buildWeekly (plan §10), which applies its own 7-back/14-ahead window.
  const edition = buildWeekly({ items, bodies: resolved.bodies, stakes, now, lang })
  return toLiveData(resolved.mode, resolved.bodies, items, stakes, edition, lang)
}
