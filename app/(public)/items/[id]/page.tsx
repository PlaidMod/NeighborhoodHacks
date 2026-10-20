import { ArrowLeft, Mic } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Coverage } from '@/components/weekly/Coverage'
import { NewsNav, SampleNotice, StorySource, withToken } from '@/components/weekly/NewsChrome'
import { Button } from '@/components/ui/button'
import { RULE_TEXT, type AlertRule } from '@/lib/rules/ruleText'
import { loadItem } from '@/lib/weekly/data'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Item')
  return { title: t('metaTitle') }
}

function isRule(value: string | undefined): value is AlertRule {
  return !!value && value in RULE_TEXT
}

/** One agenda item's story (Technical Plan §2). Alert links land here with ?why=<rule>. */
export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string; why?: string }>
}) {
  const [{ id }, { t: token, why }] = await Promise.all([params, searchParams])
  const [t, tn, locale, format] = await Promise.all([getTranslations('Item'), getTranslations('News'), getLocale(), getFormatter()])
  const lang = locale === 'es' ? 'es' : 'en'
  const item = await loadItem(id)

  if (!item) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 py-16 font-sans">
        <p className="text-lg font-semibold">{t('notFound')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={withToken('/weekly', token)}>{t('back')}</Link>
        </Button>
      </main>
    )
  }

  const story = lang === 'es' ? item.story_es : item.story_en
  const when = (iso: string) =>
    format.dateTime(new Date(iso), { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const upcoming = item.status === 'upcoming' && item.meeting_status !== 'cancelled' && new Date(item.meeting_date) > new Date()
  const ruleText = isRule(why) ? RULE_TEXT[why][lang] : null

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 pt-6 pb-16 font-news text-ink">
      <NewsNav active="weekly" token={token} />
      <Link
        href={withToken('/weekly', token)}
        className="mt-6 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-muted-foreground hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" /> {t('back')}
      </Link>
      {item.is_sample && <SampleNotice className="mt-4" />}

      {ruleText && (
        <aside className="mt-6 rounded-[24px] bg-denim-soft p-5 font-sans text-denim-deep">
          <h2 className="font-bold">{t('whyTitle')}</h2>
          <p className="mt-1 text-sm font-semibold">{ruleText.title}</p>
          <p className="mt-1 text-sm">{ruleText.why}</p>
          <Link href={`/alerts/why?rule=${why}&item=${item.item_id}`} className="mt-2 inline-block text-sm font-semibold underline">
            {t('whyLink')}
          </Link>
        </aside>
      )}

      <article className="mt-6">
        <p className="text-[11px] font-extrabold tracking-[0.12em] uppercase">
          <span className="text-denim">{item.body_name}</span>
          {item.tier === 'sms' && upcoming && <span className="text-brick"> · {tn('urgent')}</span>}
        </p>
        <h1 className="mt-3 font-headline text-[2rem] leading-[1.08] font-black md:text-[2.6rem]">{story?.headline ?? item.title}</h1>
        {story?.dek && <p className="mt-4 text-[1.15rem] leading-relaxed text-ink/80">{story.dek}</p>}
        <p className="mt-5 border-y border-border py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {item.meeting_status === 'cancelled' ? tn('cancelled') : when(item.meeting_date)}
          {item.agenda_number && <> · {t('agendaItem', { number: item.agenda_number })}</>}
        </p>

        <div className="mt-6 space-y-4 text-[1.08rem] leading-[1.75]">
          {(story?.body_paragraphs ?? [item.title]).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {story?.renter_line && (
          <p className="mt-6 border-l-[3px] border-denim pl-4 font-headline text-lg italic">{story.renter_line}</p>
        )}

        {item.status !== 'upcoming' && (
          <p className="mt-6 text-sm font-semibold">
            {item.status === 'awaiting_result' ? (
              <span className="text-muted-foreground italic">{tn('outcomePending')}</span>
            ) : item.outcome?.vote_result ? (
              <span className="text-sage">{tn(`result.${item.outcome.vote_result}`)}</span>
            ) : null}
          </p>
        )}
      </article>

      {upcoming && (
        <div className="mt-8 flex flex-col gap-3 rounded-[24px] bg-ink p-6 font-sans text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">
            {item.registration_closes_at ? tn('closes', { when: when(item.registration_closes_at) }) : tn('meeting', { when: when(item.meeting_date) })}
          </p>
          <Button asChild variant="brick" size="lg" className="shrink-0">
            <Link href={`/speak-up/${item.item_id}`}>
              <Mic data-icon="inline-start" /> {tn('speakUp')}
            </Link>
          </Button>
        </div>
      )}

      <StorySource source={item.story_source} url={item.source_url} className="mt-6" />
      <Coverage coverage={item.coverage} className="mt-6" />
    </main>
  )
}
