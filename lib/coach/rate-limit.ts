export interface RateLimitResult { allowed: boolean; retryAfter: number }
/** A shared store must enforce each key atomically; denied calls may consume counts. */
export interface RateLimitStore {
  consume(keys: string[], now: number): RateLimitResult | Promise<RateLimitResult>
}

/** Process-local fallback: resets on restart and is not distributed enforcement. */
export class MemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, { window: number; count: number }>()
  consume(keys: string[], now: number): RateLimitResult {
    const window = Math.floor(now / 3600000)
    for (const [key, entry] of this.entries) if (entry.window !== window) this.entries.delete(key)
    const retryAfter = Math.max(1, Math.ceil(((window + 1) * 3600000 - now) / 1000))
    const unique = [...new Set(keys)]
    if (unique.some(key => (this.entries.get(key)?.count ?? 0) >= 20)) return { allowed: false, retryAfter }
    // Refuse additional identities when full; eviction would permit bypassing budgets.
    if (this.entries.size + unique.filter(key => !this.entries.has(key)).length > 10000) return { allowed: false, retryAfter }
    for (const key of unique) this.entries.set(key, { window, count: (this.entries.get(key)?.count ?? 0) + 1 })
    return { allowed: true, retryAfter: 0 }
  }
}
