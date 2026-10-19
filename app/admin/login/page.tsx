import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from '@/components/admin/LoginForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin')
  return { title: t('loginTitle'), robots: { index: false } }
}

export default async function AdminLoginPage() {
  const t = await getTranslations('Admin')
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('loginTitle')}</h1>
      <p className="mt-2 text-muted-foreground">{t('loginIntro')}</p>
      <LoginForm />
    </main>
  )
}
