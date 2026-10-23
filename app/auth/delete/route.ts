import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAccount } from '@/lib/account'
import { checkDeleteRequest, deleteAccount } from '@/lib/accountDeletion'
import { isAdminEmail } from '@/lib/adminAuth'
import { db } from '@/lib/db'
import { BODIES_COOKIE } from '@/lib/prototype/liveData'
import { STAKES_COOKIE } from '@/lib/stakes'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST /auth/delete: deletes the signed-in Google account and everything saved with it, from the
// confirm page at /account/delete. Then it signs out and makes this browser forget its governments
// (the form already cleared the saved address). See lib/accountDeletion.ts.
export async function POST(req: Request) {
  const url = new URL(req.url)
  const account = await getAccount()
  const check = checkDeleteRequest({
    account,
    isAdmin: isAdminEmail(account?.email),
    origin: req.headers.get('origin'),
    requestOrigin: url.origin,
    fetchSite: req.headers.get('sec-fetch-site'),
  })
  if (!check.ok) {
    const to = check.reason === 'signed_out' ? '/signin' : `/account/delete?error=${check.reason}`
    return NextResponse.redirect(new URL(to, url), { status: 303 })
  }

  const supabase = await createSupabaseServerClient()
  const deleted = await deleteAccount(check.userId, {
    deleteUser: (id) => db().auth.admin.deleteUser(id),
    signOut: () => supabase.auth.signOut(),
  })
  if (!deleted) return NextResponse.redirect(new URL('/account/delete?error=failed', url), { status: 303 })

  const jar = await cookies()
  jar.delete(BODIES_COOKIE)
  jar.delete(STAKES_COOKIE)
  return NextResponse.redirect(new URL('/?deleted=1', url), { status: 303 })
}
