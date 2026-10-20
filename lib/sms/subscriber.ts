import { createHmac, timingSafeEqual } from 'node:crypto'
import { getEnv, getOptionalEnv } from '@/lib/env'

// A signed cookie that remembers which verified subscriber this browser is, so Speak up
// can save a reminder (POST /api/reminders) without asking for the phone number again.
// It holds only the users.id UUID, never the phone number.

export const SUBSCRIBER_COOKIE = 'showup_sub'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sign(id: string, secret: string) {
  return createHmac('sha256', secret).update(`subscriber:${id}`).digest('base64url')
}

export function signSubscriber(id: string, secret: string = getEnv('BODIES_TOKEN_SECRET')) {
  if (!UUID.test(id)) throw new Error('subscriber id must be a UUID')
  return `${id}.${sign(id, secret)}`
}

/** The user ID in a cookie value, or null if it's missing, edited or signed with another secret. */
export function verifySubscriber(value: string | undefined | null, secret = getOptionalEnv('BODIES_TOKEN_SECRET')): string | null {
  if (!value || !secret) return null
  const [id, mac] = value.split('.')
  if (!id || !mac || !UUID.test(id)) return null
  const a = Buffer.from(sign(id, secret))
  const b = Buffer.from(mac)
  return a.length === b.length && timingSafeEqual(a, b) ? id : null
}

/** Real texting needs all four Twilio settings. Without them the alerts page shows a labeled preview. */
export function twilioConfigured() {
  return !!(
    getOptionalEnv('TWILIO_ACCOUNT_SID') &&
    getOptionalEnv('TWILIO_AUTH_TOKEN') &&
    getOptionalEnv('TWILIO_VERIFY_SID') &&
    getOptionalEnv('TWILIO_MESSAGING_SERVICE_SID')
  )
}
