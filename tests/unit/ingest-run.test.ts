import { describe, expect, it, vi } from 'vitest';
import type { Adapter, AdapterDocument, AdapterResult, Item, Meeting, RunMode, SourceConfig } from '@/lib/adapters/types';
import { createMemoryStore, type MemoryStore } from '@/lib/ingest/memoryStore';
import { leakingName } from '@/lib/ingest/redact';
import { runIngest, type IngestClassifier } from '@/lib/ingest/run';
import { seedAll } from '@/lib/ingest/seed';
import { FROZEN_NOW, loadExpected, mapFixture } from '../golden/legistar/fixtures';

const NOW = FROZEN_NOW; // Oct 18, 2026, noon Central
const at = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);
const iso = (d: Date) => d.toISOString();
const FUTURE = '2026-10-21T18:00:00-05:00';
const PAST = '2026-10-15T09:00:00-05:00';

const hisd: SourceConfig = { id: 'hisd_board', body_id: 'hisd_board', adapter: 'legistar', config: {} };
const county: SourceConfig = { id: 'hc_commissioners_court', body_id: 'commissioners_court', adapter: 'legistar', config: {} };
const mud: SourceConfig = { id: 'hcmud_489', body_id: 'hcmud_489', adapter: 'llm_extract', config: {} };
const council: SourceConfig = { id: 'houston_city_council', body_id: 'houston_city_council', adapter: 'primegov', config: {} };
const cfisd: SourceConfig = { id: 'cfisd_board', body_id: 'cfisd_board', adapter: 'boardbook', config: {} };

function meeting(ext: string, date: string, extra: Partial<Meeting> = {}, body = 'hcmud_489'): Meeting {
  return { external_id: ext, body_id: body, date, type: 'regular', status: 'scheduled', agenda_url: `https://example.org/${ext}.pdf`, ...extra };
}
function item(ext: string, m: string, title: string, extra: Partial<Item> = {}, body = 'hcmud_489'): Item {
  return {
    external_id: ext,
    meeting_external_id: m,
    body_id: body,
    title,
    status: 'upcoming',
    amounts: [],
    attachments: [],
    contains_private_person: false,
    source_url: `https://example.org/${m}.pdf`,
    ...extra,
  };
}
function doc(url: string, hash: string, raw = 'agenda text'): AdapterDocument {
  return { url, fetched_at: iso(NOW), content_hash: hash, raw, kind: 'pdf_text' };
}
function result(r: Partial<AdapterResult>): AdapterResult {
  return { meetings: [], items: [], documents: [], result_updates: [], warnings: [], ...r };
}

/** An adapter that returns whatever `get()` gives it and records how it was called. */
function fake(get: () => AdapterResult) {
  const calls: { mode: RunMode; prev?: { documentHashes: Record<string, string> }; source: SourceConfig }[] = [];
  const adapter: Adapter = {
    async run(source, mode, _window, prev) {
      calls.push({ source, mode: structuredClone(mode), prev });
      return structuredClone(get());
    },
  };
  return { adapter, calls };
}
const failing = (message: string): Adapter => ({
  async run() {
    throw new Error(message);
  },
});
const tierOf =
  (tier: 'sms' | 'weekly' | 'timeline'): IngestClassifier =>
  () => ({ item_type: 'other', tier });

async function seeded(...sources: SourceConfig[]): Promise<MemoryStore> {
  const store = createMemoryStore();
  await seedAll(store, sources);
  store.resetWrites();
  return store;
}
const dataWrites = (s: MemoryStore) => s.writes.filter((w) => w.table !== 'sources');
const tables = (s: MemoryStore) => structuredClone({ meetings: s.tables.meetings, items: s.tables.items, documents: s.tables.documents });
const row = (s: MemoryStore, ext: string) => s.tables.items.find((i) => i.external_id === ext)!;

