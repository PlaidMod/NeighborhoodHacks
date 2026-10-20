import { cookies } from 'next/headers'
import { z } from 'zod'
import { getOptionalEnv } from '@/lib/env'
import { STAKES_COOKIE, parseStakes } from '@/lib/stakes'
import { normalizeUsPhone } from '@/lib/sms/eligibility'
import { alertsRateLimited, jsonError } from '@/lib/sms/http'
import { OPT_IN_CONFIRMATION } from '@/lib/sms/message'
import { SUBSCRIBER_COOKIE, signSubscriber, twilioConfigured } from '@/lib/sms/subscriber'
import { saveVerifiedSubscriber } from '@/lib/sms/subscribers'
import { twilioClient, twilioConfigFromEnv } from '@/lib/sms/twilio'
import { verifyBodiesToken } from '@/lib/tokens'

// POST /api/alerts/verify: step 2 of opt-in. Checks the code, then stores the phone
// number with the bodies from the reader's bodies_token (Technical Plan §11).

const Body = z.object({
  phone: z.string().max(40),
  code: z.string().regex(/^\d{4,10}$/),
  t: z.string().max(4000),
  lang: z.enum(['en', 'es']).default('en'),
  is_minor: z.boolean().default(false),
  parent_consent: z.boolean().default(false),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError('invalid_request', 400)
  const { phone, code, t, lang, is_minor, parent_consent } = parsed.data
  const to = normalizeUsPhone(phone)
  if (!to) return jsonError('invalid_phone', 400)
  if (is_minor && !parent_consent) return jsonError('parent_consent_required', 400)
  if (!twilioConfigured()) return Response.json({ preview: true })
  const bodyIds = verifyBodiesToken(t)
  if (!bodyIds) return jsonError('no_bodies', 400)
  if (await alertsRateLimited(req, 'verify')) return jsonError('rate_limited', 429)

  const twilio = twilioClient(twilioConfigFromEnv())
  let ok = false
  try {
    ok = await twilio.checkVerification(to, code)
  } catch {
    return jsonError('verify_failed', 502)
  }
  if (!ok) return jsonError('wrong_code', 400)

  const cookieStore = await cookies()
  const userId = await saveVerifiedSubscriber({
    phone: to,
    language: lang,
    stakes: parseStakes(cookieStore.get(STAKES_COOKIE)?.value),
    is_minor,
    parent_consent,
    bodyIds,
  })
  cookieStore.set(SUBSCRIBER_COOKIE, signSubscriber(userId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: getOptionalEnv('VERCEL_ENV') !== undefined,
    maxAge: 60 * 60 * 24 * 365,
  })
  // The confirmation is a reply to the user's own action, so it isn't held for quiet hours.
  await twilio.sendSms(to, OPT_IN_CONFIRMATION[lang]).catch(() => undefined)
  return Response.json({ ok: true })
}
