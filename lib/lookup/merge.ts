import { QUIZ_BODY_TYPES, type BodyType } from '@/lib/contracts/bodyTypes'
import type { LookupBody } from '@/lib/contracts/lookup'

export type BodyCatalogRow = {
  id: string
  name: string
  type: string | null
  category: string
  elected_or_appointed: string | null
  description_en: string | null
  meeting_info_url: string | null
  impact_rank: number | null
  operator_name: string | null
}

export type TaxRateRow = {
  body_id: string
  year: number
  adopted_rate: number | string | null
  last_vote_date: string | null
  source_url: string | null
}

// These body types are assigned from the HCAD parcel's jurisdiction codes. Other
// body types need a GIS boundary hit; no default inference is treated as verified.
const HCAD_AUTHORITY_TYPES = new Set([
  'commissioners_court', 'school_board', 'college_board', 'mud', 'esd',
  'water_authority', 'flood_control', 'port', 'hcad',
])
const GIS_AUTHORITY_TYPES = new Set(['city_council', 'metro'])
const DUAL_AUTHORITY_TYPES = new Set(['city_council'])

function bodyType(value: string | null): BodyType | null {
  if (value === 'other' || (QUIZ_BODY_TYPES as readonly string[]).includes(value ?? '')) return value as BodyType
  return null
}

/** Combines address evidence without promoting Census hints to verified jurisdictions. */
export function mergeLookupBodies(args: {
  catalog: readonly BodyCatalogRow[]
  hcadIds: readonly string[]
  gisIds: readonly string[]
  censusIds: readonly string[]
  rates?: readonly TaxRateRow[]
}): LookupBody[] {
  const hcad = new Set(args.hcadIds)
  const gis = new Set(args.gisIds)
  const census = new Set(args.censusIds)
  const rates = new Map<string, TaxRateRow>()
  for (const rate of args.rates ?? []) {
    const previous = rates.get(rate.body_id)
    if (!previous || rate.year > previous.year) rates.set(rate.body_id, rate)
  }

  return args.catalog
    .filter((body) => body.category === 'tracked' && (hcad.has(body.id) || gis.has(body.id) || census.has(body.id)))
    .map((body) => {
      const hasHcad = hcad.has(body.id)
      const hasGis = gis.has(body.id)
      const isDualAuthority = body.type !== null && DUAL_AUTHORITY_TYPES.has(body.type)
      const expected: LookupBody['source_kind'] = isDualAuthority
        ? hasHcad ? 'hcad' : hasGis ? 'gis' : null
        : body.type && HCAD_AUTHORITY_TYPES.has(body.type)
          ? 'hcad'
          : body.type && GIS_AUTHORITY_TYPES.has(body.type)
            ? 'gis'
            : body.type === 'other' ? 'hcad' : null
      const verified = isDualAuthority ? hasHcad || hasGis : expected === 'hcad' ? hasHcad : expected === 'gis' ? hasGis : false
      const source_kind: LookupBody['source_kind'] = verified
        ? expected
        : hasHcad
          ? 'hcad'
          : hasGis
            ? 'gis'
            : census.has(body.id)
              ? 'census'
              : null
      const rate = rates.get(body.id)
      const taxRate = rate?.adopted_rate == null ? null : Number(rate.adopted_rate)
      return {
        id: body.id,
        name: body.name,
        type: bodyType(body.type),
        category: 'tracked' as const,
        elected_or_appointed: body.elected_or_appointed,
        description: body.description_en,
        meeting_info_url: body.meeting_info_url,
        verified,
        source_kind,
        tax_source_url: rate?.source_url ?? null,
        tax_rate: taxRate !== null && Number.isFinite(taxRate) ? taxRate : null,
        tax_year: rate?.year ?? null,
        last_vote_date: rate?.last_vote_date ?? null,
      }
    })
    .sort((a, b) => {
      const rankA = args.catalog.find((body) => body.id === a.id)?.impact_rank ?? Number.MAX_SAFE_INTEGER
      const rankB = args.catalog.find((body) => body.id === b.id)?.impact_rank ?? Number.MAX_SAFE_INTEGER
      return rankA - rankB || a.name.localeCompare(b.name)
    })
}
