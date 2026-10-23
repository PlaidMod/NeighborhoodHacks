import { notFound, redirect } from 'next/navigation'
import { adminEmails } from '@/lib/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** True when the email is on the ADMIN_EMAILS allowlist, ignoring case and spaces. */
export function isAdminEmail(email: string | null | undefined, allow: string[] = adminEmails()): boolean {
  if (!email) return false
  return allow.includes(email.trim().toLowerCase())
}

/** True when the session's sign-in methods (the JWT's `amr` claim) include the password. */
export function signedInWithPassword(claims: unknown): boolean {
  const amr = (claims as { amr?: unknown } | null | undefined)?.amr
  return Array.isArray(amr) && amr.some((m) => (m as { method?: unknown })?.method === 'password')
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
  // Readers can sign in with Google (lib/account.ts) on the same Supabase project. The admin area
  // still needs the team password: a Google session for an allowlisted email doesn't open it.
  const { data: session } = await supabase.auth.getClaims()
  if (!signedInWithPassword(session?.claims)) redirect('/admin/login')
  return { email }
}
