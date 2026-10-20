import { describe, expect, it } from 'vitest'
import { applyJudge, articlesHash, orderGroups, usableArticles } from '@/lib/perspectives/build'
import { checkExtraction } from '@/lib/perspectives/checks'
import { runPerspectivesJob, type Candidate, type PerspectivesStore } from '@/lib/perspectives/job'
import type { Extraction, Group, Judgement, LinkedArticle, PerspectiveItem, PerspectiveRow } from '@/lib/perspectives/types'
import { buildWeekly, type WeeklyItem } from '@/lib/weekly/build'

// Spec §9 (P3 rows). Outlets and text are obvious placeholders, never real outlets with
// invented quotes (spec §7.2).

const item: PerspectiveItem = {
  item_id: 'item-1',
  title: 'Approve a $38,500,000 expansion of the water plant',
  body_name: 'Example Utility District',
  meeting_date: '2026-10-28T16:00:00Z',
}

const articleA: LinkedArticle = {
  article_id: 'a1',
  outlet: 'Example Outlet A',
  headline: 'Board weighs water plant expansion',
  url: 'https://example.org/a1',
  published_at: '2026-10-10T12:00:00Z',
  content_hash: 'h1',
  status: 'ok',
  text: 'Residents near the plant say rates could rise to pay for the $38.5 million project. "We are already paying more every month," one resident said. Board president Dana Example said the plant is at capacity and needs room for 2,000 new homes.',
}
const articleB: LinkedArticle = {
  article_id: 'a2',
  outlet: 'Example Outlet B',
  headline: 'Water plant vote set',
  url: 'https://example.org/a2',
  published_at: '2026-10-12T12:00:00Z',
  content_hash: 'h2',
  status: 'ok',
  text: 'Business owners argue the expansion would bring jobs. "Growth needs water," a local shop owner said.',
}

const good: Extraction = {
  groups: [
    {
      label: 'Residents near the plant',
      arguments: [{ summary: 'Residents say rates could rise to pay for the project.', quote: 'We are already paying more every month', article_id: 'a1' }],
    },
    {
      label: 'District board',
      arguments: [{ summary: 'The board president says the plant needs room for 2,000 new homes.', quote: 'the plant is at capacity', article_id: 'a1' }],
    },
  ],
}

describe('code checks (§6.3)', () => {
  it('keeps arguments that pass every check', () => {
    const r = checkExtraction(good, [articleA, articleB], item)
    expect(r.dropped).toBe(0)
    expect(r.groups.map((g) => g.label_en)).toEqual(['Residents near the plant', 'District board'])
  })

  const one = (label: string, summary: string, quote: string, article_id = 'a1'): Extraction => ({
    groups: [{ label, arguments: [{ summary, quote, article_id }] }],
  })

  it('drops a fake quote', () => {
    expect(checkExtraction(one('Residents', 'Residents say rates could rise.', 'We will never pay this'), [articleA], item).reasons).toEqual([
      'quote is not exact',
    ])
  })
  it('drops a changed number', () => {
    const r = checkExtraction(one('District board', 'The board says it needs room for 3,000 new homes.', 'the plant is at capacity'), [articleA], item)
    expect(r.reasons[0]).toMatch(/number/)
  })
  it('drops an invented dollar figure', () => {
    const r = checkExtraction(one('Residents', 'Residents say the project costs $90 million.', 'We are already paying more every month'), [articleA], item)
    expect(r.reasons[0]).toMatch(/number/)
  })
  it('drops a stance label', () => {
    const r = checkExtraction(one('Opponents', 'Residents say rates could rise.', 'We are already paying more every month'), [articleA], item)
    expect(r.reasons[0]).toMatch(/stance label/)
  })
  it("drops a private resident's name but allows an official named near their role", () => {
    const withName: LinkedArticle = { ...articleA, text: `${articleA.text} Maria Gonzalez, who lives nearby, worries about her bill.` }
    const r = checkExtraction(one('Residents', 'Maria Gonzalez worries about her bill.', 'worries about her bill', 'a1'), [withName], item)
    expect(r.reasons[0]).toMatch(/private individual/)
    const official = checkExtraction(one('District board', 'Board president Dana Example says the plant is at capacity.', 'the plant is at capacity'), [articleA], item)
    expect(official.dropped).toBe(0)
  })
  it('drops arguments from removed or unknown articles', () => {
    const r = checkExtraction(one('Residents', 'Residents say rates could rise.', 'We are already paying more every month', 'nope'), [articleA], item)
    expect(r.reasons[0]).toMatch(/unknown/)
  })
})

