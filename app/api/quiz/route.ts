import type { QuizBodyType } from '@/lib/contracts/bodyTypes'
import { db } from '@/lib/db'
import { getEnv, getOptionalEnv, isDemoMode } from '@/lib/env'
import { isQuizBodyType, scoreBodyQuiz } from '@/lib/quiz'
import { RATE_LIMITS, checkRateLimit, clientIp, hashIp } from '@/lib/rateLimit'
import { verifyBodiesToken } from '@/lib/tokens'

const failures = {
  invalid: () => Response.json({ error: 'Choose valid body types and use your lookup link.' }, { status: 400 }),
  invalidToken: () => Response.json({ error: 'Run the address lookup before submitting the quiz.' }, { status: 400 }),
  limited: () => Response.json({ error: 'Too many quiz submissions. Try again later.' }, { status: 429 }),
  unavailable: () => Response.json({ error: 'We could not save the quiz right now.' }, { status: 500 }),
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as {
    bodies_token?: unknown
    selected_types?: unknown
    unsure?: unknown
    /** Types of the governments the lookup listed but doesn't track (LookupResponse.uncovered). */
    uncovered_types?: unknown
  } | null
  if (
    !Array.isArray(input?.selected_types) ||
    !input.selected_types.every(isQuizBodyType) ||
    (input.unsure !== undefined && typeof input.unsure !== 'boolean') ||
    (input.unsure === true && input.selected_types.length > 0) ||
    (input.unsure !== true && input.selected_types.length === 0)
  ) return failures.invalid()

  const token = typeof input.bodies_token === 'string' ? input.bodies_token : null

  try {
    const ids = verifyBodiesToken(token)
    if (!ids) return failures.invalidToken()
    const production = getOptionalEnv('VERCEL_ENV') === 'production'
    const ipSecret = production ? getEnv('IP_HASH_SECRET') : getOptionalEnv('IP_HASH_SECRET')
    const hasDbSecret = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY') && getOptionalEnv('SUPABASE_URL')
    if (production && (!ipSecret || !hasDbSecret)) return failures.unavailable()
    if (ipSecret && hasDbSecret) {
      const limit = await checkRateLimit(`quiz:${hashIp(clientIp(request), { secret: ipSecret })}`, RATE_LIMITS.lookupPerIp)
      if (!limit.allowed) return failures.limited()
      if (production && limit.degraded) return failures.unavailable()
    }

    const { data, error } = await db().from('bodies').select('id,type').in('id', ids)
    if (error) return failures.unavailable()
    // Untracked governments (an ESD, another city's council) have no catalog row, so they can't be in
    // the signed token. The lookup sends their types alongside it; only valid quiz types count.
    const uncoveredTypes = Array.isArray(input.uncovered_types) ? input.uncovered_types.filter(isQuizBodyType) : []
    const actualTypes = [...new Set([...(data ?? []).map((row) => row.type).filter(isQuizBodyType), ...uncoveredTypes])]
    const selected = input.selected_types as QuizBodyType[]
    const score = scoreBodyQuiz(selected, actualTypes, input.unsure === true)

    if (!isDemoMode()) {
      const saved = await db().from('quiz_responses').insert({
        selected_types: score.selected_types,
        actual_types: score.actual_types,
      })
      if (saved.error) return failures.unavailable()
    }

    return Response.json({ ...score, demo: isDemoMode() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return failures.unavailable()
  }
}
