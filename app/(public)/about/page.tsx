import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('About')
  return { title: t('metaTitle') }
}

export default async function AboutPage() {
  const t = await getTranslations('About')
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 pt-10 pb-8 md:px-8 2xl:max-w-[1440px]">
      <div className="max-w-prose">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="mt-4 text-lg">{t('pitch')}</p>
        <section className="mt-8">
          <h2 className="text-xl font-bold">{t('storiesTitle')}</h2>
          <p className="mt-2">{t('storiesBody')}</p>
          <p className="mt-2 font-semibold">“{t('storiesLabel')}”</p>
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-bold">{t('sourcesTitle')}</h2>
          <p className="mt-2">{t('sourcesBody')}</p>
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-bold">{t('neutralTitle')}</h2>
          <p className="mt-2">{t('neutralBody')}</p>
        </section>
      </div>
    </main>
  )
}
