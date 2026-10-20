import { getOptionalEnv } from '@/lib/env'
import { HELP_REPLY } from '@/lib/sms/message'
import { normalizeUsPhone } from '@/lib/sms/eligibility'
import { setOptOut } from '@/lib/sms/subscribers'
import { inboundIntent, validTwilioSignature } from '@/lib/sms/twilio'

// POST /api/twilio/inbound: Twilio's incoming-message webhook. Twilio itself blocks
// texts after STOP; this mirrors it into users.sms_opted_out (Technical Plan §11).

function twiml(message?: string) {
  const body = message ? `<Message>${message.replace(/[<>&]/g, '')}</Message>` : ''
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function POST(req: Request) {
  const token = getOptionalEnv('TWILIO_AUTH_TOKEN')
  if (!token) return new Response('not configured', { status: 503 })
  const params = Object.fromEntries(new URLSearchParams(await req.text())) as Record<string, string>
  // Twilio signs the public URL it called, which on Vercel is SITE_URL + this path.
  const site = getOptionalEnv('SITE_URL')
  const url = site ? `${site.replace(/\/$/, '')}/api/twilio/inbound` : req.url
  if (!validTwilioSignature(token, url, params, req.headers.get('x-twilio-signature') ?? '')) {
    return new Response('bad signature', { status: 403 })
  }
  const from = normalizeUsPhone(params.From ?? '')
  const intent = inboundIntent(params.Body ?? '')
  if (from && intent === 'stop') await setOptOut(from, true)
  if (from && intent === 'start') await setOptOut(from, false)
  if (intent === 'help') return twiml(HELP_REPLY.en)
  return twiml()
}
