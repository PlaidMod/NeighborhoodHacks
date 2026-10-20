import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { NewsNav } from '@/components/weekly/NewsChrome'
import { RULE_TEXT, type AlertRule } from '@/lib/rules/ruleText'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Alerts')
  return { title: t('whyMetaTitle') }
}

/** "Why did I get this text?" Each alert link carries its rule key (Technical Plan §11). */
export default async function WhyPage({ searchParams }: { searchParams: Promise<{ rule?: string; item?: string }> }) {
  const { rule, item } = await searchParams
  const [t, locale] = await Promise.all([getTranslations('Alerts'), getLocale()])
  const lang = locale === 'es' ? 'es' : 'en'
  const known = rule && rule in RULE_TEXT ? RULE_TEXT[rule as AlertRule][lang] : null
  const itemId = item && /^[a-z0-9-]{1,64}$/i.test(item) ? item : null

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 pt-6 pb-16 md:px-8 2xl:max-w-[1440px]">
      <NewsNav active="alerts" />
      <div className="max-w-3xl">
      <h1 className="mt-8 text-[2rem] leading-tight font-extrabold tracking-tight text-ink">{t('whyTitle')}</h1>
      {known ? (
        <div className="mt-6 rounded-[24px] bg-denim-soft p-6 text-denim-deep">
          <p className="text-lg font-bold">{known.title}</p>
          <p className="mt-2">{known.why}</p>
          {itemId && (
            <Link href={`/items/${itemId}`} className="mt-4 inline-block font-semibold underline">
              {t('whyItem')}
            </Link>
          )}
        </div>
      ) : (
        <p className="mt-4 text-muted-foreground">{t('whyUnknown')}</p>
      )}
      <Link href="/alerts#rules" className="mt-6 inline-block text-sm font-semibold text-denim underline-offset-2 hover:underline">
        {t('allRules')}
      </Link>
      </div>
    </main>
  )
}
