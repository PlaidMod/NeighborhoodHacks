import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CensusUnavailableError, geocodeCensus, parseCensus } from '@/lib/lookup/census'
import { bodiesFromCensus } from '@/lib/lookup/standIn'
import { fetchStreets, formatAddress, parsePhoton, splitAddressInput } from '@/lib/lookup/suggest'

// Fixtures are real responses saved on Oct 19, 2026.
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

describe('splitAddressInput', () => {
  it('separates the house number so it never has to leave the browser', () => {
    expect(splitAddressInput('16915 Apple River Drive')).toEqual({ number: '16915', street: 'Apple River Drive' })
    expect(splitAddressInput('  16915   apple  river  ')).toEqual({ number: '16915', street: 'apple river' })
  })
  it('ignores a city or ZIP typed after a comma', () => {
    expect(splitAddressInput('16915 Apple River Dr, Cypress, TX 77433')).toEqual({ number: '16915', street: 'Apple River Dr' })
  })
  it('handles a street with no number, a lone number and letter suffixes', () => {
    expect(splitAddressInput('apple riv')).toEqual({ number: null, street: 'apple riv' })
    expect(splitAddressInput('16915')).toEqual({ number: '16915', street: '' })
    expect(splitAddressInput('4100B Main St')).toEqual({ number: '4100B', street: 'Main St' })
  })
})

describe('parsePhoton', () => {
  it('keeps Harris County streets with a ZIP and drops Fort Bend results', () => {
    const s = parsePhoton(fixture('photon-apple-river.json'))
    expect(s).toEqual([{ street: 'Apple River Drive', city: 'Cypress', postcode: '77433' }])
  })
  it('returns nothing for junk', () => {
    expect(parsePhoton(null)).toEqual([])
    expect(parsePhoton({ features: 'no' })).toEqual([])
  })
  it('reads house results, falls back to locality, and removes duplicates', () => {
    const f = (props: Record<string, unknown>) => ({ properties: { state: 'Texas', county: 'Harris', postcode: '77004', ...props } })
    const out = parsePhoton({
      features: [
        f({ type: 'house', street: 'Cleburne Street', housenumber: '3100', city: 'Houston' }),
        f({ type: 'street', name: 'Cleburne Street', city: 'Houston' }),
        f({ type: 'street', name: 'Almeda Road', locality: 'Third Ward' }),
        f({ type: 'street', name: 'Elsewhere Road', state: 'Louisiana' }),
        f({ type: 'street', name: 'No Zip Road', postcode: undefined }),
      ],
    })
    // Street results come first; the house result's street is a duplicate and is dropped.
    expect(out).toEqual([
      { street: 'Cleburne Street', city: 'Houston', postcode: '77004' },
      { street: 'Almeda Road', city: 'Third Ward', postcode: '77004' },
    ])
  })
})

describe('ranking', () => {
  it('puts street results ahead of a landmark "house" result', () => {
    const f = (props: Record<string, unknown>) => ({ properties: { state: 'Texas', county: 'Harris', ...props } })
    const out = parsePhoton({
      features: [
        f({ type: 'house', street: 'Cleburne State Park Drive', postcode: '77433' }),
        f({ type: 'street', name: 'Cleburne Street', city: 'Houston', postcode: '77004' }),
      ],
    })
    expect(out[0]).toEqual({ street: 'Cleburne Street', city: 'Houston', postcode: '77004' })
  })
})

describe('formatAddress', () => {
  it('adds the typed number back in front of the street', () => {
    const s = { street: 'Apple River Drive', city: 'Cypress', postcode: '77433' }
    expect(formatAddress(s, '16915')).toBe('16915 Apple River Drive, Cypress, TX 77433')
    expect(formatAddress(s)).toBe('Apple River Drive, Cypress, TX 77433')
  })
})

describe('fetchStreets', () => {
  it('sends only the street words to Photon, inside the Harris County box', async () => {
    let seen: URL | null = null
    const fake = (async (url: URL) => {
      seen = url
      return new Response(JSON.stringify(fixture('photon-apple-river.json')))
    }) as unknown as typeof fetch
    const r = await fetchStreets('Apple River', { fetchImpl: fake })
    expect(r).toHaveLength(1)
    expect(seen!.searchParams.get('q')).toBe('Apple River')
    expect(seen!.searchParams.get('bbox')).toBe('-95.97,29.50,-94.90,30.17')
  })
  it('returns [] for short input and never throws when Photon is down', async () => {
    expect(await fetchStreets('ap', { fetchImpl: (async () => Response.json({})) as unknown as typeof fetch })).toEqual([])
    const down = (async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    expect(await fetchStreets('Apple River', { fetchImpl: down })).toEqual([])
    const bad = (async () => new Response('nope', { status: 503 })) as unknown as typeof fetch
    expect(await fetchStreets('Apple River', { fetchImpl: bad })).toEqual([])
  })
})

describe('Census', () => {
  it('reads the county, city and school district from a real response', () => {
    expect(parseCensus(fixture('census-houston.json'))).toEqual({
      matchedAddress: '3100 CLEBURNE ST, HOUSTON, TX, 77004',
      countyFips: '48201',
      place: 'Houston city',
      schoolDistrict: 'Houston Independent School District',
      coordinates: { longitude: -95.36265853559, latitude: 29.724639066855 },
    })
    // Cypress is unincorporated: no city.
    expect(parseCensus(fixture('census-cypress.json'))).toMatchObject({ place: null, schoolDistrict: 'Cypress-Fairbanks Independent School District' })
  })
  it('returns null when nothing matched, and reports an outage as an error', async () => {
    expect(parseCensus({ result: { addressMatches: [] } })).toBeNull()
    const down = (async () => new Response('x', { status: 500 })) as unknown as typeof fetch
    await expect(geocodeCensus('1 Main St', { fetchImpl: down })).rejects.toBeInstanceOf(CensusUnavailableError)
  })
  it('does not turn missing, null, or out-of-range coordinates into a valid point', () => {
    const base = fixture('census-houston.json')
    const withCoordinates = (coordinates: unknown) => ({
      ...base,
      result: {
        ...base.result,
        addressMatches: [{ ...base.result.addressMatches[0], coordinates }],
      },
    })
    expect(parseCensus(withCoordinates({ x: null, y: null }))?.coordinates).toBeNull()
    expect(parseCensus(withCoordinates({ x: 181, y: 95 }))?.coordinates).toBeNull()
    expect(parseCensus(withCoordinates(undefined))?.coordinates).toBeNull()
  })
})

describe('stand-in bodies', () => {
  const ids = (name: string) => bodiesFromCensus(parseCensus(fixture(name))!).map((b) => b.id)
  it('a Houston address gets City Council, HISD and HCC', () => {
    expect(ids('census-houston.json')).toEqual(['houston_city_council', 'commissioners_court', 'flood_control', 'port_houston', 'hisd_board', 'hcc_board', 'hcad'])
  })
  it('an unincorporated Cy-Fair address has no City Council and gets CFISD and Lone Star', () => {
    expect(ids('census-cypress.json')).toEqual(['commissioners_court', 'flood_control', 'port_houston', 'cfisd_board', 'lone_star_board', 'hcad'])
  })
  it('only uses ids that are valid for a bodies_token', () => {
    for (const id of ids('census-houston.json').concat(ids('census-cypress.json'))) expect(id).toMatch(/^[a-z0-9][a-z0-9_-]{0,63}$/)
  })
})
