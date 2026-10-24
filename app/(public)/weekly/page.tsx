import { ChevronRight, Mic } from 'lucide-react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { BodyIcon } from '@/components/civic'
import { Coverage } from '@/components/weekly/Coverage'
import { NeedAddress, NewsNav, SampleNotice, StorySource, withToken } from '@/components/weekly/NewsChrome'
import { Button } from '@/components/ui/button'
import type { BodyType } from '@/lib/contracts/bodyTypes'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { buildWeekly, type WeeklyItem } from '@/lib/weekly/build'
import { summarizeWeek } from '@/lib/weekly/summary'
import { weeklyNarrative } from '@/lib/weekly/narrative'
import { loadItems, resolveBodies } from '@/lib/weekly/data'
import { cn } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Weekly')
  return { title: t('metaTitle') }
}

/** Bento tile styles (the prototype brief the team picked). The first tile is the lead story. */
const TILES = [
  { cls: 'sm:col-span-2 bg-denim text-white', cta: 'text-denim', big: true },
  { cls: 'bg-ink text-white', cta: 'text-ink' },
  { cls: 'bg-brick text-white', cta: 'text-brick' },
  { cls: 'bg-sand text-ink', cta: 'text-sand-deep', light: true },
  { cls: 'bg-denim-soft text-ink', cta: 'text-denim', light: true },
  { cls: 'bg-sage-soft text-ink', cta: 'text-sage', light: true },
  { cls: 'bg-plum-soft text-ink', cta: 'text-plum-deep', light: true },
] as const

