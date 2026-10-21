import { validateAddress } from '@/lib/address'
import { LOOKUP_ERROR_STATUS, type LookupBody, type LookupErrorCode, type LookupResponse } from '@/lib/contracts/lookup'
import { rpcRows, selectRows } from '@/lib/db/raw'
import { demoCached, lookupDemoKey } from '@/lib/demo'
import { getEnv, getOptionalEnv, isDemoMode, isDemoRecord } from '@/lib/env'
import { CensusUnavailableError, geocodeCensus, type CensusMatch } from '@/lib/lookup/census'
import { fetchStreets, formatAddress, splitAddressInput } from '@/lib/lookup/suggest'
import { normalizeHcadAddress, parcelAddressCandidates } from '@/lib/lookup/normalize'
import { mergeLookupBodies, type BodyCatalogRow, type TaxRateRow } from '@/lib/lookup/merge'
import { subdivisionFromLegalDescription } from '@/lib/lookup/hoa'
import { bodiesFromCensus } from '@/lib/lookup/standIn'
import { RATE_LIMITS, checkRateLimit, clientIp, hashIp } from '@/lib/rateLimit'
import { signBodiesToken } from '@/lib/tokens'

type ParcelRow = {
  account: string
  legal_description: string | null
  longitude: number | null
  latitude: number | null
  jurisdiction_codes: string[]
}
type BallotRow = LookupResponse['ballot'][number]
type HoaCandidate = {
  subdivision_name: string
  hoa_body_id: string | null
  master_hoa_body_id: string | null
  source_url: string | null
  verified: boolean
  match_score: number
}
type LookupPayload = Omit<LookupResponse, 'bodies_token'>

class LookupFailure extends Error {
  constructor(readonly code: LookupErrorCode, message: string) {
    super(message)
    this.name = 'LookupFailure'
  }
}

const error = (code: LookupErrorCode, message: string) =>
  Response.json({ error: { code, message } }, { status: LOOKUP_ERROR_STATUS[code], headers: { 'Cache-Control': 'no-store' } })

/** Photon only receives street words; the house number remains between this server and Census. */
async function candidates(address: string): Promise<string[]> {
  const list = [address]
  if (/\b\d{5}\b/.test(address)) return list
  const { number, street } = splitAddressInput(address)
  if (!street) return list
  for (const suggestion of (await fetchStreets(street)).slice(0, 2)) list.push(formatAddress(suggestion, number))
  return [...new Set(list)]
}

async function matchCensus(addresses: readonly string[]): Promise<{ match: CensusMatch; candidate: string } | null> {
  for (const address of addresses) {
    const match = await geocodeCensus(address)
    if (match) return { match, candidate: address }
  }
  return null
}

async function matchParcel(addresses: readonly string[]): Promise<ParcelRow | null> {
  for (const address of addresses) {
    const normalized = normalizeHcadAddress(address)
    if (!normalized) continue
    const found = await rpcRows<ParcelRow>('lookup_hcad_parcel', { p_site_address_norm: normalized })
    if (found.length > 1) throw new LookupFailure('not_found', 'We could not match that address to one parcel.')
    if (found[0]) return found[0]
  }
  return null
}

function ancillaryBody(body: {
  id: string
  name: string
  type: LookupBody['type']
  category: LookupBody['category']
  description?: string | null
  meetingInfoUrl?: string | null
}): LookupBody {
  return {
    id: body.id,
    name: body.name,
    type: body.type,
    category: body.category,
    elected_or_appointed: null,
    description: body.description ?? null,
    meeting_info_url: body.meetingInfoUrl ?? null,
    verified: false,
    source_kind: null,
    tax_source_url: null,
    tax_rate: null,
    tax_year: null,
    last_vote_date: null,
  }
}

