import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import Home from '@/app/(prototype)/app/page'
import { StoryProvider } from '@/components/prototype/story-sheet'
import type { LiveData } from '@/lib/prototype/live'
import { ProfileProvider } from '@/lib/prototype/profile'
import type { Body, Update } from '@/lib/prototype/types'

const NOW = new Date('2026-10-23T17:00:00Z')
const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'en.json'), 'utf8'))

const body: Body = {
  id: 'hisd_board',
  name: 'Houston ISD Board of Managers',
  short: 'HISD board',
  kind: 'school',
  tagline: '',
  controls: [],
  selection: '',
  seats: '',
  meets: '',
  location: '',
  commentRules: '',
  website: '',
}

const upd = (id: string, date: string): Update => ({
  id,
  bodyId: 'hisd_board',
  type: 'agenda',
  tier: 'digest',
  topic: 'schools',
  date,
  posted: '2026-10-20T12:00:00Z',
  title: `Headline ${id}`,
  summary: '',
  why: { default: '' },
  audiences: [],
  source: `https://example.com/${id}`,
})

const live = (updates: Update[]): LiveData => ({
  mode: 'db',
  bodies: [body],
  personas: [],
  updates,
  weekly: { intro: '', leadId: null, comingUpIds: [], decidedIds: [], deadlines: [] },
})

const render = (data: LiveData) =>
  renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: 'en', messages, timeZone: 'America/Chicago' } as ComponentProps<typeof NextIntlClientProvider>,
      createElement(ProfileProvider, { live: data } as ComponentProps<typeof ProfileProvider>, createElement(StoryProvider, null, createElement(Home))),
    ),
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('dashboard home status line', () => {
  it('says "1 thing", not "1 things"', () => {
    const html = render(live([upd('a', '2026-10-27T19:00:00Z')]))
    expect(html).toContain('1 thing coming up this week.')
    expect(html).not.toContain('1 things')
  })

  it('keeps the plural for other counts', () => {
    expect(render(live([upd('a', '2026-10-27T19:00:00Z'), upd('b', '2026-10-28T19:00:00Z')]))).toContain('2 things coming up this week.')
    expect(render(live([]))).toContain('0 things coming up this week.')
  })
})
