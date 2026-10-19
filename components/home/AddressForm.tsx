'use client'

import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'
import { useLookup } from '@/components/flow/LookupProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateAddress } from '@/lib/address'
import { cn } from '@/lib/utils'

export function AddressForm({ className }: { className?: string }) {
  const t = useTranslations('Home')
  const tLookup = useTranslations('Lookup')
  const { state, start } = useLookup()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<'empty' | 'too_long' | null>(null)
  const inputId = useId()
  const messageId = useId()
  const noteId = useId()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const check = validateAddress(value)
    if (!check.ok) {
      setError(check.reason)
      return
    }
    start(check.value)
    router.push('/stake')
  }

  // A failed lookup from an earlier try (the visitor came back with "Try another address").
  const lookupError = state.status === 'error' ? state.code : null
  const message = error ? t(`errors.${error}`) : lookupError ? tLookup(`errors.${lookupError}`) : null

  return (
    // method="post" keeps the address out of the URL if someone submits before the page's
    // JavaScript loads. After it loads, onSubmit handles everything and nothing is posted.
    <form method="post" onSubmit={onSubmit} noValidate className={className}>
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {t('addressLabel')}
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Input
          id={inputId}
          name="address"
          autoComplete="street-address"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            if (error) setError(null)
          }}
          placeholder={t('addressPlaceholder')}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(message && messageId, noteId)}
          className="h-12 text-base sm:flex-1 md:text-base"
        />
        <Button type="submit" size="lg">
          {t('submit')}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      {message && (
        <p id={messageId} role="alert" className="mt-2 text-sm font-semibold text-brick">
          {message}
        </p>
      )}
      <p id={noteId} className="mt-3 text-sm text-muted-foreground">
        {t('privacyNote')}
      </p>
    </form>
  )
}
