import { z } from 'zod'

// News coverage perspectives (.plans/news-coverage-perspectives-spec.md, Technical Plan §9a).
// P2 collects and links articles; this module extracts, checks, judges and displays.

/** A linked article as P3 reads it (P2's news_articles + news_article_items). Text is admin-only. */
export type LinkedArticle = {
  article_id: string
  outlet: string
  headline: string
  url: string
  published_at: string
  content_hash: string
  status: 'ok' | 'removed' | string
  text: string | null
}

/** The facts about the agenda item that summaries may cite (spec §6.3, check 3). */
export type PerspectiveItem = {
  item_id: string
  title: string
  description?: string | null
  body_name: string
  meeting_date: string
}

/** Gemini extraction output (spec §6.2). Caps: 4 groups, 2 arguments each, 8 in total. */
export const ExtractionSchema = z.object({
  groups: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        arguments: z
          .array(z.object({ summary: z.string().min(1).max(400), quote: z.string().min(1).max(400), article_id: z.string().min(1) }))
          .min(1)
          .max(2),
      }),
    )
    .max(4),
})
export type Extraction = z.infer<typeof ExtractionSchema>

/** Gemini judge output (spec §6.4): approve or reject only, one verdict per argument, in order. */
export const JudgeSchema = z.object({
  verdicts: z.array(
    z.object({
      index: z.number().int().min(0),
      faithful: z.boolean(),
      attributed: z.boolean(),
      neutral_wording: z.boolean(),
      label_fits: z.boolean(),
      private_individual_named: z.boolean(),
    }),
  ),
  one_sided: z.boolean(),
})
export type Judgement = z.infer<typeof JudgeSchema>

export type Argument = { summary_en: string; quote: string; article_id: string; outlet: string; url: string; published_at: string }
export type Group = { label_en: string; arguments: Argument[] }
export type Source = { outlet: string; headline: string; url: string; published_at: string }

/** One `item_perspectives` row (spec §5). */
export type PerspectiveRow = {
  item_id: string
  articles_hash: string
  state: 'ok' | 'sources_only'
  groups: Group[]
  sources: Source[]
  outlet_count: number
  one_sided: boolean
  dropped_count: number
  extract_model: string | null
  judge_model: string | null
  generated_at: string
  frozen_at: string
}

/** What /api/weekly and the pages get for each item (spec §7.5). Article text never leaves the server. */
export type Coverage = {
  state: 'none' | 'ok' | 'sources_only'
  outlet_count: number
  viewpoint_count: number
  one_sided: boolean
  groups: Group[]
  sources: Source[]
}

export const NO_COVERAGE: Coverage = { state: 'none', outlet_count: 0, viewpoint_count: 0, one_sided: false, groups: [], sources: [] }

export function toCoverage(row: PerspectiveRow | null | undefined): Coverage {
  if (!row || row.sources.length === 0) return NO_COVERAGE
  return {
    state: row.state,
    outlet_count: row.outlet_count,
    viewpoint_count: row.groups.reduce((n, g) => n + g.arguments.length, 0),
    one_sided: row.one_sided,
    groups: row.groups,
    sources: row.sources,
  }
}
