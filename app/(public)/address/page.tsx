import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { AddressForm } from '@/components/home/AddressForm'
import { GovernmentStack } from '@/components/home/GovernmentStack'

export default async function AddressPage() {
  const [t, home] = await Promise.all([getTranslations('AddressPage'), getTranslations('Home')])

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 pt-8 pb-16 md:px-8 md:pt-12 2xl:max-w-[1440px]">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-denim underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden className="size-4" />
        {t('back')}
      </Link>
      <section className="mt-8 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] xl:gap-20">
        <div>
          <p className="mb-4 text-xs font-extrabold tracking-[0.16em] text-denim uppercase">{t('eyebrow')}</p>
          <h1 className="max-w-[14ch] text-4xl leading-tight font-extrabold tracking-[-0.035em] text-ink md:text-5xl">{t('title')}</h1>
          <p className="mt-4 max-w-[38rem] text-lg leading-relaxed text-muted-foreground">{t('lede')}</p>
          <AddressForm className="mt-8 max-w-[42rem]" />
          <p className="mt-3 text-sm text-muted-foreground">{home('coverage')}</p>
        </div>
        <div className="rounded-[2rem] bg-[#f4f6f9] px-5 py-8 md:px-10 md:py-12 lg:px-8 xl:px-12">
          <GovernmentStack />
        </div>
      </section>
    </main>
  )
}
