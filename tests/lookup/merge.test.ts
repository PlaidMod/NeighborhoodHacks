import { describe, expect, it } from 'vitest'
import { mergeLookupBodies } from '@/lib/lookup/merge'
import { subdivisionFromLegalDescription } from '@/lib/lookup/hoa'

const catalog = [
  { id: 'hcmud_489', name: 'Harris County MUD 489', type: 'mud', category: 'tracked', elected_or_appointed: null, description_en: null, meeting_info_url: null, impact_rank: 1, operator_name: 'Water Company' },
  { id: 'houston_city_council', name: 'Houston City Council', type: 'city_council', category: 'tracked', elected_or_appointed: null, description_en: null, meeting_info_url: null, impact_rank: 2, operator_name: null },
  { id: 'regional_demo', name: 'Regional Body', type: 'water_authority', category: 'regional_coming_soon', elected_or_appointed: null, description_en: null, meeting_info_url: null, impact_rank: 3, operator_name: null },
]

describe('mergeLookupBodies', () => {
  it('uses HCAD for taxing bodies and GIS for boundaries; Census-only hints stay unverified', () => {
    const result = mergeLookupBodies({
      catalog,
      hcadIds: ['hcmud_489'],
      gisIds: ['houston_city_council'],
      censusIds: ['houston_city_council'],
    })
    expect(result.map(({ id, verified, source_kind }) => ({ id, verified, source_kind }))).toEqual([
      { id: 'hcmud_489', verified: true, source_kind: 'hcad' },
      { id: 'houston_city_council', verified: true, source_kind: 'gis' },
    ])
  })

  it('does not promote Census-only bodies or regional catalog rows into address results', () => {
    const result = mergeLookupBodies({ catalog, hcadIds: [], gisIds: [], censusIds: ['houston_city_council', 'regional_demo'] })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'houston_city_council', verified: false, source_kind: 'census' })
  })

  it('marks the countywide appraisal district verified from Harris County parcel evidence', () => {
    const result = mergeLookupBodies({
      catalog: [{ ...catalog[0], id: 'hcad', name: 'Harris Central Appraisal District', type: 'hcad' }],
      hcadIds: ['hcad'],
      gisIds: [],
      censusIds: [],
    })
    expect(result[0]).toMatchObject({ id: 'hcad', verified: true, source_kind: 'hcad' })
  })
})

describe('subdivisionFromLegalDescription', () => {
  it('strips lot, block and section tokens from HCAD legal descriptions', () => {
    expect(subdivisionFromLegalDescription('LT 12 BLK 3 COPPERFIELD SEC 5')).toBe('COPPERFIELD')
  })
  it('returns null for blank descriptions', () => {
    expect(subdivisionFromLegalDescription('  ')).toBeNull()
  })
})
