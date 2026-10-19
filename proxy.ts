import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getEnv } from '@/lib/env'

// Next.js 16 request hook (formerly middleware). It only refreshes the admin sign-in
// session, so it runs on /admin pages and nowhere else. It must never match /api:
// a redirect there would silently break the cron jobs.

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
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
  matcher: ['/admin/:path*'],
}
