import { z } from 'zod'
import { normalizeUsPhone } from '@/lib/sms/eligibility'
import { alertsRateLimited, jsonError } from '@/lib/sms/http'
import { twilioClient, twilioConfigFromEnv } from '@/lib/sms/twilio'
import { twilioConfigured } from '@/lib/sms/subscriber'

// POST /api/alerts/subscribe: step 1 of opt-in (Technical Plan §11). Sends a Twilio
// Verify code. Without Twilio keys it answers { preview: true } and sends nothing.

const Body = z.object({
  phone: z.string().max(40),
  lang: z.enum(['en', 'es']).default('en'),
  consent: z.literal(true),
  is_minor: z.boolean().default(false),
  parent_consent: z.boolean().default(false),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError('invalid_request', 400)
  const { phone, lang, is_minor, parent_consent } = parsed.data
  const to = normalizeUsPhone(phone)
  if (!to) return jsonError('invalid_phone', 400)
  // Under 18 without a parent's OK: in-app alerts only, no texts (plan §8).
  if (is_minor && !parent_consent) return jsonError('parent_consent_required', 400)
  if (!twilioConfigured()) return Response.json({ preview: true })
  if (await alertsRateLimited(req, 'subscribe')) return jsonError('rate_limited', 429)
  try {
    await twilioClient(twilioConfigFromEnv()).startVerification(to, lang)
    return Response.json({ sent: true })
  } catch {
    return jsonError('send_failed', 502)
  }
}
