import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { generateJson, geminiModel } from '@/lib/gemini'
import { getOptionalEnv } from '@/lib/env'
import { chunked } from '@/lib/paging'
import { applyJudge, articlesHash, finalize, sourcesOf, usableArticles, withoutRemoved } from './build'
import { checkExtraction } from './checks'
import { EXTRACT_SYSTEM, JUDGE_SYSTEM, extractPrompt, judgePrompt } from './prompt'
import { ExtractionSchema, JudgeSchema, type Extraction, type Group, type Judgement, type LinkedArticle, type PerspectiveItem, type PerspectiveRow } from './types'

// The perspectives job (spec §6): at most 5 items a run, soonest meeting first.

export type Candidate = { item: PerspectiveItem; articles: LinkedArticle[]; existing: PerspectiveRow | null }

export interface PerspectivesStore {
  candidates(limit: number): Promise<Candidate[]>
  save(row: PerspectiveRow): Promise<void>
}

export type Extractor = (item: PerspectiveItem, articles: LinkedArticle[]) => Promise<Extraction>
export type Judge = (item: PerspectiveItem, articles: LinkedArticle[], groups: Group[]) => Promise<Judgement>

export type PerspectivesResult = { checked: number; generated: number; unchanged: number; kept_previous: number; failed: number }

