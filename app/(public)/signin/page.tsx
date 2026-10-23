import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getAccount, googleEnabled } from '@/lib/account'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Account')
  return { title: t('metaTitle') }
}

/** Sign in with Google, or keep going as a guest. Signing in is optional (Project_Plan decision 8). */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const [t, account, google] = await Promise.all([getTranslations('Account'), getAccount(), googleEnabled()])
  if (account) redirect('/app')
  return (
    <main id="main" className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center px-4 py-16 md:px-8">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_1px_2px_rgb(27_38_59/0.04),0_6px_20px_-12px_rgb(27_38_59/0.16)] md:p-10">
        <h1 className="text-[2rem] leading-tight font-extrabold tracking-[-0.03em] text-ink">{t('title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('lede')}</p>
        {(error || !google) && (
          <p role="alert" className="mt-5 rounded-2xl bg-sand px-4 py-3 text-sm font-semibold text-sand-deep">
            {error === 'failed' ? t('failed') : t('googleOff')}
          </p>
        )}
        <div className="mt-7 space-y-3">
          {google && (
            <Button asChild size="lg" variant="ink" className="w-full">
              {/* A plain link: /auth/google is a route that redirects to Google. */}
              <a href="/auth/google">
                <svg aria-hidden viewBox="0 0 24 24" className="size-5">
                  <path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5ZM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Zm-5.6-8.1a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9ZM12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z" />
                </svg>
                {t('google')}
              </a>
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/">{t('guest')}</Link>
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{t('guestNote')}</p>
      </div>
    </main>
  )
}
