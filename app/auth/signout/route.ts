import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { accountsConfigured } from '@/lib/account'
import { BODIES_COOKIE } from '@/lib/prototype/liveData'
import { STAKES_COOKIE } from '@/lib/stakes'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST /auth/signout: signs out and forgets this browser's governments, so the next person on a
// shared computer doesn't see them. The account keeps its saved copy.
export async function POST(req: Request) {
  if (accountsConfigured()) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  }
  const jar = await cookies()
  jar.delete(BODIES_COOKIE)
  jar.delete(STAKES_COOKIE)
  return NextResponse.redirect(new URL('/', req.url), { status: 303 })
}
