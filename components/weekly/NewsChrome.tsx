import { Info } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Shared pieces for P3's news surfaces (weekly page, timeline, item pages).
// News surfaces may use font-headline and font-news (DESIGN.md §3).

/** Adds the reader's bodies_token to a link, so moving between news pages keeps their governments. */
export function withToken(path: string, token?: string | null) {
  if (!token) return path
  return `${path}${path.includes('?') ? '&' : '?'}t=${encodeURIComponent(token)}`
}

export async function NewsNav({ active, token }: { active: 'weekly' | 'timeline' | 'alerts'; token?: string | null }) {
  const t = await getTranslations('News')
  const links = [
    { key: 'weekly', href: withToken('/weekly', token), label: t('thisWeek') },
    { key: 'timeline', href: withToken('/timeline', token), label: t('latest') },
    { key: 'alerts', href: '/alerts', label: t('alerts') },
  ] as const
  return (
    <nav aria-label={t('nav')} className="flex gap-6 border-b border-border font-news text-sm font-semibold">
      {links.map((l) => (
        <Link
          key={l.key}
          href={l.href}
          aria-current={active === l.key ? 'page' : undefined}
          className={cn(
            'relative -mb-px border-b-[3px] border-transparent pb-2.5 text-muted-foreground hover:text-ink',
            active === l.key && 'border-brick text-ink',
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

export async function SampleNotice({ className }: { className?: string }) {
  const t = await getTranslations('News')
  return (
    <p className={cn('flex items-start gap-2 rounded-2xl bg-sand px-4 py-3 font-sans text-sm text-sand-deep', className)}>
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      {t('sample')}
    </p>
  )
}

export async function NeedAddress({ reason }: { reason: 'no_token' | 'bad_token' }) {
  const t = await getTranslations('News')
  return (
    <div className="mx-auto max-w-xl py-16 text-center font-sans">
      <h1 className="text-[2rem] font-extrabold tracking-tight text-ink">{t('needAddressTitle')}</h1>
      <p className="mt-3 text-muted-foreground">{reason === 'bad_token' ? t('badLink') : t('needAddressBody')}</p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/">{t('needAddressButton')}</Link>
      </Button>
    </div>
  )
}

/** "Written with AI…" for AI stories, and always the official source link. */
export async function StorySource({ source, url, className }: { source: 'ai' | 'template' | null | undefined; url: string; className?: string }) {
  const t = await getTranslations('News')
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {source === 'ai' && <span>{t('aiLabel')} · </span>}
      <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-denim underline-offset-2 hover:underline">
        {t('source')}
      </a>
    </p>
  )
}
