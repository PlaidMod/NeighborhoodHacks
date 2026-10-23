import 'server-only'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { getOptionalEnv } from '@/lib/env'
import { isStake, type Stake } from '@/lib/stakes'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyBodiesToken } from '@/lib/tokens'

// Optional accounts (Oct 22, 2026). Guests keep their governments in the showup_bodies cookie;
// people who sign in with Google also get them saved in account_profiles, so they follow them to
// other devices. Only body IDs and stakes are saved: never an address (tech plan §19).

export type Account = { id: string; email: string | null; name: string | null; avatar: string | null }
export type SavedProfile = { bodyIds: string[]; stakes: Stake[] }

/** Sign-in needs the publishable key; without it (a local preview) everyone is a guest. */
export function accountsConfigured() {
  return !!(getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL') && getOptionalEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'))
}

/** The signed-in person, or null for a guest. Never throws: a broken session just means "guest". */
export async function getAccount(): Promise<Account | null> {
  if (!accountsConfigured()) return null
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const u = data.user
    if (!u) return null
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>
    const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
    return { id: u.id, email: u.email ?? null, name: str(meta.full_name) ?? str(meta.name), avatar: str(meta.avatar_url) ?? str(meta.picture) }
  } catch {
    return null
  }
}

/** True when Google sign-in is turned on in the Supabase project. Checked at most every 5 minutes. */
export async function googleEnabled(): Promise<boolean> {
  const url = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = getOptionalEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  if (!url || !key) return false
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, next: { revalidate: 300 } })
    if (!res.ok) return false
    const json = (await res.json()) as { external?: { google?: boolean } }
    return json.external?.google === true
  } catch {
    return false
  }
}

export async function loadSavedProfile(userId: string): Promise<SavedProfile | null> {
  const { data, error } = await db().from('account_profiles').select('body_ids, stakes').eq('user_id', userId).maybeSingle()
  if (error || !data) return null
  return { bodyIds: data.body_ids, stakes: data.stakes.filter(isStake) }
}

export async function saveProfile(userId: string, profile: SavedProfile): Promise<void> {
  const { error } = await db()
    .from('account_profiles')
    .upsert({ user_id: userId, body_ids: profile.bodyIds, stakes: profile.stakes, updated_at: new Date().toISOString() })
  if (error) throw new Error('Could not save your governments')
}

/** True when this browser remembers a valid set of governments (guest mode or after sign-in). */
export async function hasRememberedGovernments(): Promise<boolean> {
  const token = (await cookies()).get('showup_bodies')?.value
  if (!token) return false
  if (!getOptionalEnv('BODIES_TOKEN_SECRET')) return token === 'unsigned-preview'
  return !!verifyBodiesToken(token)
}
