import { cookies } from 'next/headers'
import { BODIES_COOKIE } from '@/lib/prototype/liveData'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { buildWeekly } from '@/lib/weekly/build'
import { startWeeklyNarrative } from '@/lib/weekly/narrativeCache'
import { readerItems } from '@/lib/weekly/readerItems'

// GET /api/weekly/summary?t={bodies_token}&lang=en|es: the AI-written "This week, in short" for
// the reader's governments. The dashboard and /weekly fetch it after they show, so the page never
// waits for it. Without ?t= it uses the lookup remembered in this browser (the dashboard).
// Answers { points: null } when no summary could be written; the page then keeps its own lines.

/** The model can take ~15s on a cold cache; this request is the one that waits for it. */
export const maxDuration = 60

const PRIVATE = { 'Cache-Control': 'private, no-store' }

export async function GET(req: Request) {
  const url = new URL(req.url)
  const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en'
  const jar = await cookies()
  const token = url.searchParams.get('t') || jar.get(BODIES_COOKIE)?.value
  if (!token) return Response.json({ error: 'no_token' }, { status: 400, headers: PRIVATE })
  const now = new Date()
  const { resolved, items } = await readerItems(token, lang, now)
  if (!resolved.bodies) return Response.json({ error: resolved.reason }, { status: 403, headers: PRIVATE })
  const stakes = parseStakes(jar.get(STAKES_COOKIE)?.value)
  const edition = buildWeekly({ items, bodies: resolved.bodies, stakes, now, lang })
  // Shared between servers, and one AI call at a time per summary (lib/weekly/narrativeCache.ts).
  const points = await startWeeklyNarrative(edition, lang, 0).done
  return Response.json({ points }, { headers: PRIVATE })
}