describe('runIngest: inserting', () => {
  it('inserts the HISD 1332 meeting and items with meeting_id, hash, first_seen_at and review_status null', async () => {
    const { meeting: m, items } = mapFixture('houstonisd-1332');
    const store = await seeded(hisd);
    const { adapter } = fake(() => result({ meetings: [m], items }));
    const report = await runIngest({ store, source: hisd, mode: { kind: 'rotation' }, adapter, now: () => NOW });

    expect(report.ok).toBe(true);
    expect(store.tables.meetings).toHaveLength(1);
    const meetingId = store.tables.meetings[0]!.id;
    expect(store.tables.items).toHaveLength(items.length);
    expect(report.items.inserted).toBe(items.length);
    for (const r of store.tables.items) {
      expect(r.meeting_id).toBe(meetingId);
      expect(r.content_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(r.first_seen_at).toBe(iso(NOW));
      expect(r.review_status).toBeNull();
      expect(r.needs_story).toBe(true);
      expect(r.tier).not.toBeNull();
      expect(r.meeting_body_id).toBe('hisd_board');
    }
  });

  it('Commissioners Court 1244: Flood Control items keep body_id flood_control and meeting_body_id commissioners_court', async () => {
    const { meeting: m, items } = mapFixture('harriscountytx-1244');
    const hits = (loadExpected('harriscountytx-1244') as { attribution_hits: { external_id: string; body_id: string }[] }).attribution_hits;
    expect(hits.length).toBeGreaterThan(0);
    const store = await seeded(county);
    const { adapter } = fake(() => result({ meetings: [m], items }));
    await runIngest({ store, source: county, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    for (const h of hits) {
      expect(row(store, h.external_id).body_id).toBe(h.body_id);
      expect(row(store, h.external_id).meeting_body_id).toBe('commissioners_court');
    }
  });

  it('skips an item whose body has no row, with a warning', async () => {
    const store = await seeded(mud);
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'Approve minutes', {}, 'no_such_body')] }));
    const report = await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    expect(store.tables.items).toHaveLength(0);
    expect(report.items.skipped_unknown_body).toBe(1);
    expect(report.warnings).toBeGreaterThan(0);
  });

  it('redacted HISD personnel items never carry a name in stored text', async () => {
    const { meeting: m, items } = mapFixture('houstonisd-1332');
    expect(items.some((i) => i.contains_private_person)).toBe(true);
    const store = await seeded(hisd);
    const { adapter } = fake(() => result({ meetings: [m], items }));
    await runIngest({ store, source: hisd, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    for (const r of store.tables.items.filter((i) => i.contains_private_person)) {
      for (const text of [r.title, r.description, r.source_quote]) expect(text ? leakingName(text) : false, r.external_id).toBe(false);
    }
  });
});

