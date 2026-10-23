import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAccount, loadSavedProfile, saveProfile } from '@/lib/account'
import { getOptionalEnv } from '@/lib/env'
import { BODIES_COOKIE, BODIES_COOKIE_MAX_AGE } from '@/lib/prototype/liveData'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signBodiesToken, verifyBodiesToken } from '@/lib/tokens'

// GET /auth/callback?code=…: finishes Google sign-in.
//   - Saved governments on the account: restore them on this browser and open the dashboard.
//   - None saved, but this browser has guest ones: save those to the account.
//   - Neither: ask for the address (the governments are saved once the lookup finishes).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/signin?error=failed', url))
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL('/signin?error=failed', url))
  const account = await getAccount()
  if (!account) return NextResponse.redirect(new URL('/signin?error=failed', url))

  const jar = await cookies()
  const secure = url.protocol === 'https:'
  const saved = await loadSavedProfile(account.id)
  if (saved?.bodyIds.length && getOptionalEnv('BODIES_TOKEN_SECRET')) {
    jar.set(BODIES_COOKIE, signBodiesToken(saved.bodyIds), { httpOnly: true, sameSite: 'lax', secure, maxAge: BODIES_COOKIE_MAX_AGE, path: '/' })
    if (saved.stakes.length) jar.set(STAKES_COOKIE, saved.stakes.join(','), { sameSite: 'lax', secure, maxAge: BODIES_COOKIE_MAX_AGE, path: '/' })
    return NextResponse.redirect(new URL('/app', url))
  }
  const guestIds = verifyBodiesToken(jar.get(BODIES_COOKIE)?.value)
  if (guestIds?.length) {
    // Best effort: if saving fails (say, the table isn't migrated yet), this browser still has them.
    await saveProfile(account.id, { bodyIds: guestIds, stakes: parseStakes(jar.get(STAKES_COOKIE)?.value) }).catch(() => {})
    return NextResponse.redirect(new URL('/app', url))
  }
  return NextResponse.redirect(new URL('/?welcome=1', url))
}
