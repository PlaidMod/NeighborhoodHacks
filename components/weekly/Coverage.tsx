'use client'

import { AlertTriangle, ChevronRight, ExternalLink } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import type { Coverage as CoverageData } from '@/lib/perspectives/types'
import { cn } from '@/lib/utils'

// "What news coverage says" (perspectives spec §7): a collapsed disclosure under a weekly
// story. English only for now; Spanish pages show a note above it (N13).

export function Coverage({ coverage, className }: { coverage: CoverageData | null | undefined; className?: string }) {
  const t = useTranslations('Coverage')
  const format = useFormatter()
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const panel = useId()
  const c = coverage
  const date = (iso: string) => format.dateTime(new Date(iso), { month: 'short', day: 'numeric' })

  if (!c || c.state === 'none') {
    return <p className={cn('font-sans text-xs text-muted-foreground', className)}>{t('none')}</p>
  }

  const link = (url: string, children: React.ReactNode) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-denim underline-offset-2 hover:underline">
      {children}
      <ExternalLink aria-hidden className="size-3" />
    </a>
  )

  return (
    <div className={cn('font-sans', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-ink hover:text-denim focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronRight aria-hidden className={cn('size-4 transition-transform', open && 'rotate-90')} />
        {c.state === 'ok'
          ? t('toggle', { outlets: c.outlet_count, viewpoints: c.viewpoint_count })
          : t('toggleSources', { outlets: c.outlet_count })}
      </button>

      {open && (
        <div id={panel} lang="en" className="mt-3 space-y-4 rounded-2xl bg-white p-4 text-sm ring-1 ring-border">
          {/* The panel is English, but this note is Spanish: lang="es" makes screen readers switch voices. */}
          {locale === 'es' && (
            <p lang="es" className="text-xs font-semibold text-sand-deep">
              {t('englishOnly')}
            </p>
          )}
          {c.state === 'sources_only' && <p>{t('sourcesOnly')}</p>}
          {c.groups.map((g) => (
            <div key={g.label_en}>
              <p className="font-bold">{g.label_en}</p>
              <ul className="mt-1 space-y-2">
                {g.arguments.map((a) => (
                  <li key={a.quote} className="border-l-2 border-border pl-3">
                    <p>{a.summary_en}</p>
                    <p className="mt-0.5 [overflow-wrap:anywhere] text-muted-foreground">
                      “{a.quote}” — {link(a.url, `${a.outlet}, ${date(a.published_at)}`)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {c.one_sided && c.state === 'ok' && (
            <p className="flex gap-2 rounded-xl bg-sand p-3 text-sand-deep">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t('oneSided')}
            </p>
          )}
          <div>
            <p className="font-bold">{t('sources')}</p>
            <ul className="mt-1 space-y-1">
              {c.sources.map((s) => (
                <li key={s.url} className="[overflow-wrap:anywhere]">
                  {s.outlet}: {link(s.url, `“${s.headline}”`)} · {date(s.published_at)}
                </li>
              ))}
            </ul>
          </div>
          {c.state === 'ok' && <p className="text-xs text-muted-foreground">{t('label')}</p>}
        </div>
      )}
    </div>
  )
}
