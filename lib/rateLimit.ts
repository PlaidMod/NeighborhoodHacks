import { createHmac, randomUUID } from 'node:crypto'
import { db } from './db'
import { MissingEnvError, getEnv } from './env'
import { TIME_ZONE } from './i18n'

// Fixed-window rate limits stored in the rate_limits table (section 14 and section 19).
// Keys never hold a raw IP address: use hashIp() for IP-based keys.

export interface RateLimitRule {
  limit: number
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  /** Set when the counter couldn't be reached; the call was let through. */
  degraded?: true
}

export interface RateLimitStore {
  /** Adds one to the counter for (key, windowStart) and returns the new count. */
  increment(key: string, windowStart: Date): Promise<number>
}

export const RATE_LIMITS = {
  // Section 14: the coach allows 20 calls an hour per browser and per IP.
  coachPerBrowser: { limit: 20, windowSeconds: 3600 },
  coachPerIp: { limit: 20, windowSeconds: 3600 },
  // The plan sets no lookup number. 120 an hour lets a whole class share one school IP.
  lookupPerIp: { limit: 120, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>

/** Counts calls in the database through the increment_rate_limit function. Server-only. */
export const supabaseRateLimitStore: RateLimitStore = {
  async increment(key, start) {
    const { data, error } = await db().rpc('increment_rate_limit', {
      p_key: key,
      p_window_start: start.toISOString(),
    })
    if (error) throw error
    return data
  },
}

/** The start of the fixed window that `now` falls in, counted from the Unix epoch. */
export function windowStart(now: Date, windowSeconds: number): Date {
  const size = windowSeconds * 1000
  return new Date(Math.floor(now.getTime() / size) * size)
}

/**
 * Counts one call against `key` and says whether it's allowed. If the counter can't be
 * reached, the call is allowed and marked degraded, so a database hiccup doesn't block the demo.
 */
export async function checkRateLimit(
  key: string,
  rule: RateLimitRule,
  opts: { store?: RateLimitStore; now?: Date } = {},
): Promise<RateLimitResult> {
  const start = windowStart(opts.now ?? new Date(), rule.windowSeconds)
  const resetAt = new Date(start.getTime() + rule.windowSeconds * 1000)
  try {
    const count = await (opts.store ?? supabaseRateLimitStore).increment(key, start)
    return { allowed: count <= rule.limit, remaining: Math.max(0, rule.limit - count), resetAt }
  } catch (error) {
    // A missing env var is a setup mistake, not a database hiccup: fail loudly instead of
    // silently turning every limit off.
    if (error instanceof MissingEnvError) throw error
    // Never log the key: it can contain a hashed IP or a browser ID.
    console.warn(`Rate limit check failed, so the call was allowed: ${error instanceof Error ? error.message : String(error)}`)
    return { allowed: true, remaining: rule.limit, resetAt, degraded: true }
  }
}

const chicagoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * A one-way scramble of an IP address, keyed with IP_HASH_SECRET and the Chicago date.
 * The date makes the value change every day, so it can't be matched across days.
 */
export function hashIp(ip: string, opts: { secret?: string; now?: Date } = {}): string {
  const secret = opts.secret ?? getEnv('IP_HASH_SECRET')
  const day = chicagoDay.format(opts.now ?? new Date())
  return createHmac('sha256', secret).update(`${day}:${ip}`).digest('hex')
}

/** The visitor's IP as reported by Vercel's proxy, or 'unknown'. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** Cookie with a random ID per browser, used to rate-limit the AI coach (P4 sets it). */
export const BROWSER_ID_COOKIE = 'showup_bid'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** The browser ID from the request's cookies, or null if it's missing or not a UUID. */
export function readBrowserId(req: Request): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === BROWSER_ID_COOKIE) {
      const value = decodeURIComponent(rest.join('='))
      return UUID.test(value) ? value : null
    }
  }
  return null
}

export function newBrowserId(): string {
  return randomUUID()
}