describe('judge (§6.4)', () => {
  const groups = checkExtraction(good, [articleA], item).groups
  const verdict = (index: number, over: Partial<Judgement['verdicts'][number]> = {}) => ({
    index,
    faithful: true,
    attributed: true,
    neutral_wording: true,
    label_fits: true,
    private_individual_named: false,
    ...over,
  })
  it('drops an argument that fails faithful', () => {
    const r = applyJudge(groups, { verdicts: [verdict(0, { faithful: false }), verdict(1)], one_sided: false })
    expect(r.dropped).toBe(1)
    expect(r.groups.map((g) => g.label_en)).toEqual(['District board'])
  })
  it('drops arguments with no verdict at all', () => {
    expect(applyJudge(groups, { verdicts: [verdict(0)], one_sided: false }).dropped).toBe(1)
  })
})

function memory(candidates: Candidate[]) {
  const saved: PerspectiveRow[] = []
  const store: PerspectivesStore = {
    async candidates() {
      return candidates
    },
    async save(row) {
      saved.push(row)
    },
  }
  return { store, saved }
}

const allPass = async (_i: PerspectiveItem, _a: LinkedArticle[], groups: Group[]): Promise<Judgement> => ({
  verdicts: groups.flatMap((g) => g.arguments).map((_, index) => ({ index, faithful: true, attributed: true, neutral_wording: true, label_fits: true, private_individual_named: false })),
  one_sided: false,
})

