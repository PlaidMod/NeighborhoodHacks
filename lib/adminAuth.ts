import { notFound, redirect } from 'next/navigation'
import { adminEmails } from '@/lib/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** True when the email is on the ADMIN_EMAILS allowlist, ignoring case and spaces. */
export function isAdminEmail(email: string | null | undefined, allow: string[] = adminEmails()): boolean {
  if (!email) return false
  return allow.includes(email.trim().toLowerCase())
}

/**
 * Call at the top of every admin page, route handler and server action (a layout check
 * alone isn't enough). Signed out: sends you to the login page. Signed in but not on the
 * allowlist: shows a 404, so the admin area doesn't reveal itself.
 */
export async function requireAdmin(): Promise<{ email: string }> {
  const supabase = await createSupabaseServerClient()
  // getUser() asks the Auth server, so a revoked session is caught.
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  if (!email) redirect('/admin/login')
  if (!isAdminEmail(email)) notFound()
  return { email }
}
