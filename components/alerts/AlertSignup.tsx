'use client'

import { CheckCircle2, Info, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Step = 'phone' | 'code' | 'done' | 'preview'

const ERRORS = ['invalid_phone', 'consent', 'parent_consent_required', 'wrong_code', 'rate_limited', 'no_bodies'] as const

function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/** Opt-in for texts (Technical Plan §11): phone and consent → Twilio Verify code → confirmed. */
export function AlertSignup({ token, preview }: { token: string | null; preview: boolean }) {
  const t = useTranslations('Alerts')
  const locale = useLocale()
  const ids = { phone: useId(), code: useId(), consent: useId(), minor: useId(), parent: useId(), error: useId() }
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [consent, setConsent] = useState(false)
  const [minor, setMinor] = useState(false)
  const [parent, setParent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const lang = locale === 'es' ? 'es' : 'en'
  const errorText = (code: string) => t(`errors.${(ERRORS as readonly string[]).includes(code) ? code : 'generic'}`)

  async function post(path: string, body: object) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = (await res.json().catch(() => ({}))) as { error?: string; preview?: boolean }
    return { ok: res.ok, ...json }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (phone.replace(/\D/g, '').length !== 10) return setError(errorText('invalid_phone'))
    if (!consent) return setError(errorText('consent'))
    if (minor && !parent) return setError(errorText('parent_consent_required'))
    setBusy(true)
    try {
      const r = await post('/api/alerts/subscribe', { phone, lang, consent: true, is_minor: minor, parent_consent: parent })
      if (r.preview) setStep('preview')
      else if (r.ok) setStep('code')
      else setError(errorText(r.error ?? 'generic'))
    } catch {
      setError(errorText('generic'))
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r = await post('/api/alerts/verify', { phone, code, t: token ?? '', lang, is_minor: minor, parent_consent: parent })
      if (r.preview) setStep('preview')
      else if (r.ok) setStep('done')
      else setError(errorText(r.error ?? 'generic'))
    } catch {
      setError(errorText('generic'))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'done') {
    return (
      <div role="status" className="flex gap-3 rounded-[24px] bg-sage-soft p-6 text-sage">
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-bold">{t('doneTitle')}</p>
          <p className="mt-1 text-sm">{t('doneBody')}</p>
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div role="status" className="flex gap-3 rounded-[24px] bg-sand p-6 text-sand-deep">
        <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-bold">{t('previewTitle')}</p>
          <p className="mt-1 text-sm">{t('previewBody')}</p>
        </div>
      </div>
    )
  }

  const errorBox = error && (
    <p id={ids.error} role="alert" className="text-sm font-semibold text-brick">
      {error}
    </p>
  )

  if (step === 'code') {
    return (
      <form onSubmit={verify} className="space-y-4 rounded-[24px] bg-white p-6 ring-1 ring-border" noValidate>
        <div>
          <label htmlFor={ids.code} className="text-sm font-bold">
            {t('codeLabel')}
          </label>
          <p className="text-sm text-muted-foreground">{t('codeHelp', { phone })}</p>
          <input
            id={ids.code}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 10))
              setError(null)
            }}
            aria-invalid={!!error}
            aria-describedby={error ? ids.error : undefined}
            className="mt-2 h-12 w-40 rounded-2xl bg-surface px-4 text-lg font-semibold tracking-[0.3em] ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
          />
        </div>
        {errorBox}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={busy || code.length < 4}>
            {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t('verify')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep('phone')}>
            {t('changeNumber')}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={sendCode} className="space-y-5 rounded-[24px] bg-white p-6 ring-1 ring-border" noValidate>
      <div>
        <label htmlFor={ids.phone} className="text-sm font-bold">
          {t('phoneLabel')}
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface px-4 ring-1 ring-border focus-within:ring-2 focus-within:ring-denim">
          <span aria-hidden className="text-sm font-semibold text-muted-foreground">
            +1
          </span>
          <input
            id={ids.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t('phonePlaceholder')}
            value={phone}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value))
              setError(null)
            }}
            aria-invalid={!!error}
            aria-describedby={error ? ids.error : undefined}
            className="h-12 min-w-0 flex-1 bg-transparent font-semibold outline-none"
          />
        </div>
      </div>

      <label htmlFor={ids.consent} className="flex items-start gap-3 text-sm">
        <input
          id={ids.consent}
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked)
            setError(null)
          }}
          className="mt-0.5 size-5 shrink-0 accent-denim"
        />
        <span className="text-muted-foreground">{t('consent')}</span>
      </label>

      <div className="space-y-3 rounded-2xl bg-surface p-4">
        <label htmlFor={ids.minor} className="flex items-center gap-3 text-sm font-semibold">
          <input id={ids.minor} type="checkbox" checked={minor} onChange={(e) => setMinor(e.target.checked)} className="size-5 accent-denim" />
          {t('minor')}
        </label>
        {minor && (
          <>
            <label htmlFor={ids.parent} className="flex items-start gap-3 text-sm">
              <input
                id={ids.parent}
                type="checkbox"
                checked={parent}
                onChange={(e) => {
                  setParent(e.target.checked)
                  setError(null)
                }}
                className="mt-0.5 size-5 shrink-0 accent-denim"
              />
              {t('parentConsent')}
            </label>
            <p className={cn('text-xs text-muted-foreground')}>{t('minorNote')}</p>
          </>
        )}
      </div>

      {errorBox}
      <Button type="submit" size="lg" disabled={busy}>
        {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {t('sendCode')}
      </Button>
      {preview && <p className="text-xs text-muted-foreground">{t('previewTitle')}</p>}
    </form>
  )
}
