import type { Json } from '@/lib/database.types'
import { db } from '@/lib/db'
import { writeStories, type JsonGenerator } from './generate'
import type { StoryFacts, StoryResult } from './types'

// The story job (scraper spec D4): P2's ingest sets items.needs_story, and this job
// writes the English and Spanish stories. Every flagged item gets a story whatever its
// tier, so personnel items still get one (scraper spec D9). Stories never see news text.

export interface StoryStore {
  /** Items waiting for a story, soonest meeting first. */
  pending(limit: number): Promise<StoryFacts[]>
  save(itemId: string, result: StoryResult): Promise<void>
}

export type StoryJobResult = { processed: number; ai: number; template: number; failed: number }

export async function runStoryJob(opts: { store: StoryStore; generate?: JsonGenerator; limit?: number }): Promise<StoryJobResult> {
  const out: StoryJobResult = { processed: 0, ai: 0, template: 0, failed: 0 }
  const batch = await opts.store.pending(opts.limit ?? 10)
  for (const facts of batch) {
    try {
      const result = await writeStories(facts, opts.generate)
      await opts.store.save(facts.item_id, result)
      out.processed++
      if (result.story_source === 'ai') out.ai++
      else out.template++
      // Only the problem kinds are logged: never story text or item details.
      if (result.problems.length) console.warn(`story ${facts.item_id}: ${result.problems.length} check problem(s)`)
    } catch (error) {
      out.failed++
      console.error(`story ${facts.item_id} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return out
}

type Amount = StoryFacts['amounts'][number]

function amountsFrom(value: Json): Amount[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((a) => {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return []
    const v = Number((a as Record<string, Json>).value)
    const text = (a as Record<string, Json>).text
    if (!Number.isFinite(v) || typeof text !== 'string') return []
    return [{ value: v, text, kind: (a as Record<string, Json>).kind === 'rate' ? ('rate' as const) : ('money' as const) }]
  })
}

/** Reads and writes items in Supabase. Server-only. */
export const supabaseStoryStore: StoryStore = {
  async pending(limit) {
    const { data, error } = await db()
      .from('items')
      .select(
        'id, body_id, title, description, agenda_number, status, action, vote_result, amounts, contains_private_person, source_url, meeting:meetings!inner(date, status, type)',
      )
      .eq('needs_story', true)
      .is('removed_at', null)
      .order('date', { referencedTable: 'meetings', ascending: true })
      .limit(limit)
    if (error) throw error
    type Row = {
      id: string
      body_id: string | null
      title: string
      description: string | null
      agenda_number: string | null
      status: string
      action: string | null
      vote_result: string | null
      amounts: Json
      contains_private_person: boolean
      source_url: string
      meeting: { date: string; status: string; type: string | null } | null
    }
    const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.body_id && r.meeting)
    const bodyIds = [...new Set(rows.map((r) => r.body_id!))]
    if (!bodyIds.length) return []

    const [bodies, rates, elections] = await Promise.all([
      db().from('bodies').select('id, name').in('id', bodyIds),
      db().from('tax_rates').select('body_id, year, adopted_rate, no_new_revenue_rate, voter_approval_rate').in('body_id', bodyIds).order('year', { ascending: false }),
      db().from('elections').select('body_id, date, votes_cast, registered_voters').in('body_id', bodyIds).order('date', { ascending: false }),
    ])
    for (const r of [bodies, rates, elections]) if (r.error) throw r.error

    const nameOf = new Map((bodies.data ?? []).map((b) => [b.id, b.name]))
    const rateOf = new Map<string, NonNullable<typeof rates.data>[number]>()
    for (const r of rates.data ?? []) if (!rateOf.has(r.body_id)) rateOf.set(r.body_id, r)
    const electionOf = new Map<string, NonNullable<typeof elections.data>[number]>()
    for (const e of elections.data ?? []) if (e.body_id && !electionOf.has(e.body_id)) electionOf.set(e.body_id, e)

    return rows.map((r): StoryFacts => {
      const rate = rateOf.get(r.body_id!)
      const election = electionOf.get(r.body_id!)
      return {
        item_id: r.id,
        body_name: nameOf.get(r.body_id!) ?? r.body_id!,
        meeting_date: r.meeting!.date,
        meeting_type: r.meeting!.type === 'special' ? 'special' : 'regular',
        meeting_status: r.meeting!.status === 'cancelled' ? 'cancelled' : 'scheduled',
        agenda_number: r.agenda_number ?? undefined,
        title: r.title,
        description: r.description ?? undefined,
        status: r.status as StoryFacts['status'],
        outcome:
          r.action || r.vote_result
            ? { action: r.action ?? undefined, vote_result: (r.vote_result ?? undefined) as 'passed' | 'failed' | 'no_action' | undefined }
            : undefined,
        amounts: amountsFrom(r.amounts),
        tax_rates: rate
          ? { adopted_rate: rate.adopted_rate, no_new_revenue_rate: rate.no_new_revenue_rate, voter_approval_rate: rate.voter_approval_rate }
          : undefined,
        last_election:
          election?.date && typeof election.votes_cast === 'number'
            ? { date: election.date, votes_cast: election.votes_cast, registered_voters: election.registered_voters ?? undefined }
            : undefined,
        contains_private_person: r.contains_private_person,
        source_url: r.source_url,
      }
    })
  },

  async save(itemId, result) {
    const { error } = await db()
      .from('items')
      .update({
        story_en: result.story_en as unknown as Json,
        story_es: result.story_es as unknown as Json,
        story_source: result.story_source,
        needs_story: false,
      })
      .eq('id', itemId)
    if (error) throw error
  },
}
