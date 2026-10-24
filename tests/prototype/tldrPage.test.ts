import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import TldrPage from '@/app/(prototype)/app/tldr/page'
import { StoryProvider } from '@/components/prototype/story-sheet'
import type { LiveData } from '@/lib/prototype/live'
import { ProfileProvider } from '@/lib/prototype/profile'
import type { Body, Update } from '@/lib/prototype/types'
import { AI_LABEL } from '@/lib/stories/types'

type Tree = { [key: string]: string | Tree }
const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8')
const messages = (locale: 'en' | 'es') => JSON.parse(read('messages', `${locale}.json`)) as Tree
const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === 'string' ? [[prefix + key, value]] : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  )

const NOW = new Date('2026-10-23T17:00:00Z')

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

function upd(id: string, over: Partial<Update> = {}): Update {
  return {
    id,
    bodyId: 'hisd_board',
    type: 'agenda',
    tier: 'digest',
    topic: 'schools',
    date: '2026-10-27T19:00:00Z',
    posted: '2026-10-20T12:00:00Z',
    title: `Headline ${id}`,
    summary: `Summary ${id}`,
    why: { default: `Why ${id} matters` },
    audiences: [],
    source: `https://example.com/${id}`,
    ...over,
  }
}

const full: LiveData = {
  mode: 'db',
  bodies: [body],
  personas: [],
  updates: [
    upd('lead', { tier: 'urgent', aiWritten: true, comment: { deadline: '2026-10-26T13:00:00Z', howTo: '', minutes: 3 } }),
    upd('second'),
    upd('done', { type: 'decision', date: '2026-10-22T19:00:00Z', vote: 'Passed' }),
  ],
  weekly: { intro: '', leadId: 'lead', comingUpIds: ['second'], decidedIds: ['done'], deadlines: [] },
}

const empty: LiveData = { ...full, updates: [], weekly: { ...full.weekly, leadId: null, comingUpIds: [], decidedIds: [] } }

const render = (locale: 'en' | 'es', live: LiveData) =>
  renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale, messages: messages(locale), timeZone: 'America/Chicago' } as ComponentProps<typeof NextIntlClientProvider>,
      createElement(ProfileProvider, { live } as ComponentProps<typeof ProfileProvider>, createElement(StoryProvider, null, createElement(TldrPage))),
    ),
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('/app/tldr, the weekly brief in short', () => {
  it('sums up the week in one line and lists each item with what it means and its source', () => {
    const html = render('en', full)
    expect(html).toMatch(/<h1[^>]*>Your week, in short<\/h1>/)
    expect(html).toContain('2 things coming up, 1 open for public comment, and 1 new decision.')
    expect(html).toMatch(/<h3[^>]*><button[^>]*>Headline lead<\/button><\/h3>/)
    // No role picked: the story's summary, not the general note (see tldrLine).
    expect(html).toContain('Summary lead')
    expect(html).not.toContain('Why lead matters')
    expect(html).toContain('href="https://example.com/lead"')
    expect(html).toContain('Headline done')
    expect(html).toContain('Passed')
  })

  it('points to the one next step: the soonest sign-up to speak', () => {
    const html = render('en', full)
    expect(html).toContain('Sign-up to speak on “Headline lead” closes')
    expect(html).toContain('href="/app/speak?item=lead"')
  })

  it('carries the AI label when a summary was written with AI, and links to the full brief', () => {
    const html = render('en', full)
    expect(html).toContain(AI_LABEL.en)
    expect(html).toContain('href="/app/brief"')
  })

  it('reads in Spanish on Spanish pages', () => {
    const html = render('es', full)
    expect(html).toMatch(/<h1[^>]*>Tu semana, en breve<\/h1>/)
    expect(html).toContain(AI_LABEL.es)
    expect(html).not.toContain('Your week, in short')
  })

  it('invites the reader to the timeline when there is nothing this week', () => {
    const html = render('en', empty)
    // React writes the apostrophe as &#x27;.
    expect(html).toContain('Nothing is on your governments&#x27; agendas this week.')
    expect(html).toContain('href="/app/timeline"')
    expect(html).not.toContain('Your next step')
  })
})

describe('fits small phones and meets 4.5:1 contrast (DESIGN.md §13)', () => {
  it('lets the sign-up chip wrap, so the long Spanish date fits a 320px phone', () => {
    const html = render('es', full)
    const chip = html.match(/<span class="([^"]*)">La inscripción cierra el/)
    expect(chip).not.toBeNull()
    expect(chip![1]).toContain('whitespace-normal')
    expect(chip![1]).not.toContain('whitespace-nowrap')
  })

  it('shows "Your next step" in solid white on red (faded white measured 4.31:1)', () => {
    const heading = render('en', full).match(/<h2 class="([^"]*)">Your next step<\/h2>/)
    expect(heading).not.toBeNull()
    expect(heading![1]).toMatch(/\btext-white\b(?!\/)/)
    expect(heading![1]).not.toMatch(/text-white\//)
  })
})

describe('getting to it from the dashboard', () => {
  it('is not in the sidebar (the weekly brief has its own summary now)', () => {
    const shell = read('components', 'prototype', 'app-shell.tsx')
    expect(shell).not.toContain('href: "/app/tldr"')
  })

  it('is linked from the dashboard home', () => {
    expect(read('app', '(prototype)', 'app', 'page.tsx')).toContain('href="/app/tldr"')
  })

  it('has every string in English and Spanish, with the Spanish translated', () => {
    const en = flatten(messages('en').AppTldr as Tree)
    const es = flatten(messages('es').AppTldr as Tree)
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
    expect(Object.keys(en).filter((key) => en[key] === es[key])).toEqual([])
    expect((messages('es').AppShell as Tree & { nav: Tree }).nav.tldr).toBeTruthy()
  })
})
