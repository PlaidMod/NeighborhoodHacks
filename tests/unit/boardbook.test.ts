import { describe, expect, it } from 'vitest';
import {
  agendaPageUrl,
  createBoardBookAdapter,
  inMaintenanceWindow,
  listingUrl,
  mapListedMeeting,
  parseListing,
  splitEntry,
} from '@/lib/adapters/boardbook';
import { AdapterResultSchema, type SourceConfig } from '@/lib/adapters/types';
import { leakingName, redactText } from '@/lib/ingest/redact';
import { AGENDA_IDS, FROZEN_NOW, loadExpected, mapFixture, readAgenda, readListing } from '../golden/boardbook/fixtures';

type Expected = {
  meeting: Record<string, unknown>;
  item_count: number;
  spot_checks: { external_id: string; title: string; agenda_number: string | null; section: string | null; status: string; attachments: number }[];
  redacted_titles: { external_id: string; title: string }[];
};

const SOURCE: SourceConfig = { id: 'cfisd_board', body_id: 'cfisd_board', adapter: 'boardbook', config: { org_id: 668, expected_max_gap_days: 21 } };

describe('BoardBook golden fixtures', () => {
  for (const id of AGENDA_IDS) {
    it(`agenda ${id} matches expected-${id}.json`, () => {
      const exp = loadExpected(id) as Expected;
      const { meeting, items } = mapFixture(id);
      expect({
        external_id: meeting.external_id,
        date: meeting.date,
        type: meeting.type,
        status: meeting.status,
        agenda_url: meeting.agenda_url,
        minutes_url: meeting.minutes_url ?? null,
        video_url: meeting.video_url ?? null,
        has_comment_rules: !!meeting.comment_rules_text,
      }).toEqual(exp.meeting);
      expect(items).toHaveLength(exp.item_count);
      for (const s of exp.spot_checks) {
        const i = items.find((x) => x.external_id === s.external_id)!;
        expect(i, s.external_id).toBeDefined();
        expect({
          external_id: i.external_id,
          title: i.title,
          agenda_number: i.agenda_number ?? null,
          section: i.section ?? null,
          status: i.status,
          attachments: i.attachments.length,
        }).toEqual(s);
      }
      expect(items.filter((i) => i.contains_private_person).map((i) => ({ external_id: i.external_id, title: i.title }))).toEqual(exp.redacted_titles);
    });

    it(`agenda ${id}: valid, unique ids, page source_url, no leaks, no comment-rules items`, () => {
      const { meeting, items } = mapFixture(id);
      AdapterResultSchema.parse({ meetings: [meeting], items, documents: [], result_updates: [], warnings: [] });
      expect(new Set(items.map((i) => i.external_id)).size).toBe(items.length);
      for (const i of items) {
        expect(i.source_url).toBe(agendaPageUrl(668, id));
        expect(i.section ?? '').not.toMatch(/PUBLIC COMMENTS/);
        for (const a of i.amounts) expect(i.title.includes(a.text) || (i.description ?? '').includes(a.text)).toBe(true);
        if (i.contains_private_person) expect(leakingName(i.title)).toBe(false);
      }
      // Top-level sections with children are not items.
      expect(items.some((i) => i.title === 'CONSENT AGENDA')).toBe(false);
      expect(meeting.comment_rules_text).toMatch(/Notice of this meeting/);
      expect(meeting.comment_rules_text).toMatch(/Register to Speak/);
    });
  }

  it('names in the contract-abandonment item (9.C) are not in the output', () => {
    const raw = readAgenda('770676');
    expect(raw).toContain('Daniela Perez');
    const json = JSON.stringify(mapFixture('770676'));
    for (const name of ['Daniela Perez', 'Dwight Bailey', 'Jessica Marmolejo', 'Lara Luca']) expect(json).not.toContain(name);
  });

  it('Oct 19 items are upcoming and Oct 8 items awaiting_result on Oct 18', () => {
    expect(mapFixture('770676').items.every((i) => i.status === 'upcoming')).toBe(true);
    expect(mapFixture('767938').items.every((i) => i.status === 'awaiting_result')).toBe(true);
  });
});