async function buildPayload(address: string): Promise<LookupPayload> {
  const addressCandidates = await candidates(address)
  let censusResult: { match: CensusMatch; candidate: string } | null = null
  let censusUnavailable = false
  try {
    censusResult = await matchCensus(addressCandidates)
  } catch (cause) {
    if (!(cause instanceof CensusUnavailableError)) throw cause
    censusUnavailable = true
  }
  const census = censusResult?.match ?? null
  if (census && census.countyFips !== '48201') {
    throw new LookupFailure('outside_harris', 'This address is outside Harris County.')
  }

  const parcelCandidates = parcelAddressCandidates(
    censusResult ? { censusMatchedAddress: censusResult.match.matchedAddress, censusQueryAddress: censusResult.candidate } : null,
    addressCandidates,
  )
  const parcel = await matchParcel(parcelCandidates)
  if (!parcel && !census) {
    // A Census outage is different from a genuine no-match; don't mislabel it as an invalid address.
    if (censusUnavailable) throw new LookupFailure('server_error', 'The address service is temporarily unavailable. Try again.')
    throw new LookupFailure('not_found', 'We could not find that address in Harris County.')
  }
  if (!parcel) throw new LookupFailure('not_found', 'We could not match that address to a Harris County parcel.')

  const longitude = census?.coordinates?.longitude ?? parcel.longitude
  const latitude = census?.coordinates?.latitude ?? parcel.latitude
  if (longitude === null || latitude === null || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new LookupFailure('not_found', 'We could not resolve a location for that parcel.')
  }

  const gisRows = await rpcRows<{ body_id: string }>('lookup_boundary_bodies', {
    p_longitude: longitude,
    p_latitude: latitude,
  })
  const codes = [...new Set(parcel.jurisdiction_codes ?? [])]
  const mappings = codes.length
    ? await selectRows<{ body_id: string }>('jurisdiction_map', 'body_id', (query) => query.in('hcad_code', codes))
    : []
  if (codes.length && mappings.length !== codes.length) {
    throw new LookupFailure('server_error', 'Some local taxing jurisdictions are not configured yet. Try again later.')
  }
  // HCAD appraises property countywide and is not normally a parcel tax code.
  const hcadIds = [...new Set(['hcad', ...mappings.map((row) => row.body_id)])]
  const gisIds = [...new Set(gisRows.map((row) => row.body_id))]
  const censusIds = census
    ? bodiesFromCensus(census)
        .filter((body) => body.type === 'city_council' || body.type === 'school_board' || body.type === 'college_board')
        .map((body) => body.id)
    : []
  const resolvedIds = [...new Set([...hcadIds, ...gisIds, ...censusIds])]
  const [catalog, rates, ballotRows, regionalRows, notGovernmentRows] = await Promise.all([
    resolvedIds.length
      ? selectRows<BodyCatalogRow>(
          'bodies',
          'id,name,type,category,elected_or_appointed,description_en,meeting_info_url,impact_rank,operator_name',
          (query) => query.in('id', resolvedIds),
        )
      : Promise.resolve([] as BodyCatalogRow[]),
    resolvedIds.length
      ? selectRows<TaxRateRow>(
          'tax_rates',
          'body_id,year,adopted_rate,last_vote_date,source_url',
          (query) => query.in('body_id', resolvedIds).order('year', { ascending: false }),
        )
      : Promise.resolve([] as TaxRateRow[]),
    resolvedIds.length
      ? selectRows<BallotRow>(
          'ballot_offices',
          'id,body_id,office_name,holder_name,next_election_date,source_url',
          (query) => query.in('body_id', resolvedIds).order('next_election_date'),
        )
      : Promise.resolve([] as BallotRow[]),
    selectRows<BodyCatalogRow>(
      'bodies',
      'id,name,type,category,elected_or_appointed,description_en,meeting_info_url,impact_rank,operator_name',
      (query) => query.eq('category', 'regional_coming_soon').order('impact_rank'),
    ),
    selectRows<BodyCatalogRow>(
      'bodies',
      'id,name,type,category,elected_or_appointed,description_en,meeting_info_url,impact_rank,operator_name',
      (query) => query.eq('category', 'not_government').order('impact_rank'),
    ),
  ])

  const catalogIds = new Set(catalog.map((body) => body.id))
  if (resolvedIds.some((id) => !catalogIds.has(id))) {
    throw new LookupFailure('server_error', 'Some local governing bodies are not configured yet. Try again later.')
  }

  const bodies = mergeLookupBodies({ catalog, hcadIds, gisIds, censusIds, rates })
  const verifiedIds = bodies.filter((body) => body.verified).map((body) => body.id)
  if (!verifiedIds.length) throw new LookupFailure('not_found', 'We could not verify local governing bodies for that address yet.')

  const subdivision = subdivisionFromLegalDescription(parcel.legal_description)
  let hoa: LookupPayload['hoa'] = null
  if (subdivision) {
    const candidates = await rpcRows<HoaCandidate>('lookup_hoa_candidates', { p_subdivision: subdivision })
    const candidate = candidates[0]
    if (candidate) {
      const exactName = candidate.subdivision_name.trim().toUpperCase() === subdivision.trim().toUpperCase()
      hoa = {
        subdivision_name: candidate.subdivision_name,
        hoa_body_id: candidate.hoa_body_id,
        master_hoa_body_id: candidate.master_hoa_body_id,
        source_url: candidate.source_url,
        association_verified: candidate.verified && exactName,
        status: 'needs_confirmation',
      }
    }
  }

  const centerpoint = ancillaryBody({ id: 'centerpoint', name: 'CenterPoint Energy', type: 'other', category: 'not_government' })
  const notGovernment = [
    centerpoint,
    ...notGovernmentRows.map((body) => ancillaryBody({
      id: body.id,
      name: body.name,
      type: body.type === 'other' ? 'other' : null,
      category: 'not_government',
      description: body.description_en,
      meetingInfoUrl: body.meeting_info_url,
    })),
  ]
  for (const body of catalog) {
    if (!body.operator_name) continue
    const id = `operator_${body.operator_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)}`
    if (notGovernment.some((item) => item.id === id)) continue
    notGovernment.push(ancillaryBody({ id, name: body.operator_name, type: 'other', category: 'not_government' }))
  }

  return {
    bodies,
    ballot: ballotRows.filter((office) => office.body_id && verifiedIds.includes(office.body_id)),
    not_government: notGovernment,
    regional: regionalRows.map((body) => ancillaryBody({
      id: body.id,
      name: body.name,
      type: null,
      category: 'regional_coming_soon',
      description: body.description_en,
      meetingInfoUrl: body.meeting_info_url,
    })),
    hoa,
  }
}

