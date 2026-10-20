import { NextResponse } from 'next/server'
import { getOptionalEnv } from '@/lib/env'
import { BODIES_COOKIE } from '@/lib/prototype/liveData'
import { verifyBodiesToken } from '@/lib/tokens'

// /app/use?t=<bodies_token>: remembers the reader's governments for the /app screens and opens
// the dashboard. /app/use?forget=1 goes back to the demo. The token holds body IDs only.

const MONTH = 60 * 60 * 24 * 30

export function GET(req: Request) {
  const url = new URL(req.url)
  const res = NextResponse.redirect(new URL('/app', url))
  if (url.searchParams.has('forget')) {
    res.cookies.delete(BODIES_COOKIE)
    return res
  }
  const token = url.searchParams.get('t') ?? ''
  // Without BODIES_TOKEN_SECRET (a local preview) the stand-in lookup can't sign, and P3's sample data is shown.
  const ok = getOptionalEnv('BODIES_TOKEN_SECRET') ? verifyBodiesToken(token) !== null : token === 'unsigned-preview'
  if (!ok) return NextResponse.redirect(new URL('/', url))
  res.cookies.set(BODIES_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: MONTH, path: '/' })
  return res
}
