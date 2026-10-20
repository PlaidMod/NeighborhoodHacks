import { createHash } from 'node:crypto'
import type { Group, Judgement, LinkedArticle, PerspectiveRow, Source } from './types'

// Assembling an item_perspectives row (perspectives spec §6.1, §6.4, §6.5).

const sha = (alg: 'sha1' | 'sha256', s: string) => createHash(alg).update(s).digest('hex')

/** Articles that may feed the block: ok, with text, and published before the meeting start (the freeze). */
export function usableArticles(articles: LinkedArticle[], meetingStart: string): LinkedArticle[] {
  const start = new Date(meetingStart).getTime()
  return articles.filter((a) => a.status === 'ok' && !!a.text && new Date(a.published_at).getTime() < start)
}

/** sha256 of the sorted (article_id, content_hash) pairs used (§5). */
export function articlesHash(articles: LinkedArticle[]): string {
  return sha(
    'sha256',
    articles
      .map((a) => `${a.article_id}:${a.content_hash}`)
      .sort()
      .join('|'),
  )
}

/** Every linked article that's still up, including ones that produced no argument (§7.1). */
export function sourcesOf(articles: LinkedArticle[], meetingStart: string): Source[] {
  const start = new Date(meetingStart).getTime()
  return articles
    .filter((a) => a.status !== 'removed' && new Date(a.published_at).getTime() < start)
    .sort((a, b) => b.published_at.localeCompare(a.published_at) || a.outlet.localeCompare(b.outlet))
    .map((a) => ({ outlet: a.outlet, headline: a.headline, url: a.url, published_at: a.published_at }))
}

/** Group order rotates by hash, so no kind of group (officials, residents) is always first (§6.5, N16). */
export function orderGroups(itemId: string, groups: Group[]): Group[] {
  return groups
    .map((g) => ({
      ...g,
      arguments: [...g.arguments].sort((a, b) => a.published_at.localeCompare(b.published_at) || a.outlet.localeCompare(b.outlet)),
    }))
    .sort((a, b) => sha('sha1', itemId + a.label_en).localeCompare(sha('sha1', itemId + b.label_en)))
}

/** Drops every argument the judge rejects (§6.4). Verdicts are matched by position across all groups. */
export function applyJudge(groups: Group[], judgement: Judgement): { groups: Group[]; dropped: number } {
  const ok = new Map(
    judgement.verdicts.map((v) => [v.index, v.faithful && v.attributed && v.neutral_wording && v.label_fits && !v.private_individual_named]),
  )
  let index = 0
  let dropped = 0
  const kept = groups
    .map((g) => ({
      ...g,
      arguments: g.arguments.filter(() => {
        const pass = ok.get(index++) === true
        if (!pass) dropped++
        return pass
      }),
    }))
    .filter((g) => g.arguments.length > 0)
  return { groups: kept, dropped }
}

export function finalize(input: {
  itemId: string
  meetingStart: string
  hash: string
  groups: Group[]
  sources: Source[]
  judgeOneSided: boolean
  dropped: number
  extractModel: string | null
  judgeModel: string | null
  now: Date
}): PerspectiveRow {
  const groups = orderGroups(input.itemId, input.groups)
  return {
    item_id: input.itemId,
    articles_hash: input.hash,
    state: groups.length ? 'ok' : 'sources_only',
    groups,
    sources: input.sources,
    outlet_count: new Set(input.sources.map((s) => s.outlet)).size,
    one_sided: groups.length < 2 || input.judgeOneSided,
    dropped_count: input.dropped,
    extract_model: input.extractModel,
    judge_model: input.judgeModel,
    generated_at: input.now.toISOString(),
    frozen_at: input.meetingStart,
  }
}

/**
 * After the freeze, an article that's been taken down only removes its arguments and
 * its source line. No Gemini call (§6.1).
 */
export function withoutRemoved(row: PerspectiveRow, removedUrls: Set<string>, now: Date): PerspectiveRow {
  const groups = row.groups
    .map((g) => ({ ...g, arguments: g.arguments.filter((a) => !removedUrls.has(a.url)) }))
    .filter((g) => g.arguments.length > 0)
  const sources = row.sources.filter((s) => !removedUrls.has(s.url))
  return {
    ...row,
    groups,
    sources,
    state: groups.length ? 'ok' : 'sources_only',
    outlet_count: new Set(sources.map((s) => s.outlet)).size,
    one_sided: groups.length < 2 || row.one_sided,
    generated_at: now.toISOString(),
  }
}
