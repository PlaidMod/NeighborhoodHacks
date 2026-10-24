import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  tokens: [] as string[],
  langs: [] as string[],
  points: ['This week, the council meets.'] as string[] | null,
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (state.cookies.has(name) ? { name, value: state.cookies.get(name)! } : undefined) }),
}))
vi.mock('@/lib/weekly/readerItems', () => ({
  readerItems: async (token: string, lang: string) => {
    state.tokens.push(token)
    state.langs.push(lang)
    return token === 'bad'
      ? { resolved: { mode: 'db', bodies: null, reason: 'bad_token' }, items: [] }
      : { resolved: { mode: 'db', bodies: [{ body_id: 'hisd_board', body_name: 'HISD', body_type: 'school_board', sms_eligible: true }] }, items: [] }
  },
}))
vi.mock('@/lib/weekly/narrativeCache', () => ({
  startWeeklyNarrative: () => ({ shown: Promise.resolve(null), done: Promise.resolve(state.points) }),
}))

import { GET } from '@/app/api/weekly/summary/route'

const get = (query: string) => GET(new Request(`https://showup.test/api/weekly/summary${query}`))

beforeEach(() => {
  state.cookies = new Map()
  state.tokens = []
  state.langs = []
  state.points = ['This week, the council meets.']
})

describe('GET /api/weekly/summary', () => {
  it("answers with the reader's AI summary, waiting for it to be written", async () => {
    const res = await get('?t=signed&lang=es')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ points: ['This week, the council meets.'] })
    expect(state.langs).toEqual(['es'])
  })

  it('uses the remembered lookup when the page gives no token (the dashboard)', async () => {
    state.cookies.set('showup_bodies', 'from-cookie')
    await get('?lang=en')
    expect(state.tokens).toEqual(['from-cookie'])
  })

  it('is never cached for other readers', async () => {
    expect((await get('?t=signed')).headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('answers null when no summary could be written, so the page keeps its own lines', async () => {
    state.points = null
    expect(await (await get('?t=signed')).json()).toEqual({ points: null })
  })

  it('refuses a missing or forged token', async () => {
    expect((await get('')).status).toBe(400)
    expect((await get('?t=bad')).status).toBe(403)
  })
})
