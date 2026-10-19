import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { LOCALE_COOKIE, TIME_ZONE, pickLocale } from '@/lib/i18n'

// No language in the URL: the language comes from the NEXT_LOCALE cookie
// (set by the language toggle) or the browser's Accept-Language header.
export default getRequestConfig(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()])
  const locale = pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get('accept-language'))
  return {
    locale,
    timeZone: TIME_ZONE,
    now: new Date(),
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
