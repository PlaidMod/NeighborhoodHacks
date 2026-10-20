import { describe, expect, it } from 'vitest'
import { toBody, toLiveData, toUpdate } from '@/lib/prototype/live'
import type { WeeklyItem } from '@/lib/weekly/build'
import { SAMPLE_BODIES, sampleItems } from '@/lib/weekly/sample'

const now = new Date('2026-10-19T17:00:00Z')
const bodies = SAMPLE_BODIES.map((b) => ({ body_id: b.id, body_name: b.short, body_type: b.type, sms_eligible: b.sms_eligible }))

describe('toBody', () => {
  it('reuses the demo description of a real body but drops the demo-only numbers', () => {
    const b = toBody({ body_id: 'hisd_board', body_name: 'HISD Board of Managers', body_type: 'school_board', sms_eligible: true })
    expect(b).toMatchObject({ id: 'hisd_board', name: 'HISD Board of Managers', kind: 'school' })
    expect(b.controls.length).toBeGreaterThan(0)
    expect(b.taxRate).toBeUndefined()
    expect(b.lastTurnout).toBeUndefined()
    expect(b.yourSeat).toBeUndefined()
  })
  it('gives an unknown body empty descriptions instead of made-up ones', () => {
    const b = toBody({ body_id: 'katy_city_council', body_name: 'Katy City Council', body_type: 'city_council', sms_eligible: false })
    expect(b).toMatchObject({ kind: 'city', tagline: '', controls: [], website: '' })
  })
})

describe('toUpdate', () => {
  const base: WeeklyItem = {
    item_id: 'i1',
    body_id: 'hisd_board',
    body_name: 'HISD board',
    body_type: 'school_board',
    title: 'Consider a bond election',
    item_type: 'bond',
    tier: 'sms',
    status: 'upcoming',
    meeting_date: '2026-10-22T23:00:00Z',
    source_url: 'https://example.org/agenda',
  }
  it('maps tiers and keeps the source link', () => {
    expect(toUpdate(base)).toMatchObject({ tier: 'urgent', type: 'agenda', topic: 'taxes', source: 'https://example.org/agenda', itemPath: '/items/i1' })
    expect(toUpdate({ ...base, tier: 'weekly' }).tier).toBe('digest')
    expect(toUpdate({ ...base, tier: 'timeline' }).tier).toBe('timeline')
  })
  it('shows decisions with their result', () => {
    const u = toUpdate({ ...base, status: 'decided', outcome: { vote_result: 'passed' } })
    expect(u).toMatchObject({ type: 'decision', vote: 'Passed' })
  })
  it('flags AI-written stories so the sheet shows the AI label', () => {
    const story = { headline: 'Board weighs a bond', dek: 'The vote is Thursday.', body_paragraphs: ['a'.repeat(20), 'b'.repeat(20)], renter_line: 'Bonds are paid by property taxes.' }
    const u = toUpdate({ ...base, story_en: story, story_source: 'ai' })
    expect(u).toMatchObject({ title: 'Board weighs a bond', summary: 'The vote is Thursday.', aiWritten: true })
    expect(toUpdate({ ...base, story_en: story, story_source: 'template' }).aiWritten).toBe(false)
  })
  it('only offers speaking when a registration deadline is known', () => {
    expect(toUpdate(base).comment).toBeUndefined()
    expect(toUpdate({ ...base, registration_closes_at: '2026-10-22T21:00:00Z' }).comment?.deadline).toBe('2026-10-22T21:00:00Z')
  })
})

describe('toLiveData', () => {
  it("turns P3's sample items into the screens' updates, dropping cancelled meetings and unknown bodies", () => {
    const items = sampleItems(now)
    const live = toLiveData('sample', bodies, [...items, { ...items[0]!, item_id: 'x', body_id: 'not_mine' }], ['renter'])
    expect(live.mode).toBe('sample')
    expect(live.personas).toEqual(['renter'])
    expect(live.bodies.map((b) => b.id)).toEqual(bodies.map((b) => b.body_id))
    const ids = new Set(live.bodies.map((b) => b.id))
    expect(live.updates.every((u) => ids.has(u.bodyId))).toBe(true)
    expect(live.updates.length).toBe(items.filter((i) => i.meeting_status !== 'cancelled').length)
  })
})
