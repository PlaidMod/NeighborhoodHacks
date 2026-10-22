import webpush from 'web-push'
import { getOptionalEnv } from '@/lib/env'
import type { PushNotice } from './message'
import { isAllowedPushEndpoint, type PushTarget } from './subscription'

// Sends browser notifications with the Web Push standard. The keys (VAPID) are our own,
// made with `npx web-push generate-vapid-keys`, so no outside account is needed. Server-only.

export type PushConfig = { publicKey: string; privateKey: string; subject: string }

/** 'gone' means the browser unsubscribed or the subscription expired: delete it. */
export type PushResult = 'sent' | 'gone'
export type PushSender = (target: PushTarget, notice: PushNotice) => Promise<PushResult>

type SendNotification = (subscription: webpush.PushSubscription, payload: string, options: webpush.RequestOptions) => Promise<unknown>

/** Push services require a contact: an https: URL (not localhost, which Apple rejects) or a mailto: address. */
function contact(value: string | undefined) {
  if (!value || !/^(https:|mailto:)/.test(value)) return undefined
  return /^https:\/\/localhost\b/.test(value) ? undefined : value
}

/** The keys and contact, or null when push isn't set up (the alerts page then shows a preview). */
export function pushConfigFromEnv(): PushConfig | null {
  const publicKey = getOptionalEnv('VAPID_PUBLIC_KEY')
  const privateKey = getOptionalEnv('VAPID_PRIVATE_KEY')
  const subject = contact(getOptionalEnv('VAPID_SUBJECT')) ?? contact(getOptionalEnv('SITE_URL'))
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null
}

export function pushConfigured() {
  return pushConfigFromEnv() !== null
}

/** The public key the browser subscribes with. It isn't secret. */
export function vapidPublicKey(): string | null {
  return pushConfigFromEnv()?.publicKey ?? null
}

export function createPushSender(config: PushConfig, send: SendNotification = webpush.sendNotification): PushSender {
  return async (target, notice) => {
    if (!isAllowedPushEndpoint(target.endpoint)) return 'gone'
    try {
      await send({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify(notice), {
        // A day: an alert held longer than that by a sleeping phone is dropped rather than shown late.
        TTL: 86_400,
        urgency: 'normal',
        vapidDetails: config,
      })
      return 'sent'
    } catch (error) {
      const status = (error as { statusCode?: unknown } | null)?.statusCode
      if (status === 404 || status === 410) return 'gone'
      // The library's error carries the endpoint, which identifies the browser: never pass it on.
      throw new Error(`push service answered ${typeof status === 'number' ? status : 'with an error'}`)
    }
  }
}