export default async function WeeklyPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token } = await searchParams
  const [t, tn, tc, locale, format] = await Promise.all([
    getTranslations('Weekly'),
    getTranslations('News'),
    getTranslations('Coverage'),
    getLocale(),
    getFormatter(),
  ])
  const lang = locale === 'es' ? 'es' : 'en'

  const resolved = await resolveBodies(token)
  if (!resolved.bodies) {
    return (
      <main id="main" className="mx-auto max-w-7xl px-4 md:px-8 2xl:max-w-[1440px]">
        <NeedAddress reason={resolved.reason} />
      </main>
    )
  }

  const stakes = parseStakes((await cookies()).get(STAKES_COOKIE)?.value)
  const now = new Date()
  const items = await loadItems(resolved.mode, resolved.bodies, { now })
  const edition = buildWeekly({
    items,
    bodies: resolved.bodies.map((b) => ({ body_id: b.body_id, body_name: b.body_name })),
    stakes,
    now,
    lang,
  })
  const typeOf = new Map(resolved.bodies.map((b) => [b.body_id, b.body_type as BodyType]))

  const story = (i: WeeklyItem) => (lang === 'es' ? i.story_es : i.story_en)
  const headline = (i: WeeklyItem) => story(i)?.headline ?? i.title
  const when = (iso: string) => format.dateTime(new Date(iso), { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const day = (iso: string) => format.dateTime(new Date(iso), { month: 'short', day: 'numeric' })
  const itemHref = (i: WeeklyItem) => withToken(`/items/${i.item_id}`, token)

  // Fewer, bigger stories up top; the rest are a short list with "Show more".
  const tiles = [edition.lead, ...edition.comingUp].filter((i): i is WeeklyItem => !!i).slice(0, 3)
  const summary = summarizeWeek(edition, now)
  const narrative = await weeklyNarrative(edition, lang)
  const SHOWN = 5
  const moreComingUp = edition.comingUp.slice(Math.max(0, tiles.length - 1))
  const nothing = !edition.lead && edition.decided.length === 0

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 md:px-8 2xl:max-w-[1440px] pt-6 pb-8 font-news text-ink">
      <NewsNav active="weekly" token={token} />
      {resolved.mode === 'sample' && <SampleNotice className="mt-4" />}

      {/* Masthead */}
      <header className="border-b border-border py-6">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className="rounded-full bg-brick-soft px-2.5 py-1 text-brick-deep">{t('kicker')}</span>
          <span>{t('range', { from: day(edition.from), to: day(edition.to) })}</span>
        </p>
        <h1 className="mt-4 font-headline text-[2rem] leading-[1.06] font-black sm:text-[2.4rem] md:text-[3.4rem]">{t('title')}</h1>
      </header>

      {/* The point of a weekly brief: the main things happening, in a few lines. */}
      {!nothing && (
        <section aria-labelledby="week-summary" className="mt-6 rounded-[24px] bg-white p-5 md:p-6">
          <h2 id="week-summary" className="font-headline text-2xl font-black md:text-3xl">{t('summaryTitle')}</h2>
          {narrative ? (
            <>
              <div className="mt-4 space-y-3 font-sans text-[1.05rem] leading-relaxed md:text-lg">
                {narrative.map((point, i) => (
                  <p key={i}>{point}</p>
                ))}
              </div>
              <p className="mt-4 font-sans text-xs text-muted-foreground">{t('summaryAi')}</p>
            </>
          ) : (
          <ul className="mt-4 space-y-2.5 font-sans text-[1.05rem] leading-relaxed md:text-lg">
            <li>
              {t('sumComing', { count: summary.coming.count, bodies: summary.coming.bodies })}
            </li>
            {summary.busiest && (
              <li>
                {t('sumBusiest', { day: day(summary.busiest.date), body: summary.busiest.body_name, count: summary.busiest.count })}
              </li>
            )}
            {summary.topics.length > 0 && (
              <li>
                {t('sumTopics', {
                  topics: summary.topics.map((x) => `${t(`topic.${x.type}`)} (${x.count})`).join(', '),
                })}
              </li>
            )}
            {summary.nextDeadline && (
              <li>
                {t('sumDeadline', { when: when(summary.nextDeadline.at), headline: headline(summary.nextDeadline.item) })}{' '}
                <Link href={`/speak-up/${summary.nextDeadline.item.item_id}`} className="font-semibold text-denim underline-offset-4 hover:underline">
                  {tn('speakUp')}
                </Link>
              </li>
            )}
            {summary.decided.count > 0 && (
              <li>
                {summary.decided.passed + summary.decided.failed === 0
                  ? t('sumDecidedPending', { count: summary.decided.count })
                  : t('sumDecided', summary.decided)}
              </li>
            )}
            {summary.cancelled > 0 && <li>{t('sumCancelled', { count: summary.cancelled })}</li>}
          </ul>
          )}
        </section>
      )}

      {nothing && <p className="py-10 text-muted-foreground">{t('empty')}</p>}

      {/* Bento: the lead story, then the next "coming up" items */}
      {tiles.length > 0 && (
        <section aria-label={t('comingUp')} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((item, i) => {
            const tile = TILES[i]
            const s = story(item)
            const urgent = item.tier === 'sms'
            const light = 'light' in tile && tile.light
            return (
              <Link
                key={item.item_id}
                href={itemHref(item)}
                className={cn(
                  'group relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] p-5 transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:hover:-translate-y-1',
                  tile.cls,
                  // Three equal stories side by side on wide screens.
                  'lg:col-span-1',
                )}
              >
                <div>
                  <p className={cn('text-xs font-bold', light ? 'text-muted-foreground' : 'text-white/75')}>
                    {item.body_name}
                    {urgent && <span className={cn('ml-2', light ? 'text-brick' : 'text-white')}>● {tn('urgent')}</span>}
                  </p>
                  <h2 className={cn('mt-2 line-clamp-3 font-headline leading-[1.12] font-bold', 'big' in tile && tile.big ? 'text-[1.4rem] sm:text-[1.7rem]' : 'text-[1.25rem]')}>
                    {headline(item)}
                  </h2>
                  {s?.dek && i === 0 && (
                    <p className={cn('mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed', light ? 'text-ink/75' : 'text-white/80')}>
                      {s.dek}
                    </p>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className={cn('inline-flex h-8 items-center gap-1 rounded-full bg-white px-3.5 font-sans text-xs font-bold', tile.cta)}>
                    {item.registration_closes_at ? t('readRespond') : t('readMore')}
                    <ChevronRight aria-hidden className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                  </span>
                  {item.registration_closes_at && (
                    <span className={cn('text-xs font-semibold', light ? 'text-muted-foreground' : 'text-white/80')}>
                      {tn('closes', { when: when(item.registration_closes_at) })}
                    </span>
                  )}
                  {!!item.outlet_count && (
                    <span className={cn('text-xs', light ? 'text-muted-foreground' : 'text-white/70')}>{tc('outlets', { count: item.outlet_count })}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </section>
      )}

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          {/* The rest of "Coming up", with Speak up buttons */}
          {moreComingUp.length > 0 && (
            <section>
              <SectionRule>{t('comingUp')}</SectionRule>
              <ul className="divide-y divide-border">
                {moreComingUp.map((item) => (
                  <li key={item.item_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-denim">{item.body_name}</p>
                      <Link href={itemHref(item)} className="line-clamp-2 font-headline text-[1.15rem] leading-snug font-bold hover:underline">
                        {headline(item)}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.registration_closes_at ? tn('closes', { when: when(item.registration_closes_at) }) : tn('meeting', { when: when(item.meeting_date) })}
                      </p>
                      {item.coverage && item.coverage.state !== 'none' && <Coverage coverage={item.coverage} className="mt-2" />}
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0 font-sans">
                      <Link href={`/speak-up/${item.item_id}`}>
                        <Mic data-icon="inline-start" /> {tn('speakUp')}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Decided this week */}
          {edition.decided.length > 0 && (
            <section>
              <SectionRule>{t('decided')}</SectionRule>
              <div className="divide-y divide-border">
                {edition.decided.map((item, index) => {
                  const s = story(item)
                  return (
                    <article key={item.item_id} className="grid gap-2 py-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                      <div>
                        <p className="text-xs font-bold text-denim">{item.body_name}</p>
                        <p className="text-xs text-muted-foreground">{day(item.meeting_date)}</p>
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 font-headline text-[1.15rem] leading-snug font-bold">
                          <Link href={itemHref(item)} className="hover:underline">
                            {headline(item)}
                          </Link>
                        </h3>
                        {s?.dek && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{s.dek}</p>}
                        <p className="mt-2 text-sm font-semibold">
                          {item.outcomePending ? (
                            <span className="text-muted-foreground italic">{tn('outcomePending')}</span>
                          ) : item.outcome?.vote_result ? (
                            <span className="text-sage">{tn(`result.${item.outcome.vote_result}`)}</span>
                          ) : null}
                        </p>
                        <StorySource source={item.story_source} url={item.source_url} className="mt-2" />
                        {item.coverage && item.coverage.state !== 'none' && <Coverage coverage={item.coverage} className="mt-2" />}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {edition.cancelled.length > 0 && (
            <section>
              <SectionRule>{t('cancelledMeetings')}</SectionRule>
              <ul className="space-y-2 py-4 text-sm">
                {edition.cancelled.map((item) => (
                  <li key={item.item_id}>
                    <span className="font-bold">{item.body_name}</span> · {day(item.meeting_date)} · <span className="text-muted-foreground line-through">{item.title}</span>{' '}
                    <span className="font-semibold text-brick">{tn('cancelled')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-[24px] bg-white p-5">
            <h2 className="font-headline text-2xl font-bold">{t('deadlines')}</h2>
            {edition.deadlines.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('noDeadlines')}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {edition.deadlines.slice(0, SHOWN).map((d) => (
                  <li key={`${d.kind}-${d.item_id ?? d.at}`} className="border-l-2 border-brick pl-3">
                    <p className="text-xs font-bold text-brick">{when(d.at)}</p>
                    {d.item_id ? (
                      <Link href={withToken(`/items/${d.item_id}`, token)} className="line-clamp-3 text-sm leading-snug font-semibold hover:underline">
                        {d.label}
                      </Link>
                    ) : (
                      <p className="text-sm leading-snug font-semibold">{d.label}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {edition.deadlines.length > SHOWN && (
              <p className="mt-3 font-sans text-sm font-semibold text-muted-foreground">{t('moreDeadlines', { count: edition.deadlines.length - SHOWN })}</p>
            )}
          </div>
          <div className="rounded-[24px] bg-white p-5">
            <h2 className="font-headline text-2xl font-bold">{t('glance')}</h2>
            <ul className="mt-4 space-y-3">
              {edition.bodiesAtAGlance.map((b) => (
                <li key={b.body_id} className="flex items-center gap-3">
                  <BodyIcon type={typeOf.get(b.body_id) ?? 'other'} id={b.body_id} className="size-9 rounded-xl" />
                  <div className="min-w-0 font-sans">
                    <p className="truncate text-sm font-bold">{b.body_name}</p>
                    <p className="text-xs text-muted-foreground">{t('upcomingCount', { count: b.upcoming })}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <footer className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
        <p className="max-w-3xl">
          {tn('howWritten')} {tc('tieBreak')}
        </p>
      </footer>
    </main>
  )
}

function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 border-t-2 border-ink pt-2 text-base font-extrabold tracking-[0.1em] uppercase md:text-lg">
      {children}
    </h2>
  )
}
