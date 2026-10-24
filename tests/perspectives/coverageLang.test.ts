import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import type { Coverage as CoverageData } from '@/lib/perspectives/types'

// The panel only renders after the reader opens it. Start every boolean useState as true,
// so the server render shows the open panel.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useState: (init: unknown) => (init === false ? [true, () => {}] : actual.useState(init)) }
})

const { Coverage } = await import('@/components/weekly/Coverage')

const messages = (locale: 'en' | 'es') => JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))

const coverage = {
  state: 'sources_only',
  outlet_count: 1,
  viewpoint_count: 0,
  one_sided: false,
  groups: [],
  sources: [{ outlet: 'Sample Outlet', url: 'https://example.com/story', headline: 'Sample headline', published_at: '2026-10-20T12:00:00Z' }],
} as unknown as CoverageData

const render = (locale: 'en' | 'es') =>
  renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      // The child is the third argument; the cast tells TypeScript so.
      { locale, messages: messages(locale), timeZone: 'America/Chicago' } as ComponentProps<typeof NextIntlClientProvider>,
      createElement(Coverage, { coverage }),
    ),
  )

describe('news coverage panel language (perspectives spec N13)', () => {
  it('marks the Spanish "English only" note as Spanish, so screen readers use a Spanish voice', () => {
    const html = render('es')
    expect(html).toContain('lang="en"')
    expect(html).toMatch(/<p[^>]*lang="es"[^>]*>Esta sección solo está disponible en inglés\.<\/p>/)
  })

  it('keeps the rest of the panel in English, marked as English', () => {
    const html = render('es')
    expect(html).toMatch(/<div[^>]*lang="en"[^>]*>[^]*couldn&#x27;t summarize it reliably/)
  })

  it('shows no Spanish note on English pages', () => {
    expect(render('en')).not.toContain('lang="es"')
  })
})
