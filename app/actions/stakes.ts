'use server'

import { cookies } from 'next/headers'
import { STAKES_COOKIE, isStake, serializeStakes } from '@/lib/stakes'

const ONE_YEAR = 60 * 60 * 24 * 365

/** Saves the roles the visitor picked. An empty choice clears the cookie. */
export async function saveStakes(stakes: unknown): Promise<void> {
  // Server actions accept any input from the browser, so keep only known stakes.
  const valid = Array.isArray(stakes) ? stakes.filter(isStake) : []
  const cookieStore = await cookies()
  if (valid.length === 0) {
    cookieStore.delete(STAKES_COOKIE)
    return
  }
  cookieStore.set(STAKES_COOKIE, serializeStakes(valid), { path: '/', sameSite: 'lax', maxAge: ONE_YEAR })
}
