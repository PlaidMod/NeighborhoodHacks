'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BodyIcon } from '@/components/civic'
import { useLookup } from '@/components/flow/LookupProvider'
import { Button } from '@/components/ui/button'
import type { BodyType } from '@/lib/contracts/bodyTypes'

// TEMPORARY results screen. P1 owns /results (the "Who governs you?" question, the four
// result sections, body pages). This lists what the stand-in lookup found so the flow
// from the address box through the stake picker doesn't end in a 404 and the P3 pages can
// be reached with the reader's governments. P1 replaces this file.

type Row = { id: string; name: string; type: BodyType }

const rows = (list: unknown[]): Row[] =>
  list.filter((b): b is Row => typeof b === 'object' && b !== null && typeof (b as Row).id === 'string' && typeof (b as Row).name === 'string')

export default function ResultsPage() {
  const t = useTranslations('Results')
  const tLookup = useTranslations('Lookup')
  const { state, reset } = useLookup()

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16 2xl:max-w-[1440px]">
      <div className="max-w-3xl">
        <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em] text-ink md:text-[2.6rem]">{t('title')}</h1>

        {state.status === 'idle' && (
          <>
            <p className="mt-3 text-lg text-muted-foreground">{t('empty')}</p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/">{t('enterAddress')}</Link>
            </Button>
          </>
        )}

        {state.status === 'loading' && (
          <p role="status" className="mt-6 flex items-center gap-2 text-lg text-muted-foreground">
            <Loader2 aria-hidden className="size-5 animate-spin" /> {t('finding')}
          </p>
        )}

        {state.status === 'error' && (
          <>
            <p role="alert" className="mt-4 text-lg font-semibold text-brick">
              {tLookup(`errors.${state.code}`)}
            </p>
            <Button asChild size="lg" className="mt-6" onClick={reset}>
              <Link href="/">{t('tryAnother')}</Link>
            </Button>
          </>
        )}

        {state.status === 'done' && (
          <>
            <p className="mt-3 text-lg text-muted-foreground">{t('lede')}</p>
            <ul className="mt-8 grid gap-3">
              {rows(state.data.bodies).map((b) => (
                <li key={b.id} className="flex items-center gap-4 rounded-[24px] bg-white p-4 ring-1 ring-border">
                  <BodyIcon type={b.type} />
                  <span className="font-bold text-ink">{b.name}</span>
                </li>
              ))}
            </ul>
            {rows(state.data.not_government).length > 0 && (
              <>
                <h2 className="mt-8 text-sm font-bold text-muted-foreground">{t('notGovernment')}</h2>
                <ul className="mt-3 grid gap-3">
                  {rows(state.data.not_government).map((b) => (
                    <li key={b.id} className="flex items-center gap-4 rounded-[24px] bg-white p-4 ring-1 ring-border">
                      <BodyIcon type={b.type} />
                      <span className="font-bold text-ink">{b.name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-6 text-sm text-muted-foreground">{t('limits')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={`/weekly?t=${encodeURIComponent(state.data.bodies_token)}`}>{t('weekly')}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/alerts?t=${encodeURIComponent(state.data.bodies_token)}`}>{t('alerts')}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
