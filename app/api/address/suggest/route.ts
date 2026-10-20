import { getOptionalEnv } from '@/lib/env'
import { fetchStreets, MIN_STREET_CHARS, splitAddressInput } from '@/lib/lookup/suggest'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rateLimit'

// GET /api/address/suggest?q=<street words> -> { suggestions: [{ street, city, postcode }] }
//
// Feeds the home page's address dropdown. The page sends only the street words, never the
// house number, and nothing here logs or stores the query. Street names aren't personal,
// so a shared cache is fine, and it keeps us a polite user of Photon.

const SUGGESTIONS_PER_IP = { limit: 600, windowSeconds: 3600 }

export async function GET(req: Request) {
  // The rate counter needs the IP hash secret and database; without them (local preview) skip it.
  if (getOptionalEnv('IP_HASH_SECRET') && getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')) {
    const limit = await checkRateLimit(`suggest:${hashIp(clientIp(req))}`, SUGGESTIONS_PER_IP)
    if (!limit.allowed) return Response.json({ error: 'rate_limited' }, { status: 429 })
  }
  const q = new URL(req.url).searchParams.get('q') ?? ''
  // Even if a caller sends a house number, drop it before it can reach a third party.
  const { street } = splitAddressInput(q)
  if (street.length < MIN_STREET_CHARS) return Response.json({ suggestions: [] })
  const suggestions = await fetchStreets(street)
  return Response.json({ suggestions }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
