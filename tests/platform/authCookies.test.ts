import { describe, expect, it } from 'vitest'
import { authCookieOptions } from '@/lib/supabase/cookieOptions'

describe('admin sign-in cookie options', () => {
  it('are httpOnly, sameSite lax and Secure in production', () => {
    expect(authCookieOptions('production')).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
  })

  it('are not Secure in development, so http://localhost still works', () => {
    expect(authCookieOptions('development')).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/' })
  })
})
