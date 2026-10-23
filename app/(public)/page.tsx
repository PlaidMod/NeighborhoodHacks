import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AddressForm } from '@/components/home/AddressForm'
import { GovernmentStack } from '@/components/home/GovernmentStack'
import { getAccount, googleEnabled, hasRememberedGovernments } from '@/lib/account'

export default async function Home({ searchParams }: { searchParams: Promise<{ change?: string; welcome?: string }> }) {
  const { change, welcome } = await searchParams
  // A returning reader goes straight to their dashboard; "Change address" links here with ?change=1.
  if (change === undefined && welcome === undefined && (await hasRememberedGovernments())) redirect('/app')
  const [t, ta, account, google] = await Promise.all([getTranslations('Home'), getTranslations('Account'), getAccount(), googleEnabled()])
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 md:px-8 2xl:max-w-[1440px] py-12 md:py-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] xl:gap-20">
        <div>
          {welcome !== undefined && account && (
            <p role="status" className="mb-6 max-w-[34rem] rounded-2xl bg-sage-soft px-4 py-3 text-sm font-semibold text-sage xl:max-w-[40rem]">
              {ta('welcome')}
            </p>
          )}
          <h1 className="text-[2.6rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink md:text-[3.4rem] xl:text-[4.25rem]">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-[34rem] text-lg text-muted-foreground xl:max-w-[40rem] xl:text-xl">{t('lede')}</p>
          <AddressForm className="mt-8 max-w-[34rem] xl:max-w-[40rem]" />
          <p className="mt-4 text-sm text-muted-foreground">{t('coverage')}</p>
          {!account && google && (
            <p className="mt-3 text-sm text-muted-foreground">
              {ta('signInPrompt')}{' '}
              <Link href="/signin" className="font-semibold text-denim underline underline-offset-2">
                {ta('signInLink')}
              </Link>
            </p>
          )}
        </div>
        <GovernmentStack />
      </div>
    </main>
  )
}
