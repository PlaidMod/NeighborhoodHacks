import { describe, expect, it } from 'vitest'
import { buildTaxReceipt } from '@/lib/taxReceipt'

describe('buildTaxReceipt', () => {
  it('calculates dollar slices, sorts largest first and marks missing rates as partial', () => {
    const result = buildTaxReceipt(250_000,
      [
        { id: 'mud', name: 'MUD', tax_set_by_body_id: 'mud' },
        { id: 'school', name: 'School District', tax_set_by_body_id: 'school' },
      ],
      [
        { body_id: 'mud', year: 2026, adopted_rate: '0.35', last_vote_date: null, source_url: null },
        { body_id: 'school', year: 2026, adopted_rate: 1.0, last_vote_date: '2025-11-04', source_url: 'https://example.org/rate' },
      ],
      [],
    )
    expect(result.total).toBe(3375)
    expect(result.partial).toBe(false)
    expect(result.slices.map((slice) => slice.amount)).toEqual([2500, 875])
    expect(result.slices[1].last_vote_date).toBeNull()
  })

  it("keeps a partial total when a body's tax rate is not loaded", () => {
    const result = buildTaxReceipt(250_000,
      [{ id: 'county', name: 'County', tax_set_by_body_id: 'county' }],
      [],
      [],
    )
    expect(result).toMatchObject({ total: 0, partial: true, slices: [{ rate: null, amount: null }] })
  })

  it('ignores future elections and marks an empty receipt partial', () => {
    const result = buildTaxReceipt(250_000,
      [{ id: 'city', name: 'City', tax_set_by_body_id: 'city' }],
      [{ body_id: 'city', year: 2026, adopted_rate: 0.5, last_vote_date: null, source_url: null }],
      [
        { body_id: 'city', date: '2025-11-04', type: 'general', votes_cast: 100, registered_voters: 200, source_url: null },
        { body_id: 'city', date: '2026-11-03', type: 'general', votes_cast: null, registered_voters: null, source_url: null },
      ],
      '2026-10-20',
    )
    expect(result.slices[0].latest_election?.date).toBe('2025-11-04')
    expect(buildTaxReceipt(250_000, [], [], [], '2026-10-20').partial).toBe(true)
  })

  it('treats invalid and negative rates as missing instead of producing negative or invalid tax', () => {
    const result = buildTaxReceipt(250_000,
      [{ id: 'city', name: 'City', tax_set_by_body_id: 'city' }],
      [{ body_id: 'city', year: 2026, adopted_rate: '-1', last_vote_date: null, source_url: null }],
      [],
    )
    expect(result).toMatchObject({ total: 0, partial: true, slices: [{ rate: null, amount: null }] })
  })

  it('does not create tax slices for non-tax-setting bodies such as HCAD', () => {
    const result = buildTaxReceipt(250_000,
      [{ id: 'hcad', name: 'Appraisal District', tax_set_by_body_id: null }],
      [],
      [],
    )
    expect(result).toMatchObject({ total: 0, partial: true, slices: [] })
  })
})
