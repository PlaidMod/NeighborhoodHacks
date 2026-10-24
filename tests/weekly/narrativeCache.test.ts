import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WeeklyEdition } from '@/lib/weekly/build'

const state = vi.hoisted(() => ({
  result: null as Promise<string[] | null> | null,
  keys: [] as string[][],
  calls: 0,
}))

vi.mock('server-only', () => ({}))
// The real cache is shared by every server; here it records the key and calls straight through.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>, keyParts: string[]) => {
    state.keys.push(keyParts)
    return fn
  },
}))
vi.mock('@/lib/weekly/narrative', async (original) => ({
  ...(await original<typeof import('@/lib/weekly/narrative')>()),
  weeklyNarrative: () => {
    state.calls += 1
    return state.result
  },
}))

const { startWeeklyNarrative } = await import('@/lib/weekly/narrativeCache')

const edition = {
  lead: null,
  comingUp: [{ item_id: 'a', title: 'Council considers a contract', body_name: 'Houston City Council', meeting_date: '2026-10-27T19:00:00Z' }],
  decided: [],
} as unknown as WeeklyEdition

const later = <T,>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

beforeEach(() => {
  vi.useFakeTimers()
  state.keys = []
  state.calls = 0
})
afterEach(() => vi.useRealTimers())

describe('startWeeklyNarrative', () => {
  it('gives the page the summary when it is ready in time', async () => {
    state.result = Promise.resolve(['This week, the council meets.'])
    await expect(startWeeklyNarrative(edition, 'en', 8_000).shown).resolves.toEqual(['This week, the council meets.'])
  })

  it('stops making the page wait at the limit, but keeps writing the summary for the next visitor', async () => {
    state.result = later(10_000, ['This week, the council meets.'])
    const { shown, done } = startWeeklyNarrative(edition, 'en', 8_000)
    await vi.advanceTimersByTimeAsync(8_000)
    await expect(shown).resolves.toBeNull()
    await vi.advanceTimersByTimeAsync(2_000)
    await expect(done).resolves.toEqual(['This week, the council meets.'])
  })

  it('shares the summary between servers under one key per week and language', () => {
    state.result = Promise.resolve(['x'])
    startWeeklyNarrative(edition, 'en', 8_000)
    startWeeklyNarrative(edition, 'es', 8_000)
    expect(state.keys).toHaveLength(2)
    expect(state.keys[0]![0]).toBe('weekly-narrative')
    expect(state.keys[0]![1]).not.toBe(state.keys[1]![1])
  })

  it('makes one AI call when several visitors arrive while it is being written', async () => {
    state.result = later(5_000, ['x'])
    startWeeklyNarrative(edition, 'en', 8_000)
    startWeeklyNarrative(edition, 'en', 8_000)
    expect(state.calls).toBe(1)
    await vi.advanceTimersByTimeAsync(5_000)
  })

  it('does not keep a failed summary, so the next visitor tries again', async () => {
    state.result = Promise.resolve(null)
    await expect(startWeeklyNarrative(edition, 'en', 8_000).done).resolves.toBeNull()
  })

  it('has nothing to write for an empty week', async () => {
    const empty = { lead: null, comingUp: [], decided: [] } as unknown as WeeklyEdition
    const { shown, done } = startWeeklyNarrative(empty, 'en', 8_000)
    await expect(shown).resolves.toBeNull()
    await expect(done).resolves.toBeNull()
    expect(state.keys).toHaveLength(0)
  })
})
