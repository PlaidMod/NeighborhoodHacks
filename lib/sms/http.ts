import { getOptionalEnv } from '@/lib/env'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rateLimit'

// Small helpers shared by P3's alert routes.

/** 10 code requests or checks an hour per IP, so nobody can use us to spam a number. */
const ALERTS_PER_IP = { limit: 10, windowSeconds: 3600 }

export async function alertsRateLimited(req: Request, kind: 'subscribe' | 'verify'): Promise<boolean> {
  // Without the secret there's no way to hash the IP, and that only happens in local preview.
  if (!getOptionalEnv('IP_HASH_SECRET') || !getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')) return false
  const r = await checkRateLimit(`alerts_${kind}:${hashIp(clientIp(req))}`, ALERTS_PER_IP)
  return !r.allowed
}

export function jsonError(code: string, status: number) {
  return Response.json({ error: code }, { status })
}
