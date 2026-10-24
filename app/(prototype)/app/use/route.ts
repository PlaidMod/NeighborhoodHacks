import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAccount, saveProfile } from '@/lib/account'
import { getOptionalEnv } from '@/lib/env'
import { BODIES_COOKIE, BODIES_COOKIE_MAX_AGE } from '@/lib/prototype/liveData'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { verifyBodiesToken } from '@/lib/tokens'

// /app/use?t=<bodies_token>: remembers the reader's governments on this browser (guest mode) and
// opens the dashboard. Signed in with Google, it also saves them to the account. /app/use?forget=1
// goes back to the demo. The token holds body IDs only.

export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.has('forget')) {
    const res = NextResponse.redirect(new URL('/app', url))
    res.cookies.delete(BODIES_COOKIE)
    return res
  }
  const destination = url.searchParams.get('onboarding') === '1' ? '/app?onboarding=1' : '/app'
  const res = NextResponse.redirect(new URL(destination, url))
  const token = url.searchParams.get('t') ?? ''
  // Without BODIES_TOKEN_SECRET (a local preview) the lookup can't sign, and P3's sample data is shown.
  const ids = getOptionalEnv('BODIES_TOKEN_SECRET') ? verifyBodiesToken(token) : token === 'unsigned-preview' ? [] : null
  if (!ids) return NextResponse.redirect(new URL('/', url))
  res.cookies.set(BODIES_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: BODIES_COOKIE_MAX_AGE, path: '/' })
  const account = ids.length ? await getAccount() : null
  if (account) {
    const stakes = parseStakes((await cookies()).get(STAKES_COOKIE)?.value)
    await saveProfile(account.id, { bodyIds: ids, stakes }).catch(() => {
      // Saving is a bonus; the dashboard still opens with this browser's copy.
    })
  }
  return res
}
