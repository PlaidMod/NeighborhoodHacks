import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { LanguageToggle } from '@/components/shell/LanguageToggle'
import { StakePicker } from '@/components/stake/StakePicker'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Stake')
  return { title: t('metaTitle') }
}

export default async function StakePage() {
  const t = await getTranslations('Stake')
  const initial = parseStakes((await cookies()).get(STAKES_COOKIE)?.value)
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em] text-ink md:text-[2.6rem]">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-[38rem] text-lg text-muted-foreground">{t('lede')}</p>
      <div className="mt-8">
        <StakePicker initial={initial} language={<LanguageToggle />} />
      </div>
    </main>
  )
}
