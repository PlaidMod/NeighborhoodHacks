import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { signOut } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { requireAdmin } from '@/lib/adminAuth'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin')
  return { title: t('title'), robots: { index: false } }
}

export default async function AdminHome() {
  const { email } = await requireAdmin()
  const t = await getTranslations('Admin')
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('signedInAs', { email })}</p>
      <p className="mt-6">
        {/* P2 builds /admin/review (the review queue). */}
        <Link href="/admin/review" className="font-semibold text-denim underline underline-offset-2">
          {t('reviewLink')}
        </Link>
      </p>
      <form action={signOut} className="mt-8">
        <Button type="submit" variant="outline">
          {t('signOut')}
        </Button>
      </form>
    </main>
  )
}