describe('runIngest: running twice changes nothing', () => {
  const cases: [string, SourceConfig, () => AdapterResult][] = [
    [
      'Legistar (HISD 1332 fixture)',
      hisd,
      () => {
        const f = mapFixture('houstonisd-1332');
        return result({ meetings: [f.meeting], items: f.items, documents: [{ ...doc('https://webapi.legistar.com/x', 'a'), kind: 'json' }] });
      },
    ],
    [
      'Legistar (Commissioners Court 1244 fixture)',
      county,
      () => {
        const f = mapFixture('harriscountytx-1244');
        return result({ meetings: [f.meeting], items: f.items });
      },
    ],
    [
      'AI extraction (llm_extract)',
      mud,
      () =>
        result({
          meetings: [meeting('m1', FUTURE, { comment_rules_text: 'Public comment: 3 minutes.' })],
          items: [item('i1', 'm1', 'Approve the operating budget', { source_quote: 'Approve the operating budget', quote_verified: true, amounts: [{ value: 1200, text: '$1,200' }] })],
          documents: [doc('https://example.org/m1.pdf', 'h1')],
        }),
    ],
    [
      'PrimeGov',
      council,
      () =>
        result({
          meetings: [meeting('719', FUTURE, {}, 'houston_city_council')],
          items: [item('c1', '719', 'Ordinance on drainage fees', { agenda_number: '12', quote_verified: true }, 'houston_city_council')],
        }),
    ],
    [
      'BoardBook',
      cfisd,
      () =>
        result({
          meetings: [meeting('bb1', FUTURE, {}, 'cfisd_board')],
          items: [item('b1', 'bb1', 'Consider the 2026-27 school calendar', { section: 'Action Items', attachments: [{ name: 'Calendar', url: 'https://example.org/cal.pdf' }] }, 'cfisd_board')],
        }),
    ],
  ];
  for (const [name, source, get] of cases) {
    it(`${name}: a second identical run writes nothing`, async () => {
      const store = await seeded(source);
      const { adapter } = fake(get);
      await runIngest({ store, source, mode: { kind: 'rotation' }, adapter, now: () => NOW });
      const before = tables(store);
      store.resetWrites();
      const report = await runIngest({ store, source, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
      expect(dataWrites(store)).toEqual([]);
      expect(tables(store)).toEqual(before);
      expect(report.items.inserted + report.items.updated).toBe(0);
    });
  }

  it('calls classify on insert and not on an unchanged rerun', async () => {
    const store = await seeded(mud);
    const classify = vi.fn(tierOf('weekly'));
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'Approve budget'), item('i2', 'm1', 'Approve minutes')] }));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify, now: () => NOW });
    expect(classify).toHaveBeenCalledTimes(2);
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify, now: () => at(1) });
    expect(classify).toHaveBeenCalledTimes(2);
  });

  it('a title edit reclassifies and sets needs_story, with a new hash and the same first_seen_at', async () => {
    const store = await seeded(mud);
    let title = 'Approve budget';
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', title)] }));
    const classify = vi.fn(tierOf('weekly'));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify, now: () => NOW });
    const first = structuredClone(row(store, 'i1'));
    row(store, 'i1').needs_story = false; // P3 wrote the story

    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify, now: () => at(1) });
    expect(row(store, 'i1').needs_story).toBe(false); // unchanged item: P3's flag is kept

    title = 'Approve amended budget';
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify, now: () => at(2) });
    const r = row(store, 'i1');
    expect(classify).toHaveBeenCalledTimes(2);
    expect(r.needs_story).toBe(true);
    expect(r.content_hash).not.toBe(first.content_hash);
    expect(r.first_seen_at).toBe(first.first_seen_at);
    expect(r.title).toBe('Approve amended budget');
  });

  it('a decided item is never moved back by a refetch that has no outcome', async () => {
    const store = await seeded(mud);
    let status: Item['status'] = 'decided';
    const { adapter } = fake(() =>
      result({
        meetings: [meeting('m1', PAST)],
        items: [item('i1', 'm1', 'Approve budget', status === 'decided' ? { status, action: 'Approved', vote_result: 'passed' } : { status })],
      }),
    );
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    status = 'awaiting_result';
    store.resetWrites();
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
    expect(row(store, 'i1')).toMatchObject({ status: 'decided', action: 'Approved', vote_result: 'passed' });
    expect(dataWrites(store)).toEqual([]);
  });

  it('dryRun reports the counts and writes nothing', async () => {
    const store = await seeded(mud);
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'Approve budget')], documents: [doc('https://example.org/m1.pdf', 'h1')] }));
    const report = await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW, dryRun: true });
    expect(report.meetings.inserted).toBe(1);
    expect(report.items.inserted).toBe(1);
    expect(report.documents).toBe(1);
    expect(store.writes).toEqual([]);
    expect(store.tables.items).toEqual([]);
  });
});

describe('runIngest: review status', () => {
  async function once(source: SourceConfig, it: Item, classify: IngestClassifier, m = meeting(it.meeting_external_id, FUTURE, {}, it.body_id)) {
    const store = await seeded(source);
    const { adapter } = fake(() => result({ meetings: [m], items: [it] }));
    await runIngest({ store, source, mode: { kind: 'rotation' }, adapter, classify, now: () => NOW });
    return row(store, it.external_id);
  }

  it('an AI item classified sms is pending', async () => {
    expect((await once(mud, item('i1', 'm1', 'Bond election'), tierOf('sms'))).review_status).toBe('pending');
  });
  it('a PrimeGov item classified sms is pending (its items come from the AI too)', async () => {
    expect((await once(council, item('c1', '719', 'Tax rate', {}, 'houston_city_council'), tierOf('sms'))).review_status).toBe('pending');
  });
  it('an AI item that is not sms has no review status', async () => {
    expect((await once(mud, item('i1', 'm1', 'Approve minutes'), tierOf('weekly'))).review_status).toBeNull();
  });
  it('quote_verified=false is pending even when the tier is timeline', async () => {
    expect((await once(mud, item('i1', 'm1', 'Scanned item', { quote_verified: false }), tierOf('timeline'))).review_status).toBe('pending');
  });
  it('a Legistar item classified sms skips review', async () => {
    expect((await once(hisd, item('h1', 'e1', 'Bond election', {}, 'hisd_board'), tierOf('sms'))).review_status).toBeNull();
  });

  it('D16: an approved item whose hash changes and still classifies as sms goes back to pending', async () => {
    const store = await seeded(mud);
    let title = 'Bond election';
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', title)] }));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('sms'), now: () => NOW });
    row(store, 'i1').review_status = 'approved';
    title = 'Bond election, amended';
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('sms'), now: () => at(1) });
    expect(row(store, 'i1').review_status).toBe('pending');
  });

  it('an approved, unchanged item stays approved', async () => {
    const store = await seeded(mud);
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'Bond election')] }));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('sms'), now: () => NOW });
    row(store, 'i1').review_status = 'approved';
    store.resetWrites();
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('sms'), now: () => at(1) });
    expect(row(store, 'i1').review_status).toBe('approved');
    expect(dataWrites(store)).toEqual([]);
  });

  it('a rejected, unchanged item stays rejected with tier timeline', async () => {
    const store = await seeded(mud);
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'Bond election')] }));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('sms'), now: () => NOW });
    Object.assign(row(store, 'i1'), { review_status: 'rejected', tier: 'timeline' });
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('sms'), now: () => at(1) });
    expect(row(store, 'i1')).toMatchObject({ review_status: 'rejected', tier: 'timeline' });
  });
});

