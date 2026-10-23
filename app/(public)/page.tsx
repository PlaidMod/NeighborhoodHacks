import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPinned, MessageCircle } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { GovernmentStack } from '@/components/home/GovernmentStack'
import { Button } from '@/components/ui/button'
import { getAccount, googleEnabled, hasRememberedGovernments } from '@/lib/account'

const benefitIcons = [MapPinned, CalendarDays, MessageCircle]

export default async function Home({ searchParams }: { searchParams: Promise<{ change?: string; welcome?: string; deleted?: string }> }) {
  const { change, welcome, deleted } = await searchParams
  // Returning readers go straight to their dashboard. Address changes happen at /address.
  if (change === undefined && welcome === undefined && deleted === undefined && (await hasRememberedGovernments())) redirect('/app')
  const [t, ta, td, account, google] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Account'),
    getTranslations('AccountDelete'),
    getAccount(),
    googleEnabled(),
  ])

  return (
    <main id="main" className="bg-canvas">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-16 md:px-8 md:pt-16 2xl:max-w-[1440px]">
        {welcome !== undefined && account && (
          <p role="status" className="status-in mx-auto mb-8 max-w-[34rem] rounded-2xl bg-sage-soft px-4 py-3 text-sm font-semibold text-sage">
            {ta('welcome')}
          </p>
        )}
        {deleted !== undefined && !account && (
          <p role="status" className="status-in mx-auto mb-8 max-w-[34rem] rounded-2xl bg-sage-soft px-4 py-3 text-sm font-semibold text-sage">
            {td('done')}
          </p>
        )}

        <section className="mx-auto max-w-5xl text-center">
          <p className="mb-4 text-xs font-extrabold tracking-[0.16em] text-denim uppercase">{t('eyebrow')}</p>
          <h1 className="mx-auto max-w-[15ch] text-[2.8rem] text-balance leading-[1.02] font-extrabold tracking-[-0.045em] text-ink md:text-6xl lg:text-[4.5rem]">
            {t('title')}
          </h1>
          <p className="mx-auto mt-5 max-w-[42rem] text-lg leading-relaxed text-muted-foreground md:text-xl">{t('lede')}</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-14 rounded-full px-8 text-base">
              <Link href="/address" transitionTypes={['nav-forward']}>
                {t('submit')} <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            {!account && google && (
              <Button asChild size="lg" variant="outline" className="h-16 w-full justify-center rounded-full px-8 text-lg sm:w-auto sm:min-w-[20rem] sm:px-10">
                <a href="/auth/google">
                  <svg aria-hidden viewBox="0 0 24 24" className="size-6">
                    <path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5ZM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Zm-5.6-8.1a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9ZM12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z" />
                  </svg>
                  {ta('signInLink')}
                </a>
              </Button>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t('coverage')}</p>
        </section>

        <section aria-label={t('benefitsLabel')} className="relative mt-12 overflow-hidden rounded-[2rem] border border-border bg-surface p-4 shadow-[0_24px_70px_-40px_rgb(27_38_59/0.35)] md:mt-16 md:p-8 lg:p-10">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_100%,color-mix(in_oklab,var(--denim-soft)_80%,transparent),transparent_42%),radial-gradient(ellipse_at_100%_0%,color-mix(in_oklab,var(--sage-soft)_70%,transparent),transparent_38%)]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div className="order-2 rounded-[1.5rem] bg-white/85 p-5 md:p-7 lg:order-1">
              <p className="mb-5 text-xs font-extrabold tracking-[0.14em] text-denim uppercase">{t('benefitsLabel')}</p>
              <ul className="space-y-5">
                {(['benefitOne', 'benefitTwo', 'benefitThree'] as const).map((key, index) => {
                  const Icon = benefitIcons[index]
                  return (
                    <li key={key} className="flex items-start gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-denim-soft text-denim-deep">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="pt-1 text-base leading-relaxed font-semibold text-ink md:text-lg">{t(key)}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-muted-foreground">{t('privacyNote')}</p>
            </div>

            <div className="order-1 rounded-[1.5rem] bg-canvas/90 px-3 py-6 md:px-8 md:py-9 lg:order-2">
              <GovernmentStack />
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:mt-16 md:grid-cols-3 md:gap-5">
          {(['featureOne', 'featureTwo', 'featureThree'] as const).map((key) => (
            <article key={key} className="rounded-[1.5rem] border border-border bg-surface p-6 md:p-7">
              <p className="text-xs font-extrabold tracking-[0.14em] text-denim uppercase">{t(`${key}Label`)}</p>
              <h2 className="mt-3 text-xl leading-tight font-bold tracking-tight text-ink">{t(`${key}Title`)}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{t(`${key}Body`)}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
