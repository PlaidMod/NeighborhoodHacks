import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/civic'
import { Button } from '@/components/ui/button'
import { LanguageToggle } from './LanguageToggle'

export async function SiteHeader() {
  const t = await getTranslations('Shell')
  return (
    <header className="public-site-header border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl 2xl:max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 md:px-8">
        <Logo />
        <nav aria-label={t('navLabel')} className="flex items-center gap-3">
          {/* Hidden on phones: the header would scroll sideways at 390px, and the page itself offers this action. */}
          <Button asChild size="sm" className="hidden rounded-full px-4 sm:inline-flex">
            <Link href="/address" transitionTypes={['nav-forward']}>
              {t('findGovernments')}
            </Link>
          </Button>
          <Link href="/about" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
            {t('about')}
          </Link>
          <LanguageToggle />
        </nav>
      </div>
    </header>
  )
}
