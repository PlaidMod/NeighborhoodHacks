import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  narrativeStarts: 0,
  resolveCalls: 0,
  itemCalls: [] as unknown[][],
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (state.cookies.has(name) ? { name, value: state.cookies.get(name)! } : undefined) }),
}))
vi.mock('next-intl/server', () => ({ getLocale: async () => 'en' }))
vi.mock('@/lib/weekly/data', () => ({
  resolveBodies: async () => {
    state.resolveCalls += 1
    return { mode: 'db', bodies: [{ body_id: 'hisd_board', body_name: 'Houston ISD Board of Managers', body_type: 'school_board', sms_eligible: true }] }
  },
  loadItems: async (...args: unknown[]) => {
    state.itemCalls.push(args)
    return []
  },
}))
vi.mock('@/lib/weekly/narrativeCache', () => ({
  startWeeklyNarrative: () => {
    state.narrativeStarts += 1
    return { shown: new Promise(() => {}), done: new Promise(() => {}) }
  },
}))

const NOW = new Date('2026-10-24T15:00:00Z')
const MINUTE = 60_000

async function load(now = NOW) {
  // A fresh module each test, so the in-memory cache starts empty.
  const { loadLiveData } = await import('@/lib/prototype/liveData')
  return loadLiveData(now)
}

beforeEach(() => {
  vi.resetModules()
  state.cookies = new Map([['showup_bodies', 'signed-token']])
  state.narrativeStarts = 0
  state.resolveCalls = 0
  state.itemCalls = []
})

describe('loadLiveData', () => {
  it('builds the page without touching the AI summary (the page fetches it afterwards)', async () => {
    const live = await load()
    expect(live?.bodies).toHaveLength(1)
    expect(state.narrativeStarts).toBe(0)
  })

  it('asks the database for the story language being shown only', async () => {
    await load()
    expect(state.itemCalls[0]![2]).toMatchObject({ fromDays: 30, toDays: 60, storyLang: 'en' })
  })

  it("reuses a reader's governments and items for a few minutes instead of reloading them", async () => {
    const { loadLiveData } = await import('@/lib/prototype/liveData')
    await loadLiveData(NOW)
    await loadLiveData(new Date(NOW.getTime() + 4 * MINUTE))
    expect(state.resolveCalls).toBe(1)
    expect(state.itemCalls).toHaveLength(1)
    await loadLiveData(new Date(NOW.getTime() + 6 * MINUTE))
    expect(state.itemCalls).toHaveLength(2)
  })

  it('shows the demo when the reader has not looked up an address', async () => {
    state.cookies = new Map()
    expect(await load()).toBeNull()
  })
})
