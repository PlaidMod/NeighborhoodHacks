import { getTranslations } from 'next-intl/server'
import { AddressForm } from '@/components/home/AddressForm'
import { GovernmentStack } from '@/components/home/GovernmentStack'

export default async function Home() {
  const t = await getTranslations('Home')
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-12 md:py-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h1 className="text-[2.6rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink md:text-[3.4rem]">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-[34rem] text-lg text-muted-foreground">{t('lede')}</p>
          <AddressForm className="mt-8 max-w-[34rem]" />
          <p className="mt-4 text-sm text-muted-foreground">{t('coverage')}</p>
        </div>
        <GovernmentStack />
      </div>
    </main>
  )
}
