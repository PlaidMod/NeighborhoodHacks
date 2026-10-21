import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  bodies: [] as Array<{ id: string; type: string | null }>,
  saved: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/db', () => ({
  db: () => ({
    from: (table: string) => ({
      select: () => ({ in: async () => ({ data: table === 'bodies' ? state.bodies : [], error: null }) }),
      insert: async (row: Record<string, unknown>) => {
        state.saved.push(row)
        return { error: null }
      },
    }),
  }),
}))

import { POST } from '@/app/api/quiz/route'
import { signBodiesToken } from '@/lib/tokens'

const secret = 'test-token-secret-long-enough-123456'
const post = (data: unknown) => POST(new Request('http://localhost/api/quiz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
}))

describe('POST /api/quiz', () => {
  beforeEach(() => {
    state.bodies = [{ id: 'hisd_board', type: 'school_board' }, { id: 'hoa', type: 'hoa' }]
    state.saved = []
    vi.unstubAllEnvs()
    vi.stubEnv('BODIES_TOKEN_SECRET', secret)
    vi.stubEnv('DEMO_MODE', 'false')
    vi.stubEnv('VERCEL_ENV', 'development')
  })

  it('stores only answer types and derives the actual set from the signed body IDs', async () => {
    const token = signBodiesToken(['hisd_board', 'hoa'], secret)
    const response = await post({ bodies_token: token, selected_types: ['hoa', 'school_board'] })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ actual_types: ['school_board'], incorrect_types: ['hoa'], hoa_note: true })
    expect(state.saved).toEqual([{ selected_types: ['hoa', 'school_board'], actual_types: ['school_board'] }])
  })

  it('also counts the types of governments the lookup listed but does not track, ignoring invalid values', async () => {
    const token = signBodiesToken(['hisd_board'], secret)
    const response = await post({ bodies_token: token, selected_types: ['school_board'], uncovered_types: ['esd', 'mud', 'esd', 'not_a_type', 7] })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ actual_types: ['school_board', 'esd', 'mud'], missed_types: ['esd', 'mud'] })
    expect(state.saved).toEqual([{ selected_types: ['school_board'], actual_types: ['school_board', 'esd', 'mud'] }])
  })

  it('skips writes in demo mode and accepts an explicit unsure answer', async () => {
    vi.stubEnv('DEMO_MODE', 'true')
    const token = signBodiesToken(['hisd_board'], secret)
    const response = await post({ bodies_token: token, selected_types: [], unsure: true })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ score_percent: null, unsure: true, demo: true })
    expect(state.saved).toEqual([])
  })

  it('rejects empty answers and contains missing-token-secret failures', async () => {
    expect((await post({ bodies_token: 'bad', selected_types: [] })).status).toBe(400)
    vi.stubEnv('BODIES_TOKEN_SECRET', '')
    const token = Buffer.from(JSON.stringify({ v: 1, b: ['hisd_board'] })).toString('base64url') + '.invalid'
    expect((await post({ bodies_token: token, selected_types: ['school_board'] })).status).toBe(500)
  })
})
