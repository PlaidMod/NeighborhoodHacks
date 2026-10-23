'use client'

import { ArrowRight, Loader2, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLookup } from '@/components/flow/LookupProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateAddress } from '@/lib/address'
import { MIN_STREET_CHARS, formatAddress, splitAddressInput, type StreetSuggestion } from '@/lib/lookup/suggest'
import { readBrowserProfile, rememberBrowserAddress } from '@/lib/prototype/profile-storage'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 250

// The address box, with a dropdown that updates as you type (ARIA combobox pattern).
// Only the street words are sent for suggestions: the house number stays in this browser
// and is added back to the suggestion you pick. See lib/lookup/suggest.ts.

export function AddressForm({ className }: { className?: string }) {
  const t = useTranslations('Home')
  const tLookup = useTranslations('Lookup')
  const { state, start } = useLookup()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<'empty' | 'too_long' | null>(null)
  const [suggestions, setSuggestions] = useState<StreetSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [needsNumber, setNeedsNumber] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipNext = useRef(false)
  const inputId = useId()
  const messageId = useId()
  const noteId = useId()
  const listId = useId()

  useEffect(() => {
    const savedAddress = readBrowserProfile()?.address
    if (savedAddress) {
      skipNext.current = true
      // Hydrate the input from the browser-only profile after the first client render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(savedAddress)
    }
  }, [])

  // Fetch suggestions shortly after typing stops. A newer keystroke cancels the older request,
  // so a slow answer can never replace a newer one.
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false
      return
    }
    const { street } = splitAddressInput(value)
    if (street.length < MIN_STREET_CHARS) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address/suggest?q=${encodeURIComponent(street)}`, { signal: controller.signal })
        const json = (await res.json()) as { suggestions?: StreetSuggestion[] }
        const list = Array.isArray(json.suggestions) ? json.suggestions : []
        setSuggestions(list)
        setActive(-1)
        setOpen(list.length > 0)
      } catch {
        // Aborted or offline: keep what's showing. Typing and submitting still work.
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  function submit(address: string) {
    const check = validateAddress(address)
    if (!check.ok) {
      setError(check.reason)
      return
    }
    setOpen(false)
    rememberBrowserAddress(check.value)
    start(check.value)
    router.push('/stake')
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(value)
  }

  function choose(s: StreetSuggestion) {
    const { number } = splitAddressInput(value)
    const text = formatAddress(s, number)
    skipNext.current = true
    setValue(text)
    setLoading(false)
    setOpen(false)
    setActive(-1)
    setError(null)
    if (number) {
      setNeedsNumber(false)
      submit(text)
    } else {
      // A street, not an address yet: put the cursor at the start so the number can be typed.
      setNeedsNumber(true)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.setSelectionRange(0, 0)
      })
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      choose(suggestions[active]!)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  // A failed lookup from an earlier try (the visitor came back with "Try another address").
  const lookupError = state.status === 'error' ? state.code : null
  const message = error ? t(`errors.${error}`) : lookupError ? tLookup(`errors.${lookupError}`) : null
  const { number: typedNumber } = splitAddressInput(value)

  return (
    // method="post" keeps the address out of the URL if someone submits before the page's
    // JavaScript loads. After it loads, onSubmit handles everything and nothing is posted.
    <form method="post" onSubmit={onSubmit} noValidate className={className}>
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {t('addressLabel')}
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:flex-1">
          <Input
            ref={inputRef}
            id={inputId}
            name="address"
            // Off, so the browser's own address autofill doesn't cover our list.
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
            value={value}
            onChange={(event) => {
              const next = event.target.value
              setValue(next)
              setNeedsNumber(false)
              if (error) setError(null)
              if (splitAddressInput(next).street.length < MIN_STREET_CHARS) {
                // Too little to search on: close the list and drop the old answers.
                setSuggestions([])
                setOpen(false)
                setLoading(false)
              } else {
                setLoading(true)
              }
            }}
            onKeyDown={onKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setOpen(false)}
            placeholder={t('addressPlaceholder')}
            aria-invalid={error ? true : undefined}
            aria-describedby={cn(message && messageId, noteId)}
            className="h-12 pr-10 text-base md:text-base"
          />
          {loading && <Loader2 aria-hidden className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}

          {open && suggestions.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label={t('suggestionsLabel')}
              className="absolute top-full right-0 left-0 z-30 mt-2 max-h-80 overflow-auto overscroll-contain rounded-3xl bg-white p-1.5 shadow-[0_16px_40px_-12px_rgb(27_38_59/0.3)] ring-1 ring-border"
            >
              {suggestions.map((s, i) => (
                <li
                  key={`${s.street}|${s.postcode}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown (not click) so the input's blur doesn't close the list before the choice registers.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(s)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left', i === active && 'bg-denim-soft')}
                >
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <MapPin className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {typedNumber && <span>{typedNumber} </span>}
                      {s.street}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.city}, TX {s.postcode}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" size="lg">
          {t('submit')}
          <ArrowRight data-icon="inline-end" size={16} strokeWidth={2} absoluteStrokeWidth />
        </Button>
      </div>

      {/* Screen readers hear how many suggestions appeared. */}
      <p role="status" aria-live="polite" className="sr-only">
        {open && suggestions.length > 0 ? t('suggestionsCount', { count: suggestions.length }) : ''}
      </p>

      {message && (
        <p id={messageId} role="alert" className="mt-2 text-sm font-semibold text-brick">
          {message}
        </p>
      )}
      {needsNumber && !message && <p className="mt-2 text-sm font-semibold text-denim">{t('addNumber')}</p>}
      <p id={noteId} className="mt-3 text-sm text-muted-foreground">
        {t('privacyNote')}
      </p>
    </form>
  )
}