describe('BoardBook listing', () => {
  it('parses every meeting row with date, type and links', () => {
    const { meetings, warnings } = parseListing(readListing());
    expect(warnings).toEqual([]);
    expect(meetings.length).toBe(58);
    expect(meetings[0]).toEqual({
      id: '770676',
      name: 'Regular Board Meeting',
      meeting_type: 'Regular',
      date: '2026-10-19T18:00:00-05:00',
      agenda_path: 'https://meetings.boardbook.org/Public/Agenda/668?meeting=770676',
    });
    expect(new Set(meetings.map((m) => m.id)).size).toBe(meetings.length);
    expect(meetings.filter((m) => m.minutes_url).length).toBeGreaterThan(0);
  });

  it('maps types and flags unusual ones', () => {
    const base = { id: '1', name: 'Board Meeting', date: '2026-10-19T18:00:00-05:00', agenda_path: '' };
    expect(mapListedMeeting({ ...base, meeting_type: 'Special' }, 'b', 668).meeting.type).toBe('special');
    expect(mapListedMeeting({ ...base, meeting_type: 'Working' }, 'b', 668).meeting.type).toBe('regular');
    const odd = mapListedMeeting({ ...base, meeting_type: 'Retreat' }, 'b', 668);
    expect(odd.meeting.type).toBe('regular');
    expect(odd.warnings[0]).toMatch(/unusual type "Retreat"/);
    expect(mapListedMeeting({ ...base, name: 'CANCELLED Regular', meeting_type: 'Regular' }, 'b', 668).meeting.status).toBe('cancelled');
  });
});

describe('splitEntry', () => {
  it('splits number, strong title and description', () => {
    expect(splitEntry('\n5.A. <strong>Agenda Comments</strong><br />\nPer BED (Local), patrons may…')).toEqual({
      number: '5.A',
      title: 'Agenda Comments',
      description: 'Per BED (Local), patrons may…',
    });
    expect(splitEntry('8.B.1. EIC (Local): Class Ranking (Revise)')).toEqual({ number: '8.B.1', title: 'EIC (Local): Class Ranking (Revise)' });
  });
});

describe('redaction of name lists', () => {
  it('replaces three or more names, keeps pairs', () => {
    expect(redactText('to Ann Lee, Bo Diaz, and Cy Park to resign').text).toBe('to several employees to resign');
    expect(redactText('Recommendation, TEA Docket No. 187').redacted).toBe(false);
  });
});

describe('BoardBook adapter run (offline)', () => {
  const pages: Record<string, string> = {
    [listingUrl(668)]: readListing(),
    [agendaPageUrl(668, '770676')]: readAgenda('770676'),
    [agendaPageUrl(668, '767938')]: readAgenda('767938'),
  };
  const fetched: string[] = [];
  const fetchImpl = (async (url: string) => {
    fetched.push(url);
    const body = pages[url];
    return body === undefined ? new Response('nope', { status: 404 }) : new Response(body, { status: 200 });
  }) as unknown as typeof fetch;
  const http = { fetchImpl, sleep: async () => {} };

  it('fetches the listing and in-window agendas only', async () => {
    fetched.length = 0;
    const adapter = createBoardBookAdapter({ http, now: () => FROZEN_NOW });
    const res = await adapter.run(SOURCE, { kind: 'rotation' }, { from: FROZEN_NOW, to: new Date('2026-11-17T23:59:59-06:00') });
    AdapterResultSchema.parse(res);
    expect(res.meetings.map((m) => m.external_id)).toEqual(['770676']);
    expect(res.items.length).toBe((loadExpected('770676') as Expected).item_count);
    expect(res.documents.map((d) => d.kind)).toEqual(['html', 'html']);
    expect(fetched).toEqual([listingUrl(668), agendaPageUrl(668, '770676')]);
  });

  it('results mode loads the named meetings and warns on unknown ids', async () => {
    const adapter = createBoardBookAdapter({ http, now: () => FROZEN_NOW });
    const res = await adapter.run(SOURCE, { kind: 'results', meeting_external_ids: ['767938', '999'] }, { from: FROZEN_NOW, to: FROZEN_NOW });
    expect(res.meetings.map((m) => m.minutes_url)).toEqual(['https://meetings.boardbook.org/Public/Minutes/668?meeting=767938']);
    expect(res.result_updates).toEqual([]);
    expect(res.warnings).toContain('meeting 999: not on the listing page');
  });

  it('returns a warning and no data in the 00:00-05:00 Central window, without fetching', async () => {
    fetched.length = 0;
    const night = new Date('2026-10-19T02:30:00-05:00');
    expect(inMaintenanceWindow(night)).toBe(true);
    expect(inMaintenanceWindow(new Date('2026-10-19T05:00:00-05:00'))).toBe(false);
    const res = await createBoardBookAdapter({ http, now: () => night }).run(SOURCE, { kind: 'rotation' }, { from: night, to: night });
    expect(res.meetings).toEqual([]);
    expect(res.warnings[0]).toMatch(/maintenance window/);
    expect(fetched).toEqual([]);
  });
});