describe('runIngest: removed items', () => {
  it('an item missing from a refetched meeting gets removed_at and the row is kept', async () => {
    const store = await seeded(mud);
    let items = [item('i1', 'm1', 'One'), item('i2', 'm1', 'Two')];
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items }));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    items = [item('i1', 'm1', 'One')];
    const report = await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
    expect(store.tables.items).toHaveLength(2);
    expect(row(store, 'i2').removed_at).toBe(iso(at(1)));
    expect(row(store, 'i1').removed_at).toBeNull();
    expect(report.items.removed).toBe(1);
  });

  it("a meeting that isn't in the result leaves its items untouched", async () => {
    const store = await seeded(mud);
    let r = result({ meetings: [meeting('m1', FUTURE), meeting('m2', FUTURE)], items: [item('i1', 'm1', 'One'), item('i2', 'm2', 'Two')] });
    const { adapter } = fake(() => r);
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    r = result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'One')] });
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
    expect(row(store, 'i2').removed_at).toBeNull();
  });

  it('a meeting returned with zero items removes nothing (e.g. llm_unavailable)', async () => {
    const store = await seeded(mud);
    let r = result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'One')] });
    const { adapter } = fake(() => r);
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    r = result({ meetings: [meeting('m1', FUTURE)], warnings: ['llm_unavailable: no key'] });
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
    expect(row(store, 'i1').removed_at).toBeNull();
  });

  it('an item that comes back has removed_at cleared', async () => {
    const store = await seeded(mud);
    let items = [item('i1', 'm1', 'One'), item('i2', 'm1', 'Two')];
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items }));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    items = [item('i1', 'm1', 'One')];
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
    items = [item('i1', 'm1', 'One'), item('i2', 'm1', 'Two')];
    const report = await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(2) });
    expect(row(store, 'i2').removed_at).toBeNull();
    expect(report.items.restored).toBe(1);
  });
});

