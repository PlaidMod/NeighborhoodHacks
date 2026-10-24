import 'server-only'
import { unstable_cache } from 'next/cache'
import type { Lang, WeeklyEdition } from './build'
import { narrativeKey, weeklyNarrative } from './narrative'

// The AI weekly summary takes up to ~15s to write, so pages never wait for it. A page gets
// `shown`, which gives up after `waitMs` (the page streams it in, or keeps its headline
// sentences), and schedules `done` with after(), so the summary still gets written and saved
// for the next visitor. It's saved in Next's shared cache, so every server can read it, not
// only the one that wrote it.

const SIX_HOURS = 6 * 60 * 60

// One writer per summary on this server, so a burst of visits makes one AI call, not many.
const writing = new Map<string, Promise<string[] | null>>()

function shared(edition: WeeklyEdition, lang: Lang, key: string): Promise<string[] | null> {
  const running = writing.get(key)
  if (running) return running
  const job = unstable_cache(
    async () => {
      const points = await weeklyNarrative(edition, lang)
      // Throwing keeps a failed summary out of the shared cache, so the next visit tries again.
      if (!points) throw new Error('no weekly summary')
      return points
    },
    ['weekly-narrative', key],
    { revalidate: SIX_HOURS },
  )()
    .catch(() => null)
    .finally(() => writing.delete(key))
  writing.set(key, job)
  return job
}

export function startWeeklyNarrative(edition: WeeklyEdition, lang: Lang, waitMs: number) {
  const key = narrativeKey(edition, lang)
  if (!key) return { shown: Promise.resolve(null), done: Promise.resolve(null) }
  const done = shared(edition, lang, key)
  const shown = Promise.race([done, new Promise<null>((resolve) => setTimeout(() => resolve(null), waitMs))])
  return { shown, done }
}
