import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LegalDocument } from '@/components/legal/LegalDocument'

const SECTIONS = ['address', 'cookies', 'account', 'rateLimits', 'quiz', 'drafts', 'alerts', 'sharing', 'processors', 'news'] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Legal.privacy')
  return { title: t('metaTitle') }
}

export default function PrivacyPage() {
  return <LegalDocument doc="privacy" sections={SECTIONS} />
}
