// Address suggestions while someone types (home page dropdown).
//
// Photon (https://photon.komoot.io, built on OpenStreetMap) finds the street and its
// city and ZIP. It almost never has house numbers, so the house number stays in the
// browser: it is split off before anything is sent, and added back to the suggestion
// by the form. Census confirms the full address when the lookup runs.
//
// Nothing here stores or logs what was typed.

export type StreetSuggestion = { street: string; city: string; postcode: string }

/** Harris County, roughly. Photon only returns places inside this box. */
export const HARRIS_BBOX = '-95.97,29.50,-94.90,30.17'

export const MIN_STREET_CHARS = 3
export const MAX_SUGGESTIONS = 6

const PHOTON_URL = 'https://photon.komoot.io/api/'
const USER_AGENT = 'ShowUp-HTX/0.1 (student civic project; address suggestions)'

/**
 * Splits what someone typed into a leading house number and the street words.
 *   "16915 Apple River Dr, Cypress" -> { number: "16915", street: "Apple River Dr" }
 *   "apple riv"                     -> { number: null, street: "apple riv" }
 * Anything after the first comma (a city or ZIP they typed) is dropped from `street`.
 */
export function splitAddressInput(raw: string): { number: string | null; street: string } {
  const text = raw.replace(/\s+/g, ' ').trim().split(',')[0] ?? ''
  const match = text.match(/^(\d+[A-Za-z]?(?:-\d+)?)\s+(.*)$/)
  if (match) return { number: match[1]!, street: match[2]!.trim() }
  // Only a number so far ("16915"): nothing to look up yet.
  if (/^\d+[A-Za-z]?$/.test(text)) return { number: text, street: '' }
  return { number: null, street: text }
}

type PhotonFeature = { properties?: Record<string, unknown> }

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Reads Photon's GeoJSON: Harris County streets in Texas with a ZIP, de-duplicated. */
export function parsePhoton(json: unknown): StreetSuggestion[] {
  const features = (json as { features?: PhotonFeature[] } | null)?.features
  if (!Array.isArray(features)) return []
  const seen = new Set<string>()
  const out: StreetSuggestion[] = []
  // Real street results first: single "house" entries are often landmarks with a stray ZIP.
  const ordered = [...features].sort((a, b) => Number(b.properties?.type === 'street') - Number(a.properties?.type === 'street'))
  for (const f of ordered) {
    const p = f.properties ?? {}
    if (str(p.state) !== 'Texas' || !/^harris/i.test(str(p.county) ?? '')) continue
    // Streets carry their name in `name`; house and address results use `street`.
    const street = str(p.street) ?? (p.type === 'street' ? str(p.name) : null)
    const postcode = str(p.postcode)?.match(/^\d{5}/)?.[0]
    if (!street || !postcode) continue
    const city = str(p.city) ?? str(p.locality) ?? str(p.district) ?? 'Houston'
    const key = `${street.toLowerCase()}|${postcode}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ street, city, postcode })
    if (out.length === MAX_SUGGESTIONS) break
  }
  return out
}

/** "16915 Apple River Drive, Cypress, TX 77433" (the number is omitted until it's typed). */
export function formatAddress(s: StreetSuggestion, number?: string | null) {
  return `${number ? `${number} ` : ''}${s.street}, ${s.city}, TX ${s.postcode}`
}

type Fetch = typeof fetch

/** Asks Photon for streets matching `fragment`. Returns [] on any failure so typing never breaks. */
export async function fetchStreets(fragment: string, opts: { fetchImpl?: Fetch; timeoutMs?: number } = {}): Promise<StreetSuggestion[]> {
  const q = fragment.replace(/\s+/g, ' ').trim()
  if (q.length < MIN_STREET_CHARS || q.length > 80) return []
  const url = new URL(PHOTON_URL)
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '12')
  url.searchParams.set('lang', 'en')
  url.searchParams.set('bbox', HARRIS_BBOX)
  // Lean toward central Houston, where most Harris County addresses are.
  url.searchParams.set('lat', '29.76')
  url.searchParams.set('lon', '-95.37')
  try {
    const res = await (opts.fetchImpl ?? fetch)(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 4000),
    })
    if (!res.ok) return []
    return parsePhoton(await res.json())
  } catch {
    return []
  }
}
