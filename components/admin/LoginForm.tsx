'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useId } from 'react'
import { signIn, type SignInState } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const t = useTranslations('Admin')
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, null)
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <div>
        <label htmlFor={emailId} className="text-sm font-semibold text-ink">
          {t('email')}
        </label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          className="mt-2"
          aria-describedby={state ? errorId : undefined}
        />
      </div>
      <div>
        <label htmlFor={passwordId} className="text-sm font-semibold text-ink">
          {t('password')}
        </label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-2"
          aria-describedby={state ? errorId : undefined}
        />
      </div>
      {state && (
        <p id={errorId} role="alert" className="text-sm font-semibold text-brick">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t('signingIn') : t('signIn')}
      </Button>
    </form>
  )
}
