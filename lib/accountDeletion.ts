import type { Account } from '@/lib/account'

// "Delete my account" (Oct 23, 2026). A reader who signed in with Google can delete their account
// from the account menu. Deleting the Supabase user also deletes their account_profiles row
// (on delete cascade), which is everything we save for an account (tech plan §19).

export type DeleteCheck = { ok: true; userId: string } | { ok: false; reason: 'signed_out' | 'admin' | 'cross_site' }

/**
 * Decides whether a POST to /auth/delete may delete the signed-in account.
 * The request must come from this site (Origin header, and the browser's Sec-Fetch-Site).
 * Team admin accounts are refused: the team removes those by hand, so nobody locks the team out.
 */
export function checkDeleteRequest(input: {
  account: Account | null
  isAdmin: boolean
  origin: string | null
  requestOrigin: string
  fetchSite: string | null
}): DeleteCheck {
  if (!input.origin || input.origin !== input.requestOrigin || input.fetchSite === 'cross-site') return { ok: false, reason: 'cross_site' }
  if (!input.account) return { ok: false, reason: 'signed_out' }
  if (input.isAdmin) return { ok: false, reason: 'admin' }
  return { ok: true, userId: input.account.id }
}

/**
 * Deletes the user, then signs this browser out. If deleting fails, the reader stays signed in
 * so they can try again. Signing out after the user is gone can fail on the Auth server; the
 * account is already deleted then, so that still counts as success.
 */
export async function deleteAccount(
  userId: string,
  deps: { deleteUser: (id: string) => Promise<{ error: unknown }>; signOut: () => Promise<unknown> },
): Promise<boolean> {
  const { error } = await deps.deleteUser(userId)
  if (error) return false
  try {
    await deps.signOut()
  } catch {
    // The user is already deleted, and the route clears this browser's cookies anyway.
  }
  return true
}
