import { NextResponse } from 'next/server'
import { accountsConfigured } from '@/lib/account'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET /auth/google: starts "Sign in with Google" (Supabase Auth, PKCE). Google sends the reader
// back to /auth/callback. If sign-in isn't set up, the reader stays a guest.
export async function GET(req: Request) {
  const url = new URL(req.url)
  if (!accountsConfigured()) return NextResponse.redirect(new URL('/signin?error=unavailable', url))
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: new URL('/auth/callback', url).toString(), skipBrowserRedirect: true },
  })
  if (error || !data.url) return NextResponse.redirect(new URL('/signin?error=unavailable', url))
  return NextResponse.redirect(data.url)
}
