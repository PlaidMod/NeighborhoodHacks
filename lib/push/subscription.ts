import { z } from 'zod'

// A browser's push subscription: the push service URL to post to, and the two keys that
// encrypt the message for that browser. It identifies a browser, not a person: no phone
// number, email or address.

export type PushTarget = { endpoint: string; p256dh: string; auth: string }

// The push services of Chrome, Edge, Firefox and Safari. We post to the stored endpoint
// when sending, so only these hosts are accepted; anything else could point our server
// at an address of the sender's choosing.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^(?:[a-z0-9-]+\.)*push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
]

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false
  return PUSH_HOSTS.some((host) => host.test(url.hostname))
}

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/

// What PushSubscription.toJSON() returns. p256dh is a 65-byte key (87 characters) and
// auth is 16 bytes (22 characters); the ranges allow for padding.
const Subscription = z.object({
  endpoint: z.string().max(1024),
  keys: z.object({
    p256dh: z.string().min(80).max(100).regex(BASE64URL),
    auth: z.string().min(16).max(32).regex(BASE64URL),
  }),
})

/** The subscription's endpoint and keys, or null if it's malformed or not from a known push service. */
export function parsePushSubscription(input: unknown): PushTarget | null {
  const parsed = Subscription.safeParse(input)
  if (!parsed.success || !isAllowedPushEndpoint(parsed.data.endpoint)) return null
  return { endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth }
}
