import { validateAddress } from '@/lib/address'
import { LOOKUP_ERROR_STATUS, type LookupErrorCode, type LookupResponse } from '@/lib/contracts/lookup'
import { getOptionalEnv } from '@/lib/env'
import { CensusUnavailableError, geocodeCensus, type CensusMatch } from '@/lib/lookup/census'
import { NOT_GOVERNMENT, bodiesFromCensus } from '@/lib/lookup/standIn'
import { fetchStreets, formatAddress, splitAddressInput } from '@/lib/lookup/suggest'
import { RATE_LIMITS, checkRateLimit, clientIp, hashIp } from '@/lib/rateLimit'
import { signBodiesToken } from '@/lib/tokens'

// TEMPORARY stand-in for P1's POST /api/lookup (Technical Plan §3). It follows the
// contract in lib/contracts/lookup.ts, so P1 can replace the body of this file without
// touching the home page or the stake picker. See lib/lookup/standIn.ts for what it
// can and can't find. Nothing about the address is stored or logged.

const error = (code: LookupErrorCode, message: string) =>
  Response.json({ error: { code, message } }, { status: LOOKUP_ERROR_STATUS[code] })

/** The address as typed, then (if it has no ZIP) the street with Photon's likeliest cities and ZIPs. */
async function candidates(address: string): Promise<string[]> {
  const list = [address]
  if (/\b\d{5}\b/.test(address)) return list
  const { number, street } = splitAddressInput(address)
  const streets = await fetchStreets(street)
  for (const s of streets.slice(0, 2)) list.push(formatAddress(s, number))
  return list
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { address?: unknown } | null
  const check = validateAddress(typeof body?.address === 'string' ? body.address : '')
  if (!check.ok) return error('invalid_address', 'Enter a street address.')

  if (getOptionalEnv('IP_HASH_SECRET') && getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')) {
    const limit = await checkRateLimit(`lookup:${hashIp(clientIp(req))}`, RATE_LIMITS.lookupPerIp)
    if (!limit.allowed) return error('rate_limited', 'Too many lookups. Try again later.')
  }

  let match: CensusMatch | null = null
  try {
    for (const candidate of await candidates(check.value)) {
      match = await geocodeCensus(candidate)
      if (match) break
    }
  } catch (e) {
    if (e instanceof CensusUnavailableError) return error('server_error', 'The address service is down. Try again.')
    throw e
  }
  if (!match) return error('not_found', 'We could not find that address.')
  if (match.countyFips !== '48201') return error('outside_harris', 'That address is outside Harris County.')

  const bodies = bodiesFromCensus(match)
  const ids = bodies.map((b) => b.id)
  let token: string
  try {
    token = signBodiesToken(ids)
  } catch (e) {
    // Without BODIES_TOKEN_SECRET a link can't be signed. Fine for a local preview; never in production.
    if (getOptionalEnv('VERCEL_ENV') === 'production') throw e
    token = 'unsigned-preview'
  }
  const response: LookupResponse = {
    bodies_token: token,
    bodies,
    ballot: [],
    not_government: NOT_GOVERNMENT,
    regional: [],
    hoa: null,
  }
  return Response.json(response, { headers: { 'Cache-Control': 'no-store', 'X-Lookup': 'census-stand-in' } })
}
