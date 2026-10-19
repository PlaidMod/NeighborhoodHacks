import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getEnv } from '@/lib/env'
import { authCookieOptions } from './cookieOptions'

/**
 * A Supabase client that acts as the signed-in team member (admin sign-in only).
 * It uses the publishable key, so row level security still applies. Admin pages read
 * data with db() after requireAdmin(). Create a new client for every request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Called from a Server Component, which can't set cookies. proxy.ts refreshes the session instead.
        }
      },
    },
  })
}
