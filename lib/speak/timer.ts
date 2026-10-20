/** Elapsed wall time, not interval ticks: suspended tabs must not extend a rehearsal. */
export function remainingSeconds(limit: number, elapsedMs: number, startedAt: number | null, now: number) {
  const elapsed = Math.max(0, elapsedMs) + (startedAt === null ? 0 : Math.max(0, now - startedAt))
  return Math.max(0, Math.ceil(limit - elapsed / 1000))
}