describe('runIngest: status moves and outcomes', () => {
  const soon = iso(at(1));

  it('a past upcoming item that was not refetched moves to awaiting_result, keeping needs_story and tier', async () => {
    const store = await seeded(mud);
    let r = result({ meetings: [meeting('m1', soon)], items: [item('i1', 'm1', 'Approve budget')] });
    const { adapter } = fake(() => r);
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('weekly'), now: () => NOW });
    const hash = row(store, 'i1').content_hash;
    row(store, 'i1').needs_story = false;

    r = result({});
    const report = await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('weekly'), now: () => at(2) });
    expect(row(store, 'i1')).toMatchObject({ status: 'awaiting_result', needs_story: false, tier: 'weekly' });
    expect(row(store, 'i1').content_hash).not.toBe(hash);
    expect(report.items.awaiting).toBe(1);

    // A later refetch that reports the same item as awaiting_result is a no-op.
    r = result({ meetings: [meeting('m1', soon)], items: [item('i1', 'm1', 'Approve budget', { status: 'awaiting_result' })] });
    store.resetWrites();
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify: tierOf('weekly'), now: () => at(3) });
    expect(dataWrites(store)).toEqual([]);
  });

  it('items of a cancelled meeting are not moved to awaiting_result', async () => {
    const store = await seeded(mud);
    let r = result({ meetings: [meeting('m1', soon, { status: 'cancelled' })], items: [item('i1', 'm1', 'Approve budget')] });
    const { adapter } = fake(() => r);
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    r = result({});
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(2) });
    expect(row(store, 'i1').status).toBe('upcoming');
  });

  async function pastMeeting() {
    const store = await seeded(mud);
    const { adapter } = fake(() => result({ meetings: [meeting('m1', PAST)], items: [item('i1', 'm1', 'Approve budget', { status: 'awaiting_result' })] }));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    row(store, 'i1').needs_story = false;
    return store;
  }
  const update = (extra: object = {}) => ({
    meeting_external_id: 'm1',
    item_external_id: 'i1',
    action: 'Approved',
    vote_result: 'passed' as const,
    source_url: 'https://example.org/minutes-oct-15.pdf',
    source_quote: 'approved the budget',
    quote_verified: true,
    ...extra,
  });

  it('a verified ResultUpdate marks the item decided, sets needs_story and fills the meeting minutes_url', async () => {
    const store = await pastMeeting();
    const { adapter } = fake(() => result({ result_updates: [update()] }));
    const report = await runIngest({ store, source: mud, mode: { kind: 'results', meeting_external_ids: ['m1'] }, adapter, now: () => at(1) });
    expect(row(store, 'i1')).toMatchObject({ status: 'decided', action: 'Approved', vote_result: 'passed', needs_story: true });
    expect(store.tables.meetings[0]!.minutes_url).toBe('https://example.org/minutes-oct-15.pdf');
    expect(report.result_updates.applied).toBe(1);
  });

  it('an unverified ResultUpdate is not applied', async () => {
    const store = await pastMeeting();
    const { adapter } = fake(() => result({ result_updates: [update({ quote_verified: false })] }));
    const report = await runIngest({ store, source: mud, mode: { kind: 'results', meeting_external_ids: ['m1'] }, adapter, now: () => at(1) });
    expect(row(store, 'i1').status).toBe('awaiting_result');
    expect(report.result_updates.skipped_unverified).toBe(1);
  });

  it('an update for an unknown item creates no item', async () => {
    const store = await pastMeeting();
    const { adapter } = fake(() => result({ result_updates: [update({ item_external_id: 'not-on-the-agenda' })] }));
    const report = await runIngest({ store, source: mud, mode: { kind: 'results', meeting_external_ids: ['m1'] }, adapter, now: () => at(1) });
    expect(store.tables.items).toHaveLength(1);
    expect(report.result_updates.unknown_item).toBe(1);
  });

  it('results mode hands the adapter the stored meetings and items and stamps last_results_check', async () => {
    const store = await pastMeeting();
    const { adapter, calls } = fake(() => result({}));
    await runIngest({ store, source: mud, mode: { kind: 'results', meeting_external_ids: ['m1'] }, adapter, now: () => at(1) });
    const mode = calls[0]!.mode as Extract<RunMode, { kind: 'results' }>;
    expect(mode.known?.meetings.map((m) => m.external_id)).toEqual(['m1']);
    expect(mode.known?.items.map((i) => i.external_id)).toEqual(['i1']);
    expect(store.tables.meetings[0]!.last_results_check).toBe(iso(at(1)));
  });

  it('P2-F supplemental item: a meeting 48 hours out gains an 11th item on the next run, with that run as first_seen_at', async () => {
    const store = await seeded(mud);
    const date = iso(at(48));
    let n = 10;
    const { adapter } = fake(() => result({ meetings: [meeting('m1', date)], items: Array.from({ length: n }, (_, i) => item(`i${i + 1}`, 'm1', `Item number ${i + 1}`)) }));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    n = 11;
    const report = await runIngest({ store, source: mud, mode: { kind: 'near_term' }, adapter, now: () => at(1) });
    expect(report.items.inserted).toBe(1);
    expect(row(store, 'i11').first_seen_at).toBe(iso(at(1)));
    expect(row(store, 'i1').first_seen_at).toBe(iso(NOW));
  });

  it('a rescheduled meeting records previous_date and reclassifies its items with the move', async () => {
    const store = await seeded(mud);
    let date = '2026-10-21T18:00:00-05:00';
    const { adapter } = fake(() => result({ meetings: [meeting('m1', date)], items: [item('i1', 'm1', 'Approve budget')] }));
    const classify = vi.fn(tierOf('weekly'));
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify, now: () => NOW });
    row(store, 'i1').needs_story = false;

    date = '2026-10-28T18:00:00-05:00';
    const report = await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify, now: () => at(1) });
    const m = store.tables.meetings[0]!;
    expect(Date.parse(m.previous_date!)).toBe(Date.parse('2026-10-21T18:00:00-05:00'));
    expect(report.meetings.moved).toBe(1);
    expect(classify).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), null, { date, previous_date: '2026-10-21T18:00:00-05:00' });
    expect(row(store, 'i1').needs_story).toBe(true);

    store.resetWrites();
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, classify, now: () => at(2) });
    expect(dataWrites(store)).toEqual([]);
  });
});

