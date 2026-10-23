import { getTranslations } from 'next-intl/server'
import { LookupProvider } from '@/components/flow/LookupProvider'
import { SiteFooter } from '@/components/shell/SiteFooter'
import { SiteHeader } from '@/components/shell/SiteHeader'

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations('Shell')
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only fixed top-3 left-3 z-[100] rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        {t('skip')}
      </a>
      <SiteHeader />
      {/* Keeps the address lookup alive across home → stake picker → results. */}
      <div className="flex-1">
        <LookupProvider>{children}</LookupProvider>
      </div>
      <SiteFooter />
    </div>
  )
}
