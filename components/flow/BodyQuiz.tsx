'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { QUIZ_BODY_TYPES, type QuizBodyType } from '@/lib/contracts/bodyTypes'
import { useLookup } from '@/components/flow/LookupProvider'
import { Button } from '@/components/ui/button'

type QuizResult = {
  actual_types: QuizBodyType[]
  missed_types: QuizBodyType[]
  incorrect_types: QuizBodyType[]
  correct_count: number
  score_percent: number | null
  hoa_note: boolean
  unsure: boolean
  demo: boolean
}

export function BodyQuiz() {
  const t = useTranslations('BodyQuiz')
  const locale = useLocale()
  const { state } = useLookup()
  const [selected, setSelected] = useState<QuizBodyType[]>([])
  const [unsure, setUnsure] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  if (state.status !== 'done') return null
  const lookupData = state.data

  function toggle(type: QuizBodyType) {
    setUnsure(false)
    setSelected((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type])
  }

  async function submit() {
    if (busy || (!unsure && selected.length === 0)) return
    setBusy(true)
    setError(false)
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodies_token: lookupData.bodies_token,
          selected_types: selected,
          unsure,
          uncovered_types: (lookupData.uncovered ?? []).map((item) => item.type),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error('quiz request failed')
      setResult(payload as QuizResult)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-12 rounded-[28px] bg-white p-5 ring-1 ring-border md:p-8" aria-labelledby="body-quiz-title">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('eyebrow')}</p>
        <h2 id="body-quiz-title" className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('intro')}</p>
      </div>

      {!result ? (
        <>
          <fieldset className="mt-6 grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">{t('title')}</legend>
            {QUIZ_BODY_TYPES.map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-3 text-sm font-medium text-ink has-checked:border-primary has-checked:bg-primary/5">
                <input
                  type="checkbox"
                  checked={selected.includes(type)}
                  disabled={unsure}
                  onChange={() => toggle(type)}
                  className="size-4 accent-primary"
                />
                {t(`types.${type}`)}
              </label>
            ))}
          </fieldset>
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={unsure}
              onChange={(event) => {
                setUnsure(event.target.checked)
                if (event.target.checked) setSelected([])
              }}
              className="size-4 accent-primary"
            />
            {t('notSure')}
          </label>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={busy || (!unsure && selected.length === 0)}>
              {busy ? t('working') : t('submit')}
            </Button>
            {error && <p role="alert" className="text-sm font-semibold text-brick">{t('error')}</p>}
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-4" aria-live="polite">
          <p className="text-lg font-bold text-ink">
            {result.score_percent === null ? t('noScore') : t('score', { score: result.score_percent, correct: result.correct_count })}
          </p>
          {result.missed_types.length > 0 && <p className="text-sm"><strong>{t('missed')}:</strong> {result.missed_types.map((type) => t(`types.${type}`)).join(', ')}</p>}
          {result.incorrect_types.length > 0 && <p className="text-sm"><strong>{t('incorrect')}:</strong> {result.incorrect_types.map((type) => t(`types.${type}`)).join(', ')}</p>}
          {result.hoa_note && <p className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground">{t('hoaNote')}</p>}
          <p className="text-sm"><strong>{t('actual')}:</strong> {result.actual_types.map((type) => t(`types.${type}`)).join(', ')}</p>
          {result.demo && <p className="text-xs text-muted-foreground">{t('demo')}</p>}
          <p className="text-xs text-muted-foreground">{locale === 'es' ? t('privacyEs') : t('privacy')}</p>
        </div>
      )}
    </section>
  )
}
