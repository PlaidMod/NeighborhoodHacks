import { describe, expect, it, vi } from 'vitest'
import type { WeeklyEdition } from '@/lib/weekly/build'

const state = vi.hoisted(() => ({ timeoutMs: 0 }))

vi.mock('@/lib/openrouter', () => ({
  openRouterKey: () => 'test-key',
  openRouterJson: async (req: { timeoutMs: number }) => {
    state.timeoutMs = req.timeoutMs
    return JSON.stringify({ points: ['Esta semana, el concejo se reúne.'] })
  },
}))

const { weeklyNarrative } = await import('@/lib/weekly/narrative')

const edition = {
  lead: null,
  comingUp: [{ item_id: 'a', title: 'Council considers a contract', body_name: 'Houston City Council', meeting_date: '2026-10-27T19:00:00Z' }],
  decided: [],
} as unknown as WeeklyEdition

describe('weeklyNarrative', () => {
  // No page waits for the summary any more (it's fetched after the page shows), so the model gets
  // time to finish: Spanish summaries took longer than the old 15 s limit and were dropped.
  it('gives the model more than 15 seconds to write the summary', async () => {
    await expect(weeklyNarrative(edition, 'es')).resolves.toEqual(['Esta semana, el concejo se reúne.'])
    expect(state.timeoutMs).toBeGreaterThanOrEqual(30_000)
    expect(state.timeoutMs).toBeLessThan(60_000)
  })
})
