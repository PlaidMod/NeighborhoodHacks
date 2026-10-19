import { getLocale, getTranslations } from 'next-intl/server'
import { switchLocale } from '@/app/actions/locale'
import { LOCALES, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Each language is named in its own language, so a reader can always find theirs.
const NAMES: Record<Locale, string> = { en: 'English', es: 'Español' }

/**
 * Two pill buttons that switch the page language and save the choice in a cookie.
 * It's a plain form, so it works even before the page's JavaScript has loaded.
 */
export async function LanguageToggle({ className }: { className?: string }) {
  const t = await getTranslations('Shell')
  const current = (await getLocale()) as Locale
  return (
    <form
      action={switchLocale}
      role="group"
      aria-label={t('language')}
      className={cn('inline-flex rounded-full bg-muted p-1', className)}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          lang={locale}
          aria-pressed={locale === current}
          className={cn(
            'h-8 rounded-full px-3 text-sm font-semibold transition-colors',
            locale === current ? 'bg-white text-ink ring-1 ring-border' : 'text-muted-foreground hover:text-ink',
          )}
        >
          {NAMES[locale]}
        </button>
      ))}
    </form>
  )
}
