import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]>, filters: [] as Array<{ table: string; method: string; column: string; value: unknown }> }))

vi.mock('@/lib/db', () => ({
  db: () => ({
    from: (table: string) => ({
      select: () => {
        const query = {
          in: (column: string, value: unknown) => { state.filters.push({ table, method: 'in', column, value }); return query },
          lte: (column: string, value: unknown) => { state.filters.push({ table, method: 'lte', column, value }); return query },
          order: () => query,
          limit: () => query,
          then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: state.rows[table] ?? [], error: null })),
        }
        return query
      },
    }),
  }),
}))

import { GET as getBodies } from '@/app/api/bodies/route'
import { GET as getReceipt } from '@/app/api/tax-receipt/route'
import { signBodiesToken } from '@/lib/tokens'
import { houstonDate } from '@/lib/date'

const secret = 'test-token-secret-long-enough-123456'
const request = (path: string) => new Request(`http://localhost${path}`)

describe('signed body and tax endpoints', () => {
  beforeEach(() => {
    state.rows = {}
    state.filters = []
    vi.stubEnv('BODIES_TOKEN_SECRET', secret)
    vi.stubEnv('VERCEL_ENV', 'development')
  })

  it('rejects body detail requests outside the signed ID set', async () => {
    const token = signBodiesToken(['hisd_board'], secret)
    const response = await getBodies(request(`/api/bodies?t=${token}&id=cfisd_board`))
    expect(response.status).toBe(404)
  })

  it('returns 404 for stale tokens whose bodies no longer exist', async () => {
    const token = signBodiesToken(['hisd_board'], secret)
    const bodyResponse = await getBodies(request(`/api/bodies?t=${token}`))
    const receiptResponse = await getReceipt(request(`/api/tax-receipt?t=${token}`))
    expect(bodyResponse.status).toBe(404)
    expect(receiptResponse.status).toBe(404)
  })

  it('does not turn a non-taxing appraisal district into a zero-dollar receipt', async () => {
    state.rows.bodies = [{ id: 'hcad', name: 'Appraisal District', tax_set_by_body_id: null }]
    const token = signBodiesToken(['hcad'], secret)
    const response = await getReceipt(request(`/api/tax-receipt?t=${token}`))
    expect(response.status).toBe(404)
  })

  it('only requests election rows dated today or earlier', async () => {
    state.rows.bodies = [{ id: 'hisd_board', name: 'School District', type: 'school_board' }]
    const token = signBodiesToken(['hisd_board'], secret)
    await getReceipt(request(`/api/tax-receipt?t=${token}`))
    expect(state.filters).toContainEqual({ table: 'elections', method: 'lte', column: 'date', value: houstonDate() })
  })
})