export async function POST(req: Request) {
  const input = (await req.json().catch(() => null)) as { address?: unknown } | null
  const checked = validateAddress(typeof input?.address === 'string' ? input.address : '')
  if (!checked.ok) return error('invalid_address', 'Enter a street address.')

  try {
    const production = getOptionalEnv('VERCEL_ENV') === 'production'
    const ipSecret = production ? getEnv('IP_HASH_SECRET') : getOptionalEnv('IP_HASH_SECRET')
    const serviceKey = production ? getEnv('SUPABASE_SERVICE_ROLE_KEY') : getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')
    if (production && (!ipSecret || !serviceKey)) throw new Error('Lookup security configuration is missing.')
    if (ipSecret && serviceKey) {
      const limit = await checkRateLimit(`lookup:${hashIp(clientIp(req), { secret: ipSecret })}`, RATE_LIMITS.lookupPerIp)
      if (!limit.allowed) throw new LookupFailure('rate_limited', 'Too many lookups. Try again later.')
      if (production && limit.degraded) throw new Error('Lookup rate limiting is unavailable.')
    }

    const cacheSecret = ipSecret ?? (isDemoMode() || isDemoRecord() ? getEnv('IP_HASH_SECRET') : 'cache-disabled')
    const cacheKey = lookupDemoKey(checked.value, cacheSecret)
    const payload = await demoCached<LookupPayload>(
      cacheKey,
      () => buildPayload(checked.value),
    )
    const ids = payload.bodies.filter((body) => body.verified).map((body) => body.id)
    const token = signBodiesToken(ids)
    const response: LookupResponse = { bodies_token: token, ...payload }
    return Response.json(response, {
      headers: { 'Cache-Control': 'no-store', 'X-Lookup': 'census+hcad+gis' },
    })
  } catch (cause) {
    if (cause instanceof LookupFailure) return error(cause.code, cause.message)
    if (cause instanceof CensusUnavailableError) return error('server_error', 'The address service is temporarily unavailable. Try again.')
    return error('server_error', 'We could not complete this lookup. Try again later.')
  }
}
