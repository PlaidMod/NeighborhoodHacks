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

const upd = (id: string, date: string, over: Partial<Update> = {}): Update => ({
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
  ...over,
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

const decided = upd('d', '2026-10-20T19:00:00Z', {
  type: 'decision',
  title: 'HISD board approves new bus contracts',
  aiWritten: true,
})
const coming = upd('a', '2026-10-27T19:00:00Z', {
  title: 'HISD board considers later school start times',
  comment: { deadline: '2026-10-26T22:00:00Z', howTo: '', minutes: null },
})
const week = (updates: Update[], over: Partial<LiveData['weekly']> = {}): LiveData => ({
  ...live(updates),
  weekly: { intro: '', leadId: null, comingUpIds: [], decidedIds: [], deadlines: [], ...over },
})

describe('the week in short, on the dashboard itself', () => {
  it('says what was decided and what is coming up as plain sentences, with no click needed', () => {
    const html = render(week([decided, coming], { decidedIds: ['d'], comingUpIds: ['a'] }))
    expect(html).toContain('This week, in short')
    expect(html).toContain('Just decided:')
    expect(html).toContain('HISD board approves new bus contracts.')
    expect(html).toContain('Coming up:')
    expect(html).toContain('HISD board considers later school start times')
    expect(html).toContain('(Tuesday)')
  })

  it('names when sign-up to speak closes for an item it mentions', () => {
    const html = render(week([decided, coming], { decidedIds: ['d'], comingUpIds: ['a'] }))
    expect(html).toContain('Sign-up to speak closes Mon, Oct 26 · 5:00 PM.')
  })

  it('carries the AI label when a headline was written with AI', () => {
    expect(render(week([decided], { decidedIds: ['d'] }))).toContain('Written with AI from the official agenda')
  })

  it('no longer sends readers to a separate page for it', () => {
    expect(render(week([decided, coming], { decidedIds: ['d'], comingUpIds: ['a'] }))).not.toContain('href="/app/tldr"')
  })

  it('says so plainly when nothing is new', () => {
    expect(render(week([]))).toContain('Nothing new from your local governments this week.')
  })
})
