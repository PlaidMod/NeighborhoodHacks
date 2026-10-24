import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveData } from '@/lib/prototype/live'
import type { Update } from '@/lib/prototype/types'
import { TLDR_COMING, TLDR_DECIDED, buildTldr, readMinutes, tldrFootnote } from '@/lib/prototype/tldr'

// Friday Oct 23, 2026, noon in Houston.
const NOW = new Date('2026-10-23T17:00:00Z')

function upd(id: string, over: Partial<Update> = {}): Update {
  return {
    id,
    bodyId: 'hisd_board',
    type: 'agenda',
    tier: 'digest',
    topic: 'schools',
    date: '2026-10-27T19:00:00Z',
    posted: '2026-10-20T12:00:00Z',
    title: `Title ${id}`,
    summary: '',
    why: { default: '' },
    audiences: [],
    source: `https://example.com/${id}`,
    ...over,
  }
}

const weekly = (over: Partial<LiveData['weekly']> = {}): LiveData['weekly'] => ({
  intro: '',
  leadId: null,
  comingUpIds: [],
  decidedIds: [],
  deadlines: [],
  ...over,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('buildTldr with real data (the brief order from buildWeekly, plan §10)', () => {
  it('keeps the brief order, lead first, and caps the lists while counting everything', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const decided = ['x1', 'x2', 'x3', 'x4']
    const updates = [...ids.map((id) => upd(id)), ...decided.map((id) => upd(id, { type: 'decision', date: '2026-10-21T19:00:00Z' }))]
    const tldr = buildTldr({
      updates,
      weekly: weekly({ leadId: 'g', comingUpIds: ['a', 'b', 'c', 'd', 'e', 'f'], decidedIds: decided }),
      personas: [],
      now: +NOW,
    })
    expect(tldr.coming.map((u) => u.id)).toEqual(['g', 'a', 'b', 'c', 'd'])
    expect(tldr.coming).toHaveLength(TLDR_COMING)
    expect(tldr.decided.map((u) => u.id)).toEqual(['x1', 'x2', 'x3'])
    expect(tldr.decided).toHaveLength(TLDR_DECIDED)
    expect(tldr.counts).toEqual({ coming: 7, open: 0, decided: 4 })
  })

  it("skips IDs that aren't in the reader's updates and never lists the lead twice", () => {
    const tldr = buildTldr({
      updates: [upd('a'), upd('b')],
      weekly: weekly({ leadId: 'a', comingUpIds: ['a', 'missing', 'b'] }),
      personas: [],
      now: +NOW,
    })
    expect(tldr.coming.map((u) => u.id)).toEqual(['a', 'b'])
  })
})

describe('the next step', () => {
  it('is the coming-up item whose sign-up to speak closes soonest, ignoring closed ones', () => {
    const updates = [
      upd('closed', { comment: { deadline: '2026-10-22T13:00:00Z', howTo: '', minutes: 3 } }),
      upd('later', { comment: { deadline: '2026-10-29T13:00:00Z', howTo: '', minutes: 3 } }),
      upd('soonest', { comment: { deadline: '2026-10-26T13:00:00Z', howTo: '', minutes: null } }),
      upd('no-comment'),
    ]
    const tldr = buildTldr({ updates, weekly: weekly({ comingUpIds: updates.map((u) => u.id) }), personas: [], now: +NOW })
    expect(tldr.next?.id).toBe('soonest')
    expect(tldr.counts.open).toBe(2)
  })

  it('is null when nothing is open for comment', () => {
    const tldr = buildTldr({ updates: [upd('a')], weekly: weekly({ comingUpIds: ['a'] }), personas: [], now: +NOW })
    expect(tldr.next).toBeNull()
  })
})

describe('buildTldr with the demo (no weekly order)', () => {
  it('lists upcoming items only, urgent first, and recent decisions newest first', () => {
    const updates = [
      upd('digest-soon', { date: '2026-10-26T19:00:00Z' }),
      upd('urgent-later', { tier: 'urgent', date: '2026-11-02T19:00:00Z' }),
      upd('timeline-only', { tier: 'timeline', date: '2026-10-26T19:00:00Z' }),
      upd('too-far', { date: '2026-11-20T19:00:00Z' }),
      upd('past-agenda', { date: '2026-10-20T19:00:00Z' }),
      upd('decided-old', { type: 'decision', date: '2026-10-19T19:00:00Z' }),
      upd('decided-new', { type: 'decision', date: '2026-10-22T19:00:00Z' }),
      upd('decided-ancient', { type: 'decision', date: '2026-09-01T19:00:00Z' }),
    ]
    const tldr = buildTldr({ updates, weekly: null, personas: ['student'], now: +NOW })
    expect(tldr.coming.map((u) => u.id)).toEqual(['urgent-later', 'digest-soon'])
    expect(tldr.decided.map((u) => u.id)).toEqual(['decided-new', 'decided-old'])
  })

  it('has nothing to show when there are no updates', () => {
    const tldr = buildTldr({ updates: [], weekly: null, personas: [], now: +NOW })
    expect(tldr).toEqual({ coming: [], decided: [], next: null, counts: { coming: 0, open: 0, decided: 0 } })
  })
})

describe('readMinutes', () => {
  it('rounds the words shown to whole minutes at 200 words a minute, never below 1', () => {
    expect(readMinutes([])).toBe(1)
    expect(readMinutes(['one two three'])).toBe(1)
    expect(readMinutes([Array(500).fill('word').join(' ')])).toBe(3)
  })
})

describe('tldrFootnote', () => {
  it('uses the AI label when any summary shown was written with AI', () => {
    expect(tldrFootnote([upd('a'), upd('b', { aiWritten: true })], 'db')).toBe('ai')
  })
  it('otherwise says where the items come from', () => {
    expect(tldrFootnote([upd('a')], 'db')).toBe('real')
    expect(tldrFootnote([upd('a')], 'sample')).toBe('sample')
    expect(tldrFootnote([upd('a')], 'demo')).toBe('sample')
  })
})
