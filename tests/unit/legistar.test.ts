import { describe, expect, it } from 'vitest';
import {
  LegistarConfigSchema,
  createLegistarAdapter,
  eventsUrl,
  isExcludedEvent,
  isSectionHeader,
  mapEvent,
  stripHtml,
  voteResult,
  type LegistarEvent,
  type LegistarEventItem,
} from '@/lib/adapters/legistar';
import { AdapterResultSchema, type SourceConfig } from '@/lib/adapters/types';
import { FIXTURE_NAMES, FROZEN_NOW, loadExpected, loadFixture, mapFixture, type FixtureName } from '../golden/legistar/fixtures';

type Expected = {
  meeting: { external_id: string; date: string; type: string; status: string; agenda_url: string; has_comment_rules: boolean };
  item_count: number;
  spot_checks: { external_id: string; title: string; agenda_number: string | null; section: string | null; status: string; vote_result: string | null }[];
  attribution_hits: { external_id: string; body_id: string }[];
  redacted_titles: { external_id: string; title: string }[];
};

describe('Legistar golden fixtures', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name} matches expected.json`, () => {
      const exp = loadExpected(name) as Expected;
      const { meeting, items } = mapFixture(name);
      expect({
        external_id: meeting.external_id,
        date: meeting.date,
        type: meeting.type,
        status: meeting.status,
        agenda_url: meeting.agenda_url,
        has_comment_rules: !!meeting.comment_rules_text,
      }).toEqual(exp.meeting);
      expect(items).toHaveLength(exp.item_count);
      const byId = new Map(items.map((i) => [i.external_id, i]));
      for (const s of exp.spot_checks) {
        const i = byId.get(s.external_id)!;
        expect(i, s.external_id).toBeDefined();
        expect({
          external_id: i.external_id,
          title: i.title,
          agenda_number: i.agenda_number ?? null,
          section: i.section ?? null,
          status: i.status,
          vote_result: i.vote_result ?? null,
        }).toEqual(s);
      }
      expect(items.filter((i) => i.body_id !== meeting.body_id).map((i) => ({ external_id: i.external_id, body_id: i.body_id }))).toEqual(
        exp.attribution_hits,
      );
      expect(items.filter((i) => i.contains_private_person).map((i) => ({ external_id: i.external_id, title: i.title }))).toEqual(
        exp.redacted_titles,
      );
    });
  }

  it('every item is valid, unique and has amounts that are exact substrings', () => {
    for (const name of FIXTURE_NAMES) {
      const { meeting, items } = mapFixture(name);
      AdapterResultSchema.parse({ meetings: [meeting], items, documents: [], result_updates: [], warnings: [] });
      expect(new Set(items.map((i) => i.external_id)).size).toBe(items.length);
      for (const i of items) {
        for (const a of i.amounts) expect(i.title.includes(a.text) || (i.description ?? '').includes(a.text)).toBe(true);
      }
    }
  });

  it('event 1244 items are awaiting_result on a frozen Oct 18, 2026 clock', () => {
    const { items } = mapFixture('harriscountytx-1244', FROZEN_NOW);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.status === 'awaiting_result')).toBe(true);
  });

  it('event 1332 items are upcoming before Oct 22', () => {
    expect(mapFixture('houstonisd-1332').items.every((i) => i.status === 'upcoming')).toBe(true);
  });

  it('attributes Flood Control District items to flood_control', () => {
    const { items } = mapFixture('harriscountytx-1244');
    const fc = items.filter((i) => i.section === 'Flood Control District');
    expect(fc.length).toBeGreaterThan(0);
    expect(fc.every((i) => i.body_id === 'flood_control')).toBe(true);
  });

  it('collects comment rules and never emits boilerplate as items', () => {
    const { meeting, items } = mapFixture('harriscountytx-1244');
    expect(meeting.comment_rules_text).toMatch(/Members of the public may attend/);
    expect(items.some((i) => /Members of the public may attend|I pledge allegiance/.test(i.title))).toBe(false);
  });

  it('copies outcomes from minutes-only rows onto the agenda row (HISD 1306 item 3)', () => {
    const i = mapFixture('houstonisd-1306').items.find((x) => x.agenda_number === '3')!;
    expect(i.action).toBe('accepted');
    expect(i.vote_result).toBe('passed');
    expect(i.status).toBe('decided');
  });
});

describe('Legistar mapping helpers', () => {
  const cfg = LegistarConfigSchema.parse({
    client: 'harriscountytx',
    body_ids: [138, 223],
    exclude_comment_patterns: ['TEST - DO NOT USE'],
    exclude_agenda_status: ['Hidden'],
  });
  const ev = (o: Partial<LegistarEvent>): LegistarEvent => ({ EventId: 1, EventBodyId: 138, EventDate: '2026-11-05T00:00:00', EventTime: '9:00 AM', ...o });

  it('maps a cancelled event and falls back to the InSite URL', () => {
    const m = mapEvent(loadFixture('harriscountytx-1243').event, 'commissioners_court');
    expect(m.status).toBe('cancelled');
    expect(m.agenda_url).toMatch(/MeetingDetail\.aspx\?LEGID=1243/);
  });

  it('marks body 223 and "Special Meeting" comments as special; DST offset correct', () => {
    expect(mapEvent(ev({ EventBodyId: 223 }), 'x').type).toBe('special');
    expect(mapEvent(ev({ EventComment: 'Special Meeting' }), 'x').type).toBe('special');
    expect(mapEvent(ev({}), 'x').date).toBe('2026-11-05T09:00:00-06:00');
  });

  it('excludes hidden, test and foreign-body events', () => {
    expect(isExcludedEvent(ev({ EventAgendaStatusName: 'Hidden' }), cfg)).toBe(true);
    expect(isExcludedEvent(ev({ EventComment: 'TEST - DO NOT USE' }), cfg)).toBe(true);
    expect(isExcludedEvent(ev({ EventBodyId: 999 }), cfg)).toBe(true);
    expect(isExcludedEvent(ev({ EventAgendaStatusName: 'Final' }), cfg)).toBe(false);
  });

  it('builds the events filter in Chicago dates with an exclusive end', () => {
    const url = decodeURIComponent(eventsUrl(cfg, { from: new Date('2026-10-19T05:00:00Z'), to: new Date('2026-11-18T23:59:59-06:00') }));
    expect(url).toContain("EventDate ge datetime'2026-10-19' and EventDate lt datetime'2026-11-19'");
    expect(url).toContain('(EventBodyId eq 138 or EventBodyId eq 223)');
  });

  it('maps vote results', () => {
    expect(voteResult('approved', 'Pass')).toBe('passed');
    expect(voteResult('accepted', null)).toBe('passed');
    expect(voteResult('motion failed', null)).toBe('failed');
    expect(voteResult('no action', null)).toBe('no_action');
    expect(voteResult(null, null)).toBeUndefined();
  });

  it('strips HTML from agenda notes', () => {
    expect(stripHtml('<p>Hello&nbsp;<b>world</b> &amp; all</p>')).toBe('Hello world & all');
  });

  it('recognizes section headers and rejects boilerplate rows', () => {
    expect(isSectionHeader('Flood Control District')).toBe(true);
    expect(isSectionHeader('CLOSED SESSION')).toBe(true);
    expect(isSectionHeader('•\tHearings')).toBe(false);
    expect(isSectionHeader('Page Break')).toBe(false);
    expect(isSectionHeader('The board meeting may be viewed via:')).toBe(false);
    expect(isSectionHeader('     Dept.    No.   Purpose')).toBe(false);
    expect(isSectionHeader('SPEAKERS TO AGENDA ITEMS')).toBe(false);
  });
});

// Offline adapter runs: a fake fetch serves recorded fixtures.
function fakeFetch(fixtures: Partial<Record<string, { event: LegistarEvent; rows: LegistarEventItem[] }>>, eventsList: LegistarEvent[] = []) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.toString());
    const top = Number(url.searchParams.get('$top') ?? 1e9);
    const skip = Number(url.searchParams.get('$skip') ?? 0);
    const m = url.pathname.match(/\/events\/(\d+)(\/eventitems)?$/);
    let body: unknown;
    if (m) {
      const fx = fixtures[m[1]!];
      if (!fx) return new Response('not found', { status: 404 });
      body = m[2] ? fx.rows.slice(skip, skip + top) : fx.event;
    } else body = eventsList.slice(skip, skip + top);
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { impl, calls };
}

const noSleep = async () => {};
const ccSource: SourceConfig = {
  id: 'hc_commissioners_court',
  body_id: 'commissioners_court',
  adapter: 'legistar',
  config: { client: 'harriscountytx', body_ids: [138, 223], exclude_agenda_status: ['Hidden'], exclude_comment_patterns: ['TEST - DO NOT USE'] },
};
const byName = (n: FixtureName) => loadFixture(n);

describe('LegistarAdapter.run (offline)', () => {
  it('paginates eventitems past 1,000 rows (event 1242) and warns', async () => {
    const fx = byName('harriscountytx-1242');
    expect(fx.rows.length).toBeGreaterThan(1000);
    const { impl, calls } = fakeFetch({ '1242': fx }, [fx.event]);
    const adapter = createLegistarAdapter({ http: { fetchImpl: impl, sleep: noSleep }, now: () => FROZEN_NOW });
    const res = await adapter.run(ccSource, { kind: 'rotation' }, { from: new Date('2026-09-01T05:00:00Z'), to: new Date('2026-09-30T05:00:00Z') });
    expect(calls.filter((c) => c.includes('/eventitems')).length).toBe(2);
    expect(res.warnings.some((w) => /hit 1000 rows/.test(w))).toBe(true);
    expect(res.items).toHaveLength(mapFixture('harriscountytx-1242').items.length);
    expect(res.documents.length).toBe(calls.length);
    AdapterResultSchema.parse(res);
  });

  it('drops excluded events and events outside the window', async () => {
    const fx = byName('harriscountytx-1244');
    const hidden = { ...fx.event, EventId: 9, EventAgendaStatusName: 'Hidden' };
    const { impl } = fakeFetch({ '1244': fx }, [fx.event, hidden]);
    const adapter = createLegistarAdapter({ http: { fetchImpl: impl, sleep: noSleep }, now: () => FROZEN_NOW });
    const res = await adapter.run(ccSource, { kind: 'rotation' }, { from: new Date('2026-10-01T05:00:00Z'), to: new Date('2026-10-31T05:00:00Z') });
    expect(res.meetings.map((m) => m.external_id)).toEqual(['1244']);
  });

  it('results mode: 3 hand-edited approvals in 1244 give exactly 3 ResultUpdates', async () => {
    const fx = byName('harriscountytx-1244');
    const edited = new Set<number>();
    const rows = fx.rows.map((r) => {
      if (edited.size < 3 && r.EventItemAgendaNumber && r.EventItemAgendaSequence != null) {
        edited.add(r.EventItemId);
        return { ...r, EventItemActionName: 'approved' };
      }
      return r;
    });
    const { impl, calls } = fakeFetch({ '1244': { event: fx.event, rows } });
    const adapter = createLegistarAdapter({ http: { fetchImpl: impl, sleep: noSleep }, now: () => FROZEN_NOW });
    const res = await adapter.run(ccSource, { kind: 'results', meeting_external_ids: ['1244'] }, { from: new Date(0), to: FROZEN_NOW });
    expect(calls.some((c) => c.includes('$filter'))).toBe(false);
    expect(res.result_updates).toHaveLength(3);
    expect(new Set(res.result_updates.map((u) => Number(u.item_external_id)))).toEqual(edited);
    for (const u of res.result_updates) {
      expect(u.vote_result).toBe('passed');
      expect(u.source_url).toBe(fx.event.EventMinutesFile ?? fx.event.EventInSiteURL);
    }
  });
});
