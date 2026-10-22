'use client'

import { BellOff, BellRing, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'

// Browser notifications (Technical Plan §11, Oct 22 addition): consent → the browser's
// permission prompt → a push subscription saved with the reader's governments. No phone
// number. The service worker that shows the notifications is public/sw.js.

type State = 'checking' | 'unsupported' | 'ios_install' | 'denied' | 'off' | 'on' | 'preview'

const ERRORS = ['consent', 'parent_consent_required', 'no_bodies', 'rate_limited', 'permission'] as const

/** The VAPID public key, decoded from base64url into the bytes PushManager.subscribe() expects. */
function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  return (await registration?.pushManager.getSubscription()) ?? null
}

export function PushSignup({ token, vapidKey }: { token: string | null; vapidKey: string | null }) {
  const t = useTranslations('Push')
  const lang = useLocale() === 'es' ? 'es' : 'en'
  const ids = { consent: useId(), minor: useId(), parent: useId(), error: useId(), title: useId() }
  const [state, setState] = useState<State>('checking')
  const [consent, setConsent] = useState(false)
  const [minor, setMinor] = useState(false)
  const [parent, setParent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const errorText = (code: string) => t(`errors.${(ERRORS as readonly string[]).includes(code) ? code : 'generic'}`)

  useEffect(() => {
    let cancelled = false
    const settle = (next: State) => !cancelled && setState(next)
    ;(async () => {
      // iPhone and iPad Safari expose push only to sites opened from the Home Screen.
      if (!pushSupported()) return settle(isIos() ? 'ios_install' : 'unsupported')
      if (Notification.permission === 'denied') return settle('denied')
      try {
        // Registered up front, so the click only has to ask permission and subscribe.
        await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        settle((await currentSubscription()) ? 'on' : 'off')
      } catch {
        settle('unsupported')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function turnOn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!consent) return setError(errorText('consent'))
    if (minor && !parent) return setError(errorText('parent_consent_required'))
    if (!token) return setError(errorText('no_bodies'))
    if (!vapidKey) return setState('preview')
    if (!('Notification' in window)) return setState('unsupported')
    setBusy(true)
    let subscription: PushSubscription | null = null
    try {
      // Ask first, while the click still counts as the reader's action (Safari requires it).
      const permission = await Notification.requestPermission()
      if (permission === 'denied') return setState('denied')
      if (permission !== 'granted') return setError(errorText('permission'))
      const registration = await navigator.serviceWorker.ready
      subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) })
      }
      const res = await fetch('/api/alerts/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), t: token, lang, consent: true, is_minor: minor, parent_consent: parent }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; preview?: boolean }
      if (res.ok && json.preview) {
        await subscription.unsubscribe()
        setState('preview')
      } else if (res.ok) {
        setState('on')
      } else {
        // Not saved on our side, so don't leave the browser subscribed either.
        await subscription.unsubscribe()
        setError(errorText(json.error ?? 'generic'))
      }
    } catch {
      await subscription?.unsubscribe().catch(() => undefined)
      setError(errorText('generic'))
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setError(null)
    setBusy(true)
    try {
      const subscription = await currentSubscription()
      if (subscription) {
        const res = await fetch('/api/alerts/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        if (!res.ok) throw new Error('unsubscribe failed')
        await subscription.unsubscribe()
      }
      setState('off')
    } catch {
      setError(errorText('generic'))
    } finally {
      setBusy(false)
    }
  }

  const errorBox = error && (
    <p id={ids.error} role="alert" className="text-sm font-semibold text-brick">
      {error}
    </p>
  )

  // The wrapper below is the live region, so these don't add their own role.
  const notice = (tone: 'info' | 'done', title: string, body: string) => (
    <div className={tone === 'done' ? 'flex gap-3 rounded-2xl bg-sage-soft p-4 text-sage' : 'flex gap-3 rounded-2xl bg-sand p-4 text-sand-deep'}>
      {tone === 'done' ? <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" /> : <Info aria-hidden className="mt-0.5 size-5 shrink-0" />}
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm">{body}</p>
      </div>
    </div>
  )

  let content: React.ReactNode
  if (state === 'checking') {
    content = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden className="size-4 animate-spin" /> {t('checking')}
      </p>
    )
  } else if (state === 'unsupported') {
    content = notice('info', t('unsupportedTitle'), t('unsupportedBody'))
  } else if (state === 'ios_install') {
    content = notice('info', t('iosTitle'), t('iosBody'))
  } else if (state === 'denied') {
    content = notice('info', t('deniedTitle'), t('deniedBody'))
  } else if (state === 'preview') {
    content = notice('info', t('previewTitle'), t('previewBody'))
  } else if (state === 'off' && !token) {
    content = <p className="text-sm font-semibold">{t('needLookup')}</p>
  } else if (state === 'on') {
    content = (
      <div className="space-y-4">
        {notice('done', t('onTitle'), t('onBody'))}
        {errorBox}
        <Button type="button" variant="ghost" onClick={turnOff} disabled={busy}>
          {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <BellOff data-icon="inline-start" />}
          {t('turnOff')}
        </Button>
      </div>
    )
  } else {
    content = (
      <form onSubmit={turnOn} className="space-y-5" noValidate>
        <label htmlFor={ids.consent} className="flex items-start gap-3 text-sm">
          <input
            id={ids.consent}
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked)
              setError(null)
            }}
            aria-describedby={error ? ids.error : undefined}
            className="mt-0.5 size-5 shrink-0 accent-denim"
          />
          <span className="text-muted-foreground">{t('consent')}</span>
        </label>

        <div className="space-y-3 rounded-2xl bg-surface p-4">
          <label htmlFor={ids.minor} className="flex items-center gap-3 text-sm font-semibold">
            <input
              id={ids.minor}
              type="checkbox"
              checked={minor}
              onChange={(e) => {
                setMinor(e.target.checked)
                setError(null)
              }}
              className="size-5 accent-denim"
            />
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
              <p className="text-xs text-muted-foreground">{t('minorNote')}</p>
            </>
          )}
        </div>

        {errorBox}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <BellRing data-icon="inline-start" />}
          {t('turnOn')}
        </Button>
        {!vapidKey && <p className="text-xs text-muted-foreground">{t('previewTitle')}</p>}
      </form>
    )
  }

  return (
    <section aria-labelledby={ids.title} className="space-y-4">
      <div>
        <h2 id={ids.title} className="text-lg font-bold">
          {t('title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('lede')}</p>
      </div>
      <div aria-live="polite">{content}</div>
    </section>
  )
}
