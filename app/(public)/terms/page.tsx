import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LegalDocument } from '@/components/legal/LegalDocument'

const SECTIONS = ['info', 'neutral', 'speakUp', 'conduct', 'alerts', 'asIs'] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Legal.terms')
  return { title: t('metaTitle') }
}

export default function TermsPage() {
  return <LegalDocument doc="terms" sections={SECTIONS} />
}
