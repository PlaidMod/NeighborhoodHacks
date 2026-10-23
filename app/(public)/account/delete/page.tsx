import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DeleteAccountForm } from '@/components/prototype/sign-out-form'
import { Button } from '@/components/ui/button'
import { getAccount } from '@/lib/account'
import { isAdminEmail } from '@/lib/adminAuth'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AccountDelete')
  return { title: t('metaTitle') }
}

/** Confirms "Delete my account" from the account menu. The button submits DeleteAccountForm. */
export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const [t, account] = await Promise.all([getTranslations('AccountDelete'), getAccount()])
  if (!account) redirect('/signin')
  const admin = isAdminEmail(account.email)
  return (
    <main id="main" className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center px-4 pt-16 pb-8 md:px-8">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_1px_2px_rgb(27_38_59/0.04),0_6px_20px_-12px_rgb(27_38_59/0.16)] md:p-10">
        <h1 className="text-[2rem] text-balance leading-tight font-extrabold tracking-[-0.03em] text-ink">{t('title')}</h1>
        {account.email && <p className="mt-3 text-sm text-muted-foreground">{t('signedInAs', { email: account.email })}</p>}
        {error && !admin && (
          <p role="alert" className="mt-5 rounded-2xl bg-sand px-4 py-3 text-sm font-semibold text-sand-deep">
            {t('failed')}
          </p>
        )}
        {admin ? (
          <>
            <p className="mt-5 text-ink">{t('admin')}</p>
            <Button asChild size="lg" variant="outline" className="mt-7 w-full">
              <Link href="/app">{t('cancel')}</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="mt-5 text-ink">{t('what')}</p>
            <p className="mt-3 text-muted-foreground">{t('browser')}</p>
            <div className="mt-7 space-y-3">
              <DeleteAccountForm label={t('confirm')} pendingLabel={t('deleting')} />
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href="/app">{t('cancel')}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
