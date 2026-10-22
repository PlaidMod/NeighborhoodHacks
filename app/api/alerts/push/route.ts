import { cookies } from 'next/headers'
import { z } from 'zod'
import { getOptionalEnv } from '@/lib/env'
import { confirmationNotice } from '@/lib/push/message'
import { createPushSender, pushConfigFromEnv } from '@/lib/push/send'
import { isAllowedPushEndpoint, parsePushSubscription } from '@/lib/push/subscription'
import { alertsRateLimited, jsonError } from '@/lib/sms/http'
import { SUBSCRIBER_COOKIE, signSubscriber, verifySubscriber } from '@/lib/sms/subscriber'
import { deletePushSubscriber, savePushSubscriber } from '@/lib/sms/subscribers'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { verifyBodiesToken } from '@/lib/tokens'

// POST /api/alerts/push: turn on browser notifications (Technical Plan §11, Oct 22 addition).
// Stores the browser's push subscription with the bodies from the reader's bodies_token,
// then sends one confirmation notification. Without push keys it answers { preview: true }.
// DELETE /api/alerts/push: turn them off. The endpoint is a secret only that browser knows,
// so it proves the request comes from the subscribed browser.

const SubscribeBody = z.object({
  subscription: z.unknown(),
  t: z.string().max(4000),
  lang: z.enum(['en', 'es']).default('en'),
  consent: z.literal(true),
  is_minor: z.boolean().default(false),
  parent_consent: z.boolean().default(false),
})

export async function POST(req: Request) {
  const parsed = SubscribeBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError('invalid_request', 400)
  const { subscription, t, lang, is_minor, parent_consent } = parsed.data
  // Under 18 without a parent's OK: in-app alerts only, the same rule as texts (plan §8).
  if (is_minor && !parent_consent) return jsonError('parent_consent_required', 400)
  const target = parsePushSubscription(subscription)
  if (!target) return jsonError('invalid_subscription', 400)
  const config = pushConfigFromEnv()
  if (!config) return Response.json({ preview: true })
  const bodyIds = verifyBodiesToken(t)
  if (!bodyIds) return jsonError('no_bodies', 400)
  if (await alertsRateLimited(req, 'push')) return jsonError('rate_limited', 429)

  const cookieStore = await cookies()
  const userId = await savePushSubscriber({
    target,
    language: lang,
    stakes: parseStakes(cookieStore.get(STAKES_COOKIE)?.value),
    is_minor,
    parent_consent,
    bodyIds,
  })
  // Lets Speak up save sign-up reminders for this browser (POST /api/reminders).
  cookieStore.set(SUBSCRIBER_COOKIE, signSubscriber(userId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: getOptionalEnv('VERCEL_ENV') !== undefined,
    maxAge: 60 * 60 * 24 * 365,
  })
  // A reply to the reader's own action, so it isn't held for quiet hours.
  const siteUrl = getOptionalEnv('SITE_URL') ?? new URL(req.url).origin
  await createPushSender(config)(target, confirmationNotice(lang, siteUrl)).catch(() => undefined)
  return Response.json({ ok: true })
}

const UnsubscribeBody = z.object({ endpoint: z.string().max(1024) })

export async function DELETE(req: Request) {
  const parsed = UnsubscribeBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !isAllowedPushEndpoint(parsed.data.endpoint)) return jsonError('invalid_request', 400)
  if (await alertsRateLimited(req, 'push')) return jsonError('rate_limited', 429)
  const removedId = await deletePushSubscriber(parsed.data.endpoint)
  const cookieStore = await cookies()
  if (removedId && verifySubscriber(cookieStore.get(SUBSCRIBER_COOKIE)?.value) === removedId) cookieStore.delete(SUBSCRIBER_COOKIE)
  return Response.json({ ok: true })
}
