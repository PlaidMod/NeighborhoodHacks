import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { GovernmentStack } from '@/components/home/GovernmentStack'
import { Button } from '@/components/ui/button'
import { getAccount, googleEnabled, hasRememberedGovernments } from '@/lib/account'

export default async function Home({ searchParams }: { searchParams: Promise<{ change?: string; welcome?: string }> }) {
  const { change, welcome } = await searchParams
  // Returning readers go straight to their dashboard. Address changes happen at /address.
  if (change === undefined && welcome === undefined && (await hasRememberedGovernments())) redirect('/app')
  const [t, ta, account, google] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Account'),
    getAccount(),
    googleEnabled(),
  ])

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 pt-12 pb-16 md:px-8 md:pt-20 2xl:max-w-[1440px]">
      <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] xl:gap-20">
        <div>
          {welcome !== undefined && account && (
            <p role="status" className="mb-6 max-w-[34rem] rounded-2xl bg-sage-soft px-4 py-3 text-sm font-semibold text-sage">
              {ta('welcome')}
            </p>
          )}
          <p className="mb-4 text-xs font-extrabold tracking-[0.16em] text-denim uppercase">{t('eyebrow')}</p>
          <h1 className="max-w-[13ch] text-[2.8rem] leading-[1.02] font-extrabold tracking-[-0.04em] text-ink md:text-[4rem] xl:text-[5rem]">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-muted-foreground xl:text-xl">{t('lede')}</p>
          <ul className="mt-6 space-y-3 text-base text-ink md:text-lg">
            {(['benefitOne', 'benefitTwo', 'benefitThree'] as const).map((key) => (
              <li key={key} className="flex items-start gap-3">
                <span aria-hidden className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-sage-soft text-xs font-bold text-sage">✓</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-14 rounded-full px-8 text-base">
              <Link href="/address">{t('submit')}</Link>
            </Button>
            {!account && google && (
              <Button asChild size="lg" variant="outline" className="h-14 rounded-full px-7 text-base">
                <a href="/auth/google">
                  <svg aria-hidden viewBox="0 0 24 24" className="size-5">
                    <path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5ZM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Zm-5.6-8.1a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9ZM12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z" />
                  </svg>
                  {ta('signInLink')}
                </a>
              </Button>
            )}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{t('coverage')}</p>
        </div>
        <div className="rounded-[2rem] bg-[#f4f6f9] px-5 py-8 md:px-10 md:py-12 lg:px-8 xl:px-12">
          <GovernmentStack />
        </div>
      </section>
      <section aria-label={t('benefitsLabel')} className="mt-16 grid gap-4 border-t border-line pt-8 md:mt-24 md:grid-cols-3 md:gap-8">
        {(['featureOne', 'featureTwo', 'featureThree'] as const).map((key, index) => (
          <article key={key} className="rounded-2xl bg-white p-5 md:p-6">
            <p className="text-xs font-extrabold tracking-[0.14em] text-denim uppercase">{t(`feature${index + 1}Label`)}</p>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">{t(`${key}Title`)}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`${key}Body`)}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
