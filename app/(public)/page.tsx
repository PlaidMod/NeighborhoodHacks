import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { GovernmentStack } from '@/components/home/GovernmentStack'
import { Button } from '@/components/ui/button'
import { getAccount, googleEnabled, hasRememberedGovernments } from '@/lib/account'

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
    <main id="main" className="landing-hero relative isolate min-h-[calc(100svh-5rem)] overflow-hidden bg-transparent">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-paper/30 via-paper/10 to-transparent" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-sand/5 via-transparent to-white/5" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1600px] items-center gap-10 px-5 py-20 md:px-10 md:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12 xl:gap-20">
        <section className="max-w-2xl">
          {welcome !== undefined && account && (
            <p role="status" className="status-in mb-6 max-w-[34rem] rounded-2xl bg-sage-soft px-4 py-3 text-sm font-semibold text-sage">
              {ta('welcome')}
            </p>
          )}
          {deleted !== undefined && !account && (
            <p role="status" className="status-in mb-6 max-w-[34rem] rounded-2xl bg-sage-soft px-4 py-3 text-sm font-semibold text-sage">
              {td('done')}
            </p>
          )}

          <p className="mb-5 text-xs font-extrabold tracking-[0.18em] text-denim uppercase">{t('eyebrow')}</p>
          <h1 className="max-w-[12ch] text-balance text-[clamp(3.5rem,6vw,6rem)] leading-[0.94] font-extrabold tracking-[-0.055em] text-ink">
            {t('title')}
          </h1>
          <p className="mt-6 max-w-[35rem] text-lg leading-relaxed text-ink/80 md:text-xl">{t('lede')}</p>

          <div className="mt-8 flex max-w-[38rem] flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-14 rounded-full px-7 text-base">
              <Link href="/address" transitionTypes={['nav-forward']}>
                {t('submit')} <ArrowRight aria-hidden className="size-4" size={16} strokeWidth={2} absoluteStrokeWidth />
              </Link>
            </Button>
            {!account && google && (
              <Button asChild size="lg" variant="outline" className="h-16 w-full justify-center rounded-full border-white/75 bg-white px-7 text-lg text-ink shadow-lg sm:w-auto sm:min-w-[18rem]">
                <a href="/auth/google">
                  <svg aria-hidden viewBox="0 0 24 24" className="size-6">
                    <path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5ZM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Zm-5.6-8.1a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9ZM12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z" />
                  </svg>
                  {ta('signUpLink')}
                </a>
              </Button>
            )}
          </div>

        </section>

        <section aria-label={t('previewEyebrow')} className="relative mx-auto w-full max-w-[560px] py-4">
          <div aria-hidden className="absolute inset-x-4 inset-y-12 rounded-full bg-denim-soft/40 blur-3xl" />
          <GovernmentStack />
        </section>
      </div>
    </main>
  )
}
