import { db } from '@/lib/db'
import type { PushTarget } from '@/lib/push/subscription'
import type { Stake } from '@/lib/stakes'

// Writes for the opt-in flows and the Twilio webhook. Server-only. Only what the plan
// lists is stored (§16 users): phone or browser push subscription, verified flag,
// language, stakes, age flags and opt-out. No address and no drafts.

async function replaceFollowedBodies(userId: string, bodyIds: string[]) {
  const del = await db().from('user_bodies').delete().eq('user_id', userId)
  if (del.error) throw del.error
  if (bodyIds.length) {
    const ins = await db()
      .from('user_bodies')
      .insert(bodyIds.map((body_id) => ({ user_id: userId, body_id })))
    if (ins.error) throw ins.error
  }
}

/** One row per subscribed browser, keyed by its push endpoint. Signing up again updates it. */
export async function savePushSubscriber(input: {
  target: PushTarget
  language: 'en' | 'es'
  stakes: Stake[]
  is_minor: boolean
  parent_consent: boolean
  bodyIds: string[]
}): Promise<string> {
  const { data, error } = await db()
    .from('users')
    .upsert(
      {
        push_endpoint: input.target.endpoint,
        push_p256dh: input.target.p256dh,
        push_auth: input.target.auth,
        language: input.language,
        stakes: input.stakes,
        is_minor: input.is_minor,
        parent_consent: input.parent_consent,
      },
      { onConflict: 'push_endpoint' },
    )
    .select('id')
    .single()
  if (error) throw error
  await replaceFollowedBodies(data.id, input.bodyIds)
  return data.id
}

/** Turning notifications off deletes the browser's row, with its bodies, reminders and queued alerts. */
export async function deletePushSubscriber(endpoint: string): Promise<string | null> {
  const { data, error } = await db().from('users').delete().eq('push_endpoint', endpoint).select('id')
  if (error) throw error
  return data?.[0]?.id ?? null
}

export async function saveVerifiedSubscriber(input: {
  phone: string
  language: 'en' | 'es'
  stakes: Stake[]
  is_minor: boolean
  parent_consent: boolean
  bodyIds: string[]
}): Promise<string> {
  const { data, error } = await db()
    .from('users')
    .upsert(
      {
        phone: input.phone,
        phone_verified: true,
        language: input.language,
        stakes: input.stakes,
        is_minor: input.is_minor,
        parent_consent: input.parent_consent,
        sms_opted_out: false,
      },
      { onConflict: 'phone' },
    )
    .select('id')
    .single()
  if (error) throw error
  // Replace the followed bodies with the ones from this lookup.
  await replaceFollowedBodies(data.id, input.bodyIds)
  return data.id
}

export async function setOptOut(phone: string, optedOut: boolean) {
  const { error } = await db().from('users').update({ sms_opted_out: optedOut }).eq('phone', phone)
  if (error) throw error
}

export async function saveReminder(userId: string, itemId: string) {
  const { error } = await db().from('reminders').upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id,item_id', ignoreDuplicates: true })
  if (error) throw error
}
