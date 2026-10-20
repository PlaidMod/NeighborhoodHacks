import { cookies } from 'next/headers'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { buildWeekly } from '@/lib/weekly/build'
import { loadItems, resolveBodies } from '@/lib/weekly/data'

// GET /api/weekly?t={bodies_token}&lang=en|es (Technical Plan §10).
// Without a database connection it answers with the labeled sample data.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en'
  const resolved = await resolveBodies(url.searchParams.get('t'))
  if (!resolved.bodies) {
    return Response.json({ error: resolved.reason }, { status: resolved.reason === 'no_token' ? 400 : 403 })
  }
  const stakes = parseStakes((await cookies()).get(STAKES_COOKIE)?.value)
  const items = await loadItems(resolved.mode, resolved.bodies)
  const edition = buildWeekly({
    items,
    bodies: resolved.bodies.map((b) => ({ body_id: b.body_id, body_name: b.body_name })),
    stakes,
    now: new Date(),
    lang,
  })
  return Response.json(
    { sample: resolved.mode === 'sample', ...edition },
    // The token holds body IDs only, so one hour of shared caching per token is safe (plan §10).
    { headers: { 'Cache-Control': resolved.mode === 'db' ? 'public, s-maxage=3600' : 'no-store' } },
  )
}
