import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Twilio over plain REST (no SDK), server-side only. Covers what P3 needs:
 * Verify (phone confirmation), Programmable Messaging (sending), and inbound
 * webhooks (STOP/START/HELP), plus signature validation for those webhooks.
 */

export type TwilioConfig = {
  accountSid: string
  authToken: string
  verifyServiceSid: string
  messagingServiceSid: string
}

export function twilioConfigFromEnv(env: NodeJS.ProcessEnv = process.env): TwilioConfig {
  const need = (k: string) => {
    const v = env[k]
    if (!v) throw new Error(`${k} is not set`)
    return v
  }
  return {
    accountSid: need("TWILIO_ACCOUNT_SID"),
    authToken: need("TWILIO_AUTH_TOKEN"),
    verifyServiceSid: need("TWILIO_VERIFY_SID"),
    messagingServiceSid: need("TWILIO_MESSAGING_SERVICE_SID"),
  }
}

type Fetch = typeof fetch

export class TwilioError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message)
  }
}

export function twilioClient(cfg: TwilioConfig, fetchImpl: Fetch = fetch) {
  const auth = `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64")}`

  async function post(url: string, form: Record<string, string>) {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(15_000),
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throw new TwilioError(String(json.message ?? `Twilio ${res.status}`), res.status, json.code as number | undefined)
    }
    return json
  }

  return {
    /** Sends a 6-digit code by SMS. */
    async startVerification(to: string, lang: "en" | "es" = "en") {
      const r = await post(`https://verify.twilio.com/v2/Services/${cfg.verifyServiceSid}/Verifications`, {
        To: to,
        Channel: "sms",
        Locale: lang,
      })
      return { status: String(r.status) }
    },

    /** True when the code is correct. */
    async checkVerification(to: string, code: string) {
      const r = await post(`https://verify.twilio.com/v2/Services/${cfg.verifyServiceSid}/VerificationCheck`, {
        To: to,
        Code: code,
      })
      return r.status === "approved"
    },

    async sendSms(to: string, body: string) {
      const r = await post(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
        To: to,
        MessagingServiceSid: cfg.messagingServiceSid,
        Body: body,
      })
      return { sid: String(r.sid), status: String(r.status) }
    },
  }
}

/**
 * Validates X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted params)).
 * `url` must be the exact public URL Twilio called, including the query string.
 */
export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string) {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("")
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature ?? "")
  return a.length === b.length && timingSafeEqual(a, b)
}

// Twilio's standard opt-out and opt-in keywords. Twilio blocks texts to opted-out
// numbers itself; we mirror the state in users.sms_opted_out (plan §11).
const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT", "PARAR", "ALTO"]
const START_WORDS = ["START", "UNSTOP", "YES", "OPTIN"]
const HELP_WORDS = ["HELP", "INFO", "AYUDA"]

export type InboundIntent = "stop" | "start" | "help" | "other"

export function inboundIntent(body: string): InboundIntent {
  const word = body.trim().toUpperCase().replace(/[^A-Z]/g, "")
  if (STOP_WORDS.includes(word)) return "stop"
  if (START_WORDS.includes(word)) return "start"
  if (HELP_WORDS.includes(word)) return "help"
  return "other"
}
