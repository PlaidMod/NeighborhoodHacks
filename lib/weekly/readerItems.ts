import 'server-only'
import type { WeeklyItem } from './build'
import { loadItems, resolveBodies, type BodiesResult } from './data'

// A reader's governments and items (30 days back to 60 ahead, enough for the timeline and the
// weekly brief), kept in this server's memory for a few minutes. The dashboard and the AI summary
// request that follows it then load from the database once, not on every page.

/** How long a server reuses a reader's governments and items before asking the database again. */
const REUSE_MS = 5 * 60_000
/** Readers kept in memory at once (each is up to about 1 MB of items). */
const KEEP = 20

export type ReaderItems = { at: number; resolved: BodiesResult; items: WeeklyItem[] }
const recent = new Map<string, ReaderItems>()

export async function readerItems(token: string, lang: 'en' | 'es', now: Date = new Date()): Promise<ReaderItems> {
  const key = `${lang}:${token}`
  const hit = recent.get(key)
  const age = hit ? now.getTime() - hit.at : -1
  if (hit && age >= 0 && age < REUSE_MS) return hit
  const resolved = await resolveBodies(token)
  const items = resolved.bodies
    ? await loadItems(resolved.mode, resolved.bodies, { now, fromDays: 30, toDays: 60, storyLang: lang })
    : []
  const entry = { at: now.getTime(), resolved, items }
  recent.delete(key)
  recent.set(key, entry)
  if (recent.size > KEEP) recent.delete(recent.keys().next().value!)
  return entry
}