describe('runIngest: documents', () => {
  it('stores each (url, hash) once', async () => {
    const store = await seeded(mud);
    const { adapter } = fake(() =>
      result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'One')], documents: [doc('https://example.org/index', 'p1'), doc('https://example.org/m1.pdf', 'h1')] }),
    );
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
    expect(store.tables.documents).toHaveLength(2);
    expect(store.tables.documents.find((d) => d.url === 'https://example.org/m1.pdf')?.meeting_external_id).toBe('m1');
  });

  it('only passes back hashes of documents that produced stored items, so a failed extraction is retried', async () => {
    const store = await seeded(mud);
    let r = result({ meetings: [meeting('m1', FUTURE)], documents: [doc('https://example.org/m1.pdf', 'h1')], warnings: ['extraction failed'] });
    const { adapter, calls } = fake(() => r);
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
    expect(calls[1]!.prev?.documentHashes['https://example.org/m1.pdf']).toBeUndefined();

    r = result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'One')], documents: [doc('https://example.org/m1.pdf', 'h1')] });
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(2) });
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(3) });
    expect(calls[3]!.prev?.documentHashes['https://example.org/m1.pdf']).toBe('h1');
  });

  it('stores raw over 1 MB as null and keeps its hash', async () => {
    const store = await seeded(hisd);
    const big = { ...doc('https://webapi.legistar.com/big', 'bighash', 'x'.repeat(1_000_001)), kind: 'json' as const };
    const { adapter } = fake(() => result({ documents: [big] }));
    await runIngest({ store, source: hisd, mode: { kind: 'rotation' }, adapter, now: () => NOW });
    expect(store.tables.documents[0]).toMatchObject({ raw: null, content_hash: 'bighash' });
  });
});

describe('runIngest: source health', () => {
  it('an adapter that throws records last_error and fetch_failed, writes no rows and leaves last_success alone', async () => {
    const store = await seeded(hisd);
    const report = await runIngest({ store, source: hisd, mode: { kind: 'rotation' }, adapter: failing('GET https://webapi.legistar.com/v1/houstonisd/events -> 503'), now: () => NOW });
    expect(report.ok).toBe(false);
    expect(report.error).toContain('503');
    const src = store.tables.sources.find((s) => s.id === 'hisd_board')!;
    expect(src.last_error).toContain('503');
    expect(src.last_flags).toContain('fetch_failed');
    expect(src.last_success).toBeNull();
    expect(dataWrites(store)).toEqual([]);
  });

  it('only rotation runs set last_checked; every successful run sets last_success and last_flags', async () => {
    const store = await seeded(mud);
    const { adapter } = fake(() => result({ meetings: [meeting('m1', FUTURE)], items: [item('i1', 'm1', 'One')] }));
    await runIngest({ store, source: mud, mode: { kind: 'near_term' }, adapter, now: () => NOW });
    let src = store.tables.sources.find((s) => s.id === 'hcmud_489')!;
    expect(src.last_checked).toBeNull();
    expect(src.last_success).toBe(iso(NOW));
    expect(Array.isArray(src.last_flags)).toBe(true);
    await runIngest({ store, source: mud, mode: { kind: 'rotation' }, adapter, now: () => at(1) });
    src = store.tables.sources.find((s) => s.id === 'hcmud_489')!;
    expect(src.last_checked).toBe(iso(at(1)));
  });
});
