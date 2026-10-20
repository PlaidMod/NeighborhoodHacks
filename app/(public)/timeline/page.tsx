import type { Metadata } from 'next'
import Link from 'next/link'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { BodyIcon } from '@/components/civic'
import { NeedAddress, NewsNav, SampleNotice, withToken } from '@/components/weekly/NewsChrome'
import type { BodyType } from '@/lib/contracts/bodyTypes'
import { buildTimeline, type WeeklyItem } from '@/lib/weekly/build'
import { loadItems, resolveBodies } from '@/lib/weekly/data'
import { cn } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Timeline')
  return { title: t('metaTitle') }
}

const FILTERS = ['all', 'upcoming', 'decided', 'urgent'] as const
type Filter = (typeof FILTERS)[number]

/** Every item from the reader's governments, newest meeting first. Nothing here texts anyone. */
export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ t?: string; f?: string }> }) {
  const { t: token, f } = await searchParams
  const filter: Filter = (FILTERS as readonly string[]).includes(f ?? '') ? (f as Filter) : 'all'
  const [t, tn, locale, format] = await Promise.all([getTranslations('Timeline'), getTranslations('News'), getLocale(), getFormatter()])
  const lang = locale === 'es' ? 'es' : 'en'

  const resolved = await resolveBodies(token)
  if (!resolved.bodies) {
    return (
      <main id="main" className="mx-auto max-w-7xl px-4 md:px-8 2xl:max-w-[1440px]">
        <NeedAddress reason={resolved.reason} />
      </main>
    )
  }

  const typeOf = new Map(resolved.bodies.map((b) => [b.body_id, b.body_type as BodyType]))
  const all = await loadItems(resolved.mode, resolved.bodies, { fromDays: 45, toDays: 30 })
  const items = buildTimeline(all).filter((i) => {
    if (filter === 'upcoming') return i.status === 'upcoming'
    if (filter === 'decided') return i.status !== 'upcoming'
    if (filter === 'urgent') return i.tier === 'sms'
    return true
  })
  const day = (iso: string) => format.dateTime(new Date(iso), { month: 'short', day: 'numeric' })
  const headline = (i: WeeklyItem) => (lang === 'es' ? i.story_es : i.story_en)?.headline ?? i.title
  const filterHref = (key: Filter) => withToken(key === 'all' ? '/timeline' : `/timeline?f=${key}`, token)

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 pt-6 pb-16 font-news text-ink md:px-8 2xl:max-w-[1440px]">
      <NewsNav active="timeline" token={token} />
      <div className="max-w-3xl">
      {resolved.mode === 'sample' && <SampleNotice className="mt-4" />}
      <h1 className="mt-6 font-headline text-[1.9rem] leading-tight font-black sm:text-[2.2rem]">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('lede')}</p>

      <nav aria-label={t('filtersLabel')} className="mt-6 flex flex-wrap gap-2 font-sans">
        {FILTERS.map((key) => (
          <Link
            key={key}
            href={filterHref(key)}
            aria-current={filter === key ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-muted-foreground ring-1 ring-border hover:text-ink',
              filter === key && 'bg-ink text-white ring-ink hover:text-white',
            )}
          >
            {t(`filter.${key}`)}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="py-10 text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {items.map((item) => (
            <li key={item.item_id} className="flex gap-4 py-4">
              <BodyIcon type={typeOf.get(item.body_id) ?? 'other'} id={item.body_id} className="mt-1" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {item.body_name} · {day(item.meeting_date)}
                  {item.tier === 'sms' && item.status === 'upcoming' && <span className="font-bold text-brick"> · {tn('urgent')}</span>}
                </p>
                <Link href={withToken(`/items/${item.item_id}`, token)} className="mt-0.5 block font-headline text-[1.15rem] leading-snug font-bold hover:underline">
                  {headline(item)}
                </Link>
                <p className="mt-1 text-xs font-semibold">
                  {item.meeting_status === 'cancelled' ? (
                    <span className="text-brick">{tn('cancelled')}</span>
                  ) : item.status === 'awaiting_result' ? (
                    <span className="text-muted-foreground italic">{tn('outcomePending')}</span>
                  ) : item.status === 'decided' && item.outcome?.vote_result ? (
                    <span className="text-sage">{tn(`result.${item.outcome.vote_result}`)}</span>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      </div>
    </main>
  )
}
