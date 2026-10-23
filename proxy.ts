import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getOptionalEnv } from '@/lib/env'
import { authCookieOptions } from '@/lib/supabase/cookieOptions'

// Next.js 16 request hook (formerly middleware). It only refreshes the Supabase sign-in
// session: the admin one on /admin pages, and the optional Google one (lib/account.ts) on the
// home page and the /app screens. It must never match /api: a redirect there would silently
// break the cron jobs.

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = getOptionalEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  // Without sign-in configured (a local preview) there is no session to refresh.
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        // Cache headers so a CDN never serves one person's session cookie to someone else.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })

  // Refreshes the session token if it's close to expiring. Call it right after creating the client.
  await supabase.auth.getClaims()
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/app/:path*', '/'],
}
