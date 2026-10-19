import { createFormatter } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES, TIME_ZONE, pickLocale } from '@/lib/i18n'

describe('pickLocale', () => {
  it.each([
    ['es', 'en-US', 'es'],
    [undefined, 'es-US,es;q=0.9,en;q=0.8', 'es'],
    [undefined, 'es-419', 'es'],
    [undefined, 'en-US,es;q=0.9', 'en'],
    [undefined, 'en;q=0.5,es;q=0.9', 'es'],
    ['fr', 'es-MX', 'es'],
    [undefined, 'de-DE,fr;q=0.8', 'en'],
    [undefined, null, 'en'],
  ] as const)('cookie %j + Accept-Language %j → %s', (cookie, header, expected) => {
    expect(pickLocale(cookie, header)).toBe(expected)
  })

  it('defaults to English and supports exactly en and es', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect([...LOCALES]).toEqual(['en', 'es'])
  })
})

describe('Chicago time formatting', () => {
  const time = { hour: 'numeric', minute: '2-digit' } as const

  it('formats Central daylight time in English', () => {
    const format = createFormatter({ locale: 'en', timeZone: TIME_ZONE })
    expect(format.dateTime(new Date('2026-10-27T22:00:00Z'), time)).toBe('5:00 PM')
  })

  it('formats Central standard time after Nov 1', () => {
    const format = createFormatter({ locale: 'en', timeZone: TIME_ZONE })
    expect(format.dateTime(new Date('2026-11-04T15:30:00Z'), time)).toBe('9:30 AM')
  })

  it('formats Spanish with a 24-hour clock', () => {
    const format = createFormatter({ locale: 'es', timeZone: TIME_ZONE })
    expect(format.dateTime(new Date('2026-10-27T22:00:00Z'), time)).toContain('17:00')
  })
})
