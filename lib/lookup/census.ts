// Census Geocoder client (Technical Plan §3, step 2). Server-only.
// Confirms an address and says which county, city and school district it's in.

export type CensusMatch = {
  matchedAddress: string
  countyFips: string
  /** "Houston city" style name from the Census, when the address is inside a city. */
  place: string | null
  schoolDistrict: string | null
  /** Address-level point from TIGER geocoding; never returned to the browser. */
  coordinates: { longitude: number; latitude: number } | null
}

const URL_BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress'

type Geo = { NAME?: string; GEOID?: string }
type Fetch = typeof fetch

export class CensusUnavailableError extends Error {
  constructor() {
    super('The Census Geocoder could not be reached.')
    this.name = 'CensusUnavailableError'
  }
}

/** Reads one Census response. Returns null when the address has no match. */
export function parseCensus(json: unknown): CensusMatch | null {
  const match = (json as { result?: { addressMatches?: unknown[] } } | null)?.result?.addressMatches?.[0] as
  | {
      matchedAddress?: string
      geographies?: Record<string, Geo[]>
      coordinates?: { x?: unknown; y?: unknown }
    }
    | undefined
  if (!match?.geographies) return null
  const g = match.geographies
  const county = g.Counties?.[0]?.GEOID
  if (!county || !match.matchedAddress) return null
  const x = match.coordinates?.x
  const y = match.coordinates?.y
  const longitude = typeof x === 'number' ? x : Number.NaN
  const latitude = typeof y === 'number' ? y : Number.NaN
  const coordinates = Number.isFinite(longitude) && Number.isFinite(latitude)
    && longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90
    ? { longitude, latitude }
    : null
  return {
    matchedAddress: match.matchedAddress,
    countyFips: county,
    place: g['Incorporated Places']?.[0]?.NAME ?? null,
    schoolDistrict: g['Unified School Districts']?.[0]?.NAME ?? null,
    coordinates,
  }
}

export async function geocodeCensus(address: string, opts: { fetchImpl?: Fetch; timeoutMs?: number } = {}): Promise<CensusMatch | null> {
  const url = new URL(URL_BASE)
  url.searchParams.set('address', address)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('vintage', 'Current_Current')
  url.searchParams.set('layers', 'Counties,Incorporated Places,Unified School Districts')
  url.searchParams.set('format', 'json')
  try {
    const res = await (opts.fetchImpl ?? fetch)(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000) })
    if (!res.ok) throw new CensusUnavailableError()
    return parseCensus(await res.json())
  } catch {
    throw new CensusUnavailableError()
  }
}
