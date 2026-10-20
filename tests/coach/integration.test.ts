import { beforeEach, expect, it, vi } from 'vitest'
import { getRecipe } from '@/lib/registration/recipes'
import { getWindow } from '@/lib/registration/deadlines'
import { toUpdate } from '@/lib/prototype/live'
import { createCoachHandler } from '@/lib/coach/http'
import { generateJson } from '@/lib/gemini'
import { incrementingCoachStore, sharedCoachProvider } from '@/lib/coach/shared'
import { alertWindow } from '@/lib/registration/alerts'
import { deadlineText } from '@/lib/sms/message'

vi.mock('@/lib/gemini', () => ({ generateJson: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

it('does not offer Tuesday Council registration channels for a Wednesday voting session', () => {
  expect(getRecipe('houston_city_council', 'regular', '2026-10-21T14:00:00Z')).toBeNull()
  expect(getRecipe('houston_city_council', 'regular', '2026-10-20T19:00:00Z')).not.toBeNull()
  expect(getRecipe('houston_city_council', 'regular', 'invalid')).toBeNull()
})

it('supplies only verified bounds to the reminders job and avoids promises of unverified late alternatives', () => {
  const meeting = { date: '2026-10-29T14:00:00Z', type: 'regular', status: 'scheduled' }
  const now = new Date('2026-10-20T12:00:00Z')
  expect(alertWindow('commissioners_court', meeting, now)).toEqual({ opens_at: null, closes_at: '2026-10-29T13:00:00.000Z' })
  expect(alertWindow('hcmud_489', meeting, now)).toBeNull()
  expect(alertWindow('hisd_board', { ...meeting, type: 'special' }, now)).toBeNull()
  expect(alertWindow('commissioners_court', { ...meeting, status: 'cancelled' }, now)).toBeNull()
  const deadline = { meeting_at: meeting.date, registration_closes_at: '2026-10-29T13:00:00Z', first_seen_at: '2026-10-29T13:01:00Z' }
  expect(deadlineText(deadline, 'en').text).not.toContain('you can still send')
  expect(deadlineText(deadline, 'es').text).not.toContain('aún puedes enviar')
})

it('root body IDs resolve to the six original recipes, without applying regular rules to special or unknown sessions', () => {
  for (const id of ['hisd_board', 'cfisd_board', 'houston_city_council', 'commissioners_court', 'lone_star_board', 'hcmud_489']) {
    expect(getRecipe(id, 'regular')).not.toBeNull()
    expect(getRecipe(id, 'special')).toBeNull()
    expect(getRecipe(id, null)).toBeNull()
  }
  expect(getWindow(getRecipe('commissioners_court')!, '2026-10-29T14:00:00Z', new Date('2026-10-20T12:00:00Z')).closesAt).toBe('2026-10-29T13:00:00.000Z')
})

it('real item mapping retains meeting type and agenda number for registration', () => {
  const mapped = toUpdate({ item_id: '123', body_id: 'hisd_board', body_name: 'HISD', body_type: 'school_board', title: 'Agenda', item_type: 'other', tier: 'timeline', status: 'upcoming', meeting_date: '2026-10-22T22:00:00Z', source_url: 'https://example.org', meeting_type: 'special', agenda_number: '2' })
  expect(mapped).toMatchObject({ meetingType: 'special', agendaNumber: '2' })
  expect(getRecipe(mapped.bodyId, mapped.meetingType)).toBeNull()
  expect(toUpdate({ item_id: '123', body_id: 'hisd_board', body_name: 'HISD', body_type: 'school_board', title: 'Agenda', item_type: 'other', tier: 'timeline', status: 'upcoming', meeting_date: '2026-10-22T22:00:00Z', source_url: 'https://example.org', meeting_type: 'regular', registration_closes_at: '2026-10-21T17:00:00Z' }).comment?.minutes).toBeNull()
})

it('coaching uses shared SDK configuration, keeps explanation requests draft-free and bounds provider time', async () => {
  vi.mocked(generateJson).mockResolvedValue({})
  const item = { id: 'item', title: 'Agenda', summary: 'Agenda text', why: '', audiences: [], source: 'https://example.org', bodyName: 'Council', minutes: 2, isSample: false }
  await sharedCoachProvider({ mode: 'explain', item_id: 'item', lang: 'es', draft: 'private draft' }, item, new AbortController().signal)
  const options = vi.mocked(generateJson).mock.calls[0]![0]
  expect(options.timeoutMs).toBe(15000)
  expect(options.model).toBeUndefined()
  expect(options.contents).not.toContain('private draft')
  expect(options.system).toContain('never ghostwrite')
})

it('distributed increments enforce both quotas and database failures fail closed', async () => {
  const counts = new Map<string, number>()
  const store = incrementingCoachStore(async key => { const count = (counts.get(key) ?? 0) + 1; counts.set(key, count); return count })
  for (let i = 0; i < 20; i++) expect((await store.consume(['browser:b', 'ip:i'], 1000)).allowed).toBe(true)
  expect((await store.consume(['browser:new', 'ip:i'], 1000)).allowed).toBe(false)
  const failed = incrementingCoachStore(async () => { throw new Error('offline') })
  const handler = createCoachHandler({ resolveItem: () => null, store: failed })
  const req = () => new Request('https://example.org/api/coach', { method: 'POST', headers: { Origin: 'https://example.org', 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'explain', item_id: 'sample-one', lang: 'en' }) })
  expect((await handler(req())).status).toBe(503)
})

it('awaits the live item resolver and keeps lookup errors private', async () => {
  const request = () => new Request('https://example.org/api/coach', { method: 'POST', headers: { Origin: 'https://example.org', 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'explain', item_id: 'sample-one', lang: 'en' }) })
  const handler = createCoachHandler({ resolveItem: async () => ({ id: 'sample-one', title: 'Official agenda', summary: 'Official agenda text', why: '', audiences: [], source: 'https://example.org', bodyName: 'Council', minutes: 2, isSample: false }) })
  expect((await (await handler(request())).json()).plain_summary).not.toContain('prototype sample')
  const failed = createCoachHandler({ resolveItem: async () => { throw new Error('sensitive database failure') } })
  const response = await failed(request())
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('sensitive')
})