export async function runPerspectivesJob(opts: {
  store: PerspectivesStore
  extract: Extractor
  judge: Judge
  models?: { extract: string | null; judge: string | null }
  now?: Date
  limit?: number
}): Promise<PerspectivesResult> {
  const now = opts.now ?? new Date()
  const out: PerspectivesResult = { checked: 0, generated: 0, unchanged: 0, kept_previous: 0, failed: 0 }
  for (const { item, articles, existing } of await opts.store.candidates(opts.limit ?? 5)) {
    out.checked++
    try {
      const started = now.getTime() >= new Date(item.meeting_date).getTime()
      const removed = new Set(articles.filter((a) => a.status === 'removed').map((a) => a.url))

      // Frozen at the meeting start: only a removed article changes the block, without Gemini.
      if (started) {
        if (existing && [...removed].some((u) => existing.sources.some((s) => s.url === u))) {
          await opts.store.save(withoutRemoved(existing, removed, now))
          out.generated++
        } else out.unchanged++
        continue
      }

      const usable = usableArticles(articles, item.meeting_date)
      const hash = articlesHash(usable)
      if (existing?.articles_hash === hash) {
        out.unchanged++
        continue
      }
      const sources = sourcesOf(articles, item.meeting_date)
      if (!usable.length && !sources.length) {
        out.unchanged++
        continue
      }

      let groups: Group[] = []
      let dropped = 0
      let oneSided = false
      if (usable.length) {
        const checked = checkExtraction(await opts.extract(item, usable), usable, item)
        dropped = checked.dropped
        if (checked.groups.length) {
          let judgement: Judgement
          try {
            judgement = await opts.judge(item, usable, checked.groups)
          } catch {
            // Judge failed or didn't parse: publish nothing new (§6.4).
            if (!existing) await opts.store.save(finalize({ itemId: item.item_id, meetingStart: item.meeting_date, hash, groups: [], sources, judgeOneSided: true, dropped, extractModel: opts.models?.extract ?? null, judgeModel: opts.models?.judge ?? null, now }))
            out.kept_previous++
            continue
          }
          const judged = applyJudge(checked.groups, judgement)
          groups = judged.groups
          dropped += judged.dropped
          oneSided = judgement.one_sided
        }
      }

      await opts.store.save(
        finalize({
          itemId: item.item_id,
          meetingStart: item.meeting_date,
          hash,
          groups,
          sources,
          judgeOneSided: oneSided,
          dropped,
          extractModel: opts.models?.extract ?? null,
          judgeModel: opts.models?.judge ?? null,
          now,
        }),
      )
      out.generated++
    } catch (error) {
      out.failed++
      console.error(`perspectives ${item.item_id} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Production wiring. The news tables are P2's (scraper spec v1.3) and aren't in the
// generated database types yet, so these queries use an untyped client.
// ---------------------------------------------------------------------------

export function judgeModel() {
  return getOptionalEnv('GEMINI_JUDGE_MODEL') ?? geminiModel()
}

export const geminiExtractor: Extractor = (item, articles) =>
  generateJson({ schema: ExtractionSchema, system: EXTRACT_SYSTEM, contents: extractPrompt(item, articles), timeoutMs: 60_000 })

export const geminiJudge: Judge = (item, articles, groups) =>
  generateJson({ schema: JudgeSchema, system: JUDGE_SYSTEM, contents: judgePrompt(item, articles, groups), model: judgeModel(), timeoutMs: 60_000 })

const untyped = () => db() as unknown as SupabaseClient

export const supabasePerspectivesStore: PerspectivesStore = {
  async candidates(limit) {
    const links = await untyped()
      .from('news_article_items')
      .select('item_id, article:news_articles!inner(id, outlet, headline, url, published_at, content_hash, status, text)')
    if (links.error) throw links.error
    const byItem = new Map<string, LinkedArticle[]>()
    for (const row of (links.data ?? []) as unknown as { item_id: string; article: Record<string, unknown> }[]) {
      const a = row.article
      ;(byItem.get(row.item_id) ?? byItem.set(row.item_id, []).get(row.item_id)!).push({
        article_id: String(a.id),
        outlet: String(a.outlet ?? ''),
        headline: String(a.headline ?? ''),
        url: String(a.url ?? ''),
        published_at: String(a.published_at ?? ''),
        content_hash: String(a.content_hash ?? ''),
        status: String(a.status ?? ''),
        text: typeof a.text === 'string' ? a.text : null,
      })
    }
    const ids = [...byItem.keys()]
    if (!ids.length) return []
    const items = await db()
      .from('items')
      .select('id, title, description, body_id, meeting:meetings!inner(date)')
      .in('id', ids)
      .is('removed_at', null)
    if (items.error) throw items.error
    const rows = (items.data ?? []) as unknown as { id: string; title: string; description: string | null; body_id: string | null; meeting: { date: string } }[]
    const bodies = await db().from('bodies').select('id, name').in('id', [...new Set(rows.map((r) => r.body_id ?? ''))])
    const name = new Map((bodies.data ?? []).map((b) => [b.id, b.name]))
    const existing = await untyped().from('item_perspectives').select('*').in('item_id', ids)
    if (existing.error) throw existing.error
    const prev = new Map(((existing.data ?? []) as PerspectiveRow[]).map((r) => [r.item_id, r]))
    return rows
      .sort((a, b) => a.meeting.date.localeCompare(b.meeting.date))
      .slice(0, limit)
      .map((r) => ({
        item: { item_id: r.id, title: r.title, description: r.description, body_name: name.get(r.body_id ?? '') ?? '', meeting_date: r.meeting.date },
        articles: byItem.get(r.id) ?? [],
        existing: prev.get(r.id) ?? null,
      }))
  },
  async save(row) {
    const { error } = await untyped().from('item_perspectives').upsert(row, { onConflict: 'item_id' })
    if (error) throw error
  },
}

/** Coverage rows for a set of items, for the weekly page. Missing table (P2 not migrated yet) means no coverage. */
export async function loadPerspectives(itemIds: string[]): Promise<Map<string, PerspectiveRow>> {
  if (!itemIds.length) return new Map()
  // The IDs go in the URL, so ask in batches; one huge list would fail and drop all coverage.
  const out = new Map<string, PerspectiveRow>()
  for (const ids of chunked(itemIds, 150)) {
    const { data, error } = await untyped().from('item_perspectives').select('*').in('item_id', ids)
    if (error) continue
    for (const r of (data ?? []) as PerspectiveRow[]) out.set(r.item_id, r)
  }
  return out
}
