'use client'

import { ArrowRight, GraduationCap, House, KeyRound, Loader2, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveStakes } from '@/app/actions/stakes'
import { useLookup } from '@/components/flow/LookupProvider'
import { Button } from '@/components/ui/button'
import { STAKES, nextAfterStake, type Stake } from '@/lib/stakes'
import { cn } from '@/lib/utils'

const ICONS: Record<Stake, LucideIcon> = {
  student: GraduationCap,
  parent: Users,
  renter: KeyRound,
  homeowner: House,
}

type Props = {
  /** Stakes saved earlier (from the cookie), so a returning visitor sees their choice. */
  initial: Stake[]
  /** The language toggle, rendered on the server and passed in. */
  language: React.ReactNode
}

export function StakePicker({ initial, language }: Props) {
  const t = useTranslations('Stake')
  const tLookup = useTranslations('Lookup')
  const { state } = useLookup()
  const router = useRouter()
  const [selected, setSelected] = useState<Stake[]>(initial)
  const [pending, startTransition] = useTransition()

  function toggle(stake: Stake) {
    setSelected((current) => (current.includes(stake) ? current.filter((s) => s !== stake) : [...current, stake]))
  }

  function go(save: boolean) {
    const next = nextAfterStake(state.status)
    startTransition(async () => {
      if (save) await saveStakes(selected)
      router.push(next)
    })
  }

  return (
    <div>
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t('pickAny')}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {STAKES.map((stake) => {
            const Icon = ICONS[stake]
            const on = selected.includes(stake)
            return (
              <button
                key={stake}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(stake)}
                className={cn(
                  'flex items-start gap-3 rounded-[24px] p-4 text-left transition-colors',
                  on ? 'bg-denim text-white' : 'bg-white text-ink hover:bg-denim-soft',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-2xl',
                    on ? 'bg-white/15 text-white' : 'bg-denim-soft text-denim-deep',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-bold">{t(`stakes.${stake}.label`)}</span>
                  <span className={cn('mt-0.5 block text-sm', on ? 'text-white/90' : 'text-muted-foreground')}>
                    {t(`stakes.${stake}.hint`)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t('firstTimeVoters')}</p>
      </fieldset>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-ink">{t('languageTitle')}</h2>
        <div className="mt-2">{language}</div>
      </div>

      <div aria-live="polite" className="mt-8 min-h-5 text-sm font-semibold">
        {state.status === 'loading' && (
          <span className="inline-flex items-center gap-2 text-denim">
            <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />
            {t('finding')}
          </span>
        )}
        {state.status === 'done' && <span className="text-sage">{t('found')}</span>}
      </div>
      {state.status === 'error' && (
        <p role="alert" className="mt-1 text-sm font-semibold text-brick">
          {tLookup(`errors.${state.code}`)}{' '}
          <Link href="/" className="text-denim underline underline-offset-2">
            {t('tryAnother')}
          </Link>
        </p>
      )}
      {state.status === 'idle' && (
        <p className="mt-1 text-sm text-muted-foreground">
          {t('needAddress')}{' '}
          <Link href="/" className="font-semibold text-denim underline underline-offset-2">
            {t('enterAddress')}
          </Link>
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-5">
        <Button size="lg" onClick={() => go(true)} disabled={pending}>
          {t('continue')}
          <ArrowRight data-icon="inline-end" />
        </Button>
        <button
          type="button"
          onClick={() => go(false)}
          disabled={pending}
          className="text-sm font-semibold text-denim underline-offset-4 hover:underline"
        >
          {t('skip')}
        </button>
      </div>
    </div>
  )
}
