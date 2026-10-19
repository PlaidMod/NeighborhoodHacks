// Language and time-zone settings shared by the whole app.

export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'NEXT_LOCALE'
/** Every date and time in the app is shown in Houston's time zone. */
export const TIME_ZONE = 'America/Chicago'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/**
 * Picks the page language: a valid cookie wins, then the browser's
 * Accept-Language header (highest q first), then English.
 */
export function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue
  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(',')
      .map((part, index) => {
        const [tag, ...params] = part.trim().split(';')
        const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
        const q = qParam === undefined ? 1 : Number(qParam.slice(2))
        return { primary: tag.trim().toLowerCase().split('-')[0], q: Number.isFinite(q) ? q : 0, index }
      })
      .filter((entry) => entry.q > 0)
      .sort((a, b) => b.q - a.q || a.index - b.index)
    for (const entry of ranked) {
      if (isLocale(entry.primary)) return entry.primary
    }
  }
  return DEFAULT_LOCALE
}
