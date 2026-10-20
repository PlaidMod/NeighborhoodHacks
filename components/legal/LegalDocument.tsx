import { getTranslations } from 'next-intl/server'
import { CONTACT_URL } from '@/lib/brand'

type Props = {
  /** Which document under the Legal namespace: privacy or terms. */
  doc: 'privacy' | 'terms'
  /** Section keys, in display order. Each has a title and a body in the message files. */
  sections: readonly string[]
}

/** Renders a privacy or terms page from the message files, in the visitor's language. */
export async function LegalDocument({ doc, sections }: Props) {
  const t = await getTranslations('Legal')
  return (
    <main id="main" className="mx-auto max-w-prose px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{t(`${doc}.title`)}</h1>
      <p className="mt-2 text-sm">{t(`${doc}.effective`)}</p>
      <p className="mt-6">{t(`${doc}.intro`)}</p>
      {sections.map((key) => (
        <section key={key} className="mt-8">
          <h2 className="text-xl font-bold">{t(`${doc}.${key}.title`)}</h2>
          <p className="mt-2">{t(`${doc}.${key}.body`)}</p>
        </section>
      ))}
      <section className="mt-8">
        <h2 className="text-xl font-bold">{t('contactTitle')}</h2>
        <p className="mt-2">
          {t('contactBody')}{' '}
          <a className="break-all underline underline-offset-2" href={CONTACT_URL}>
            {CONTACT_URL}
          </a>
        </p>
      </section>
    </main>
  )
}
