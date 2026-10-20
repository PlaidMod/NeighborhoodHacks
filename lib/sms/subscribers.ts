import { db } from '@/lib/db'
import type { Stake } from '@/lib/stakes'

// Writes for the opt-in flow and the Twilio webhook. Server-only. Only what the plan
// lists is stored (§16 users): phone, verified flag, language, stakes, age flags and
// opt-out. No address and no drafts.

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
  const id = data.id
  // Replace the followed bodies with the ones from this lookup.
  const del = await db().from('user_bodies').delete().eq('user_id', id)
  if (del.error) throw del.error
  if (input.bodyIds.length) {
    const ins = await db()
      .from('user_bodies')
      .insert(input.bodyIds.map((body_id) => ({ user_id: id, body_id })))
    if (ins.error) throw ins.error
  }
  return id
}

export async function setOptOut(phone: string, optedOut: boolean) {
  const { error } = await db().from('users').update({ sms_opted_out: optedOut }).eq('phone', phone)
  if (error) throw error
}

export async function saveReminder(userId: string, itemId: string) {
  const { error } = await db().from('reminders').upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id,item_id', ignoreDuplicates: true })
  if (error) throw error
}
