'use server'

import { cookies } from 'next/headers'
import { LOCALE_COOKIE, isLocale, type Locale } from '@/lib/i18n'

const ONE_YEAR = 60 * 60 * 24 * 365

/** Saves the visitor's language choice. */
export async function setLocale(locale: Locale): Promise<void> {
  // Server actions accept any input from the browser, so check it.
  if (!isLocale(locale)) throw new Error('Unsupported language')
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, { path: '/', sameSite: 'lax', maxAge: ONE_YEAR })
}