describe('the job', () => {
  const now = new Date('2026-10-20T12:00:00Z')

  it('builds an ok row with sources, outlet count and the one-sided rule', async () => {
    const m = memory([{ item, articles: [articleA, articleB], existing: null }])
    const r = await runPerspectivesJob({ store: m.store, extract: async () => good, judge: allPass, now })
    expect(r.generated).toBe(1)
    const row = m.saved[0]!
    expect(row.state).toBe('ok')
    expect(row.outlet_count).toBe(2)
    expect(row.sources).toHaveLength(2)
    expect(row.one_sided).toBe(false)
  })

  it('one group means one-sided; the judge can also mark it one-sided', async () => {
    const single: Extraction = { groups: [good.groups[0]!] }
    const m1 = memory([{ item, articles: [articleA], existing: null }])
    await runPerspectivesJob({ store: m1.store, extract: async () => single, judge: allPass, now })
    expect(m1.saved[0]!.one_sided).toBe(true)
    const m2 = memory([{ item, articles: [articleA], existing: null }])
    await runPerspectivesJob({
      store: m2.store,
      extract: async () => good,
      judge: async (...a) => ({ ...(await allPass(...a)), one_sided: true }),
      now,
    })
    expect(m2.saved[0]!.one_sided).toBe(true)
  })

  it('a failed judge call keeps the previous row', async () => {
    const previous = { item_id: 'item-1', articles_hash: 'old' } as PerspectiveRow
    const m = memory([{ item, articles: [articleA], existing: previous }])
    const r = await runPerspectivesJob({
      store: m.store,
      extract: async () => good,
      judge: async () => {
        throw new Error('judge timeout')
      },
      now,
    })
    expect(r.kept_previous).toBe(1)
    expect(m.saved).toHaveLength(0)
  })

  it('no surviving arguments gives sources_only, still listing sources', async () => {
    const m = memory([{ item, articles: [articleA], existing: null }])
    await runPerspectivesJob({ store: m.store, extract: async () => ({ groups: [] }), judge: allPass, now })
    expect(m.saved[0]).toMatchObject({ state: 'sources_only', outlet_count: 1 })
  })

  it("doesn't regenerate when the articles haven't changed", async () => {
    const hash = articlesHash(usableArticles([articleA], item.meeting_date))
    const m = memory([{ item, articles: [articleA], existing: { item_id: 'item-1', articles_hash: hash } as PerspectiveRow }])
    const r = await runPerspectivesJob({ store: m.store, extract: async () => good, judge: allPass, now })
    expect(r.unchanged).toBe(1)
  })

  it('freeze: an article published after the meeting start does not change the hash', () => {
    const late: LinkedArticle = { ...articleB, article_id: 'late', published_at: '2026-10-29T00:00:00Z' }
    expect(articlesHash(usableArticles([articleA, late], item.meeting_date))).toBe(articlesHash(usableArticles([articleA], item.meeting_date)))
  })

  it('removal after the freeze drops that article without calling Gemini', async () => {
    const m0 = memory([{ item, articles: [articleA, articleB], existing: null }])
    await runPerspectivesJob({ store: m0.store, extract: async () => good, judge: allPass, now })
    const row = m0.saved[0]!
    const m = memory([{ item, articles: [{ ...articleA, status: 'removed' }, articleB], existing: row }])
    let called = false
    await runPerspectivesJob({
      store: m.store,
      extract: async () => {
        called = true
        return good
      },
      judge: allPass,
      now: new Date('2026-10-29T00:00:00Z'),
    })
    expect(called).toBe(false)
    expect(m.saved[0]!.state).toBe('sources_only')
    expect(m.saved[0]!.sources.map((s) => s.outlet)).toEqual(['Example Outlet B'])
  })
})

describe('group order (§6.5)', () => {
  it('is deterministic, and official groups are not always first across items', () => {
    const groups: Group[] = ['District board', 'Residents near the plant', 'Business owners'].map((label_en) => ({ label_en, arguments: [] }))
    expect(orderGroups('x', groups)).toEqual(orderGroups('x', [...groups].reverse()))
    const firsts = new Set(Array.from({ length: 20 }, (_, i) => orderGroups(`item-${i}`, groups)[0]!.label_en))
    expect(firsts.size).toBeGreaterThan(1)
  })
})

describe('ranking tie-breaker (§7.4)', () => {
  const base = (over: Partial<WeeklyItem>): WeeklyItem => ({
    item_id: 'x',
    body_id: 'b',
    body_name: 'Body',
    body_type: 'commissioners_court',
    title: 't',
    item_type: 'budget',
    tier: 'weekly',
    status: 'upcoming',
    meeting_date: '2026-10-30T15:00:00Z',
    source_url: 'https://example.org',
    ...over,
  })
  it('orders otherwise-equal items by outlet count but never changes the lead', () => {
    const items = [base({ item_id: 'lead', meeting_date: '2026-10-25T15:00:00Z' }), base({ item_id: 'quiet' }), base({ item_id: 'covered', outlet_count: 3 })]
    const ed = buildWeekly({ items, bodies: [], stakes: [], now: new Date('2026-10-20T12:00:00Z'), lang: 'en' })
    expect(ed.lead?.item_id).toBe('lead')
    expect(ed.comingUp.map((i) => i.item_id)).toEqual(['covered', 'quiet'])
    const covered = buildWeekly({ items: items.map((i) => (i.item_id === 'quiet' ? { ...i, outlet_count: 9 } : i)), bodies: [], stakes: [], now: new Date('2026-10-20T12:00:00Z'), lang: 'en' })
    expect(covered.lead?.item_id).toBe('lead')
  })
})
