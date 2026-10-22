import type { AlertUser } from "./types"

/** US numbers only, returned in E.164 (+1XXXXXXXXXX), or null if it isn't a valid US mobile-shaped number. */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "")
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  if (ten.length !== 10) return null
  // NANP: area code and exchange can't start with 0 or 1.
  if (/^[01]/.test(ten) || /^[01]/.test(ten.slice(3))) return null
  return `+1${ten}`
}

export type TextBlock = "no_phone" | "not_verified" | "opted_out" | "needs_parent_consent"

/**
 * Can we text this user at all? (plan §8, §11, §19)
 * Phone numbers only after Twilio Verify; STOP is final; under-18 users need
 * parent consent, and without it they get in-app alerts only.
 */
export function textBlock(user: AlertUser): TextBlock | null {
  if (!user.phone) return "no_phone"
  if (!user.phone_verified) return "not_verified"
  if (user.sms_opted_out) return "opted_out"
  if (user.is_minor && !user.parent_consent) return "needs_parent_consent"
  return null
}

export function canText(user: AlertUser) {
  return textBlock(user) === null
}

/** Browser notifications: a subscription, and for under-18 users a parent's OK, as with texts. */
export function canPush(user: AlertUser) {
  return !!user.push && (!user.is_minor || user.parent_consent)
}

/** Can any alert reach this user, by text or browser notification? */
export function canAlert(user: AlertUser) {
  return canText(user) || canPush(user)
}
