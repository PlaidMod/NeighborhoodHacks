import { createHash, timingSafeEqual } from 'node:crypto'
import { getOptionalEnv } from './env'

// Cron routes (P2's /api/cron/ingest, P3's /api/cron/alerts) check this header:
//   Authorization: Bearer <CRON_SECRET>
// Vercel cron sends it automatically when CRON_SECRET is set. GitHub Actions sends it with curl.

const digest = (value: string) => createHash('sha256').update(value).digest()

/** True only when the request carries "Bearer <CRON_SECRET>" and CRON_SECRET is set. */
export function isAuthorizedCron(req: Request, secret: string | undefined = getOptionalEnv('CRON_SECRET')): boolean {
  // An unset secret must never match "Bearer undefined" or an empty token.
  if (!secret) return false
  const header = req.headers.get('authorization')
  if (!header) return false
  // Comparing fixed-length digests keeps the check constant-time whatever the input length.
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`))
}

export function unauthorizedCronResponse(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 })
}
