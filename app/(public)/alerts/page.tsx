import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { AlertSignup } from '@/components/alerts/AlertSignup'
import { PushSignup } from '@/components/alerts/PushSignup'
import { vapidPublicKey } from '@/lib/push/send'
import { NeedAddress, NewsNav } from '@/components/weekly/NewsChrome'
import { RULE_TEXT, SMS_BODY_NOTE, type AlertRule } from '@/lib/rules/ruleText'
import { itemAlertText, reminderText } from '@/lib/sms/message'
import { twilioConfigured } from '@/lib/sms/subscriber'
import { dataMode } from '@/lib/weekly/data'
import { sampleItems } from '@/lib/weekly/sample'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Alerts')
  return { title: t('metaTitle') }
}

const ITEM_RULES: AlertRule[] = ['tax_rate_increase', 'bond', 'board_election', 'school_change', 'leader_hire', 'meeting_moved']
const REMINDER_RULES: AlertRule[] = ['registration_opens', 'registration_closes', 'protest_deadline']

/** Opt-in, the published texting rules, and a preview of the texts (Technical Plan §11). */
export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token } = await searchParams
  const [t, locale] = await Promise.all([getTranslations('Alerts'), getLocale()])
  const lang = locale === 'es' ? 'es' : 'en'
  const preview = !twilioConfigured()
  // With a real database, sign-up needs the reader's governments from their lookup.
  const needsLookup = dataMode() === 'db' && !token && !preview

  // Example texts, built by the real message code from sample items.
  const samples = sampleItems().filter((i) => i.tier === 'sms').slice(0, 2)
  const site = 'showup.example'
  const previews = [
    ...samples.map((i) =>
      itemAlertText(
        {
          body: i.body_name,
          headline: (lang === 'es' ? i.story_es : i.story_en)?.headline ?? i.title,
          deadline: { meeting_at: i.meeting_date, registration_closes_at: i.registration_closes_at },
          link: `https://${site}/items/${i.item_id}`,
        },
        lang,
      ),
    ),
    ...(samples[0]
      ? [
          reminderText(
            'registration_closes',
            { body: samples[0].body_name, title: samples[0].title, at: samples[0].registration_closes_at ?? samples[0].meeting_date, link: `https://${site}/s` },
            lang,
          ),
        ]
      : []),
  ]

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 md:px-8 2xl:max-w-[1440px] pt-6 pb-8">
      <NewsNav active="alerts" token={token} />
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-10">
          <header>
            <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em] text-ink md:text-[2.5rem]">{t('title')}</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t('lede')}</p>
          </header>

          <div className="rounded-[24px] bg-white p-5 ring-1 ring-border">
            <PushSignup token={token ?? null} vapidKey={vapidPublicKey()} />
          </div>

          <section>
            <h2 className="mb-4 text-lg font-bold">{t('textsTitle')}</h2>
            {needsLookup ? <NeedAddress reason="no_token" /> : <AlertSignup token={token ?? null} preview={preview} />}
          </section>

          <section id="rules">
            <h2 className="text-lg font-bold">{t('rulesTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('rulesLede')}</p>
            <ol className="mt-4 space-y-3">
              {ITEM_RULES.map((r, index) => (
                <li key={r} id={r} className="rounded-2xl bg-white p-4 ring-1 ring-border">
                  <p className="font-semibold">{RULE_TEXT[r][lang].title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{RULE_TEXT[r][lang].why}</p>
                </li>
              ))}
            </ol>
            <h3 className="mt-6 font-bold">{t('remindersTitle')}</h3>
            <ul className="mt-3 space-y-3">
              {REMINDER_RULES.map((r) => (
                <li key={r} id={r} className="rounded-2xl bg-white p-4 ring-1 ring-border">
                  <p className="font-semibold">{RULE_TEXT[r][lang].title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{RULE_TEXT[r][lang].why}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">{SMS_BODY_NOTE[lang]}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('quiet')}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold">{t('privacyTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('privacy')}</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 text-sm font-bold">{t('previewPhone')}</h2>
          <div className="mx-auto w-full max-w-[340px] rounded-[40px] bg-ink p-3">
            <div className="space-y-3 rounded-[30px] bg-surface p-4 text-[13px] leading-snug">
              {previews.map((text, i) => (
                <p key={i} className="w-fit max-w-[90%] rounded-[18px] rounded-bl-md bg-white px-3.5 py-2.5 [overflow-wrap:anywhere] text-ink">
                  {text}
                </p>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t('previewPhoneNote')}</p>
        </aside>
      </div>
    </main>
  )
}
