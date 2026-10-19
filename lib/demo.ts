import { createHash } from 'node:crypto'
import type { Json } from './database.types'
import { db } from './db'
import { isDemoMode, isDemoRecord } from './env'
import { normalizeAddressInput } from './address'

// Demo mode (Technical_Implementation_Plan.md section 18).
// With DEMO_MODE=true, answers from outside services (Census, Gemini, Twilio) come from the
// demo_cache table instead, so a recorded demo never depends on them. The database itself
// stays reachable. With DEMO_RECORD=true, live answers are saved into the cache as you
// click through the demo once.

export interface DemoCacheStore {
  get(key: string): Promise<unknown | null>
  set(key: string, payload: unknown): Promise<void>
}

export class DemoCacheMissError extends Error {
  constructor(public readonly key: string) {
    super(`Demo mode is on but nothing is cached for "${key}". Record it first with DEMO_RECORD=true.`)
    this.name = 'DemoCacheMissError'
  }
}

/** Reads and writes the demo_cache table. Server-only. */
export const supabaseDemoCacheStore: DemoCacheStore = {
  async get(key) {
    const { data, error } = await db().from('demo_cache').select('payload').eq('key', key).maybeSingle()
    if (error) throw error
    return data?.payload ?? null
  },
  async set(key, payload) {
    const { error } = await db()
      .from('demo_cache')
      .upsert({ key, payload: payload as Json, updated_at: new Date().toISOString() })
    if (error) throw error
  },
}

/**
 * Wraps a call to an outside service. In demo mode it returns the cached answer and never
 * calls `compute`; a missing answer throws DemoCacheMissError so the gap shows up in a dry run.
 * Otherwise it calls `compute`, and in record mode saves the answer first.
 */
export async function demoCached<T>(
  key: string,
  compute: () => Promise<T>,
  opts: { store?: DemoCacheStore; demoMode?: boolean; record?: boolean } = {},
): Promise<T> {
  const store = opts.store ?? supabaseDemoCacheStore
  if (opts.demoMode ?? isDemoMode()) {
    const cached = await store.get(key)
    if (cached === null || cached === undefined) throw new DemoCacheMissError(key)
    return cached as T
  }
  const result = await compute()
  if (opts.record ?? isDemoRecord()) await store.set(key, result)
  return result
}

/**
 * Cache key for an address lookup. It's a hash, so not even the demo addresses
 * are stored in the database.
 */
export function lookupDemoKey(address: string): string {
  const normalized = normalizeAddressInput(address).toUpperCase()
  return `lookup:${createHash('sha256').update(normalized).digest('hex')}`
}
