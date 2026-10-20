import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import type { LlmClient } from '@/lib/adapters/gemini';
import { buildFromExtraction } from '@/lib/adapters/llmExtract';
import { pdfTextFromPages } from '@/lib/adapters/pdfText';
import {
  PrimeGovConfigSchema,
  createPrimeGovAdapter,
  mapMeeting,
  pickAgendaDocument,
  pickMinutesDocument,
  titleDays,
  yearsFor,
  type PgMeeting,
} from '@/lib/adapters/primegov';
import { AdapterResultSchema, type SourceConfig } from '@/lib/adapters/types';
import { documentContentHash, sha1 } from '@/lib/ingest/hash';
import { ZONE } from '@/lib/ingest/normalize';
import { parseExtraction } from '@/lib/adapters/gemini';

const DIR = fileURLToPath(new URL('../golden/primegov/', import.meta.url));
const read = (p: string) => readFileSync(join(DIR, p), 'utf8');
const upcoming = JSON.parse(read('upcoming.json')) as PgMeeting[];
const archived = JSON.parse(read('archived-2026.json')) as PgMeeting[];
const output = read('agenda-6914/gemini_output.json');
const sourceText = read('agenda-6914/source.txt');

const source: SourceConfig = {
  id: 'houston_city_council',
  body_id: 'houston_city_council',
  adapter: 'primegov',
  config: { tenant: 'houstontx', committee_id: 1, document_template: 'Agenda', expected_max_gap_days: 14 },
};
const cfg = PrimeGovConfigSchema.parse(source.config);
const MODELS = { extract: 'flash', fallback: 'pro' };
const NOW = new Date('2026-10-19T00:30:00-05:00');
const day = (d: string) => DateTime.fromISO(d, { zone: ZONE });
const window = { from: day('2026-10-19').toJSDate(), to: day('2026-11-18').endOf('day').toJSDate() };

function fakeLlm(outputs: string[]) {
  const calls: { model: string; system: string; text?: string }[] = [];
  const client: LlmClient = {
    async generateJson(req) {
      calls.push({ model: req.model, system: req.system, text: req.text });
      const next = outputs.shift();
      if (next === undefined) throw new Error('no output');
      return next;
    },
  };
  return { client, calls };
}

function fakeHttp(pdf = new Uint8Array([37, 80, 68, 70, 7])) {
  const urls: string[] = [];
  const fetchImpl = (async (u: string | URL | Request) => {
    const url = String(u);
    urls.push(url);
    if (url.endsWith('ListUpcomingMeetings')) return new Response(JSON.stringify(upcoming));
    if (url.includes('ListArchivedMeetings?year=2026')) return new Response(JSON.stringify(archived));
    if (url.includes('ListArchivedMeetings')) return new Response('[]');
    if (url.includes('/Public/CompiledDocument/')) return new Response(pdf);
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
  return { http: { fetchImpl, sleep: async () => {} }, urls };
}
const pdfText = async () => pdfTextFromPages(sourceText.split('\f'), 'x');

describe('titleDays', () => {
  it.each([
    ['October 20 & 21, 2026 - Houston City Council Session', ['2026-10-20', '2026-10-21']],
    ['Houston City Council Session - January 6 & 7, 2026', ['2026-01-06', '2026-01-07']],
    ['March 31 & April 1, 2026 - Houston City Council Session', ['2026-03-31', '2026-04-01']],
    ['January 21. 2026', ['2026-01-21']],
    ['May 27, 2026 -  Consolidated Houston City Council Session', ['2026-05-27']],
    ['Special Called', []],
  ])('%s', (title, days) => expect(titleDays(title)).toEqual(days));
});

describe('mapMeeting (recorded JSON)', () => {
  it('Oct 20 & 21 session: start from dateTime, second day as end_date, Agenda PDF (not Packet)', () => {
    const { meeting, agenda } = mapMeeting(upcoming[0]!, cfg, 'houston_city_council');
    expect(meeting).toEqual({
      external_id: '719',
      body_id: 'houston_city_council',
      date: '2026-10-20T13:30:00-05:00',
      end_date: '2026-10-21T00:00:00-05:00',
      type: 'regular',
      status: 'scheduled',
      agenda_url: 'https://houstontx.primegov.com/Public/CompiledDocument/6914',
    });
    expect(agenda?.templateName).toBe('Agenda');
    expect(agenda?.compileOutputType).toBe(1);
  });
  it('archived session whose dateTime is already the second day gets no end_date', () => {
    const m = mapMeeting(archived.find((x) => x.id === 718)!, cfg, 'b').meeting;
    expect(m.date).toBe('2026-10-14T09:00:00-05:00');
    expect(m.end_date).toBeUndefined();
    expect(m.agenda_url).toBe('https://houstontx.primegov.com/Public/CompiledDocument/6860');
  });
  it('"Special Called" is special; every archived meeting maps and picks a PDF Agenda', () => {
    expect(mapMeeting(archived.find((x) => x.id === 730)!, cfg, 'b').meeting.type).toBe('special');
    for (const pg of archived) {
      const { meeting, agenda } = mapMeeting(pg, cfg, 'b');
      expect(Date.parse(meeting.date)).not.toBeNaN();
      expect(agenda?.templateName).toBe('Agenda');
      expect(meeting.minutes_url).toBeUndefined(); // no minutes templates published in 2026
    }
  });
  it('newest publishDate wins; minutes documents become minutes_url', () => {
    const docs = [
      { id: 1, templateName: 'Agenda', compileOutputType: 1, publishDate: '2026-10-01T00:00:00' },
      { id: 2, templateName: 'Agenda', compileOutputType: 1, publishDate: '2026-10-02T00:00:00' },
      { id: 3, templateName: 'Packet', compileOutputType: 1, publishDate: '2026-10-03T00:00:00' },
      { id: 4, templateName: 'Minutes', compileOutputType: 1 },
    ];
    expect(pickAgendaDocument(docs, 'Agenda')?.id).toBe(2);
    expect(pickMinutesDocument(docs)?.id).toBe(4);
    const pg: PgMeeting = { id: 9, committeeId: 1, dateTime: '2026-09-01T09:00:00', title: 'x', documentList: docs };
    expect(mapMeeting(pg, cfg, 'b').meeting.minutes_url).toBe('https://houstontx.primegov.com/Public/CompiledDocument/4');
  });
  it('yearsFor covers a window crossing January', () => {
    expect(yearsFor({ from: day('2026-12-20').toJSDate(), to: day('2027-01-19').toJSDate() })).toEqual([2026, 2027]);
  });
});

describe('agenda 6914 extraction (recorded output, known meeting)', () => {
  const known = mapMeeting(upcoming[0]!, cfg, 'houston_city_council').meeting;
  const p = parseExtraction(output);
  if (!p.ok) throw new Error(p.error);
  const r = buildFromExtraction([p.value], {
    source_id: 'houston_city_council',
    body_id: 'houston_city_council',
    url: known.agenda_url,
    fullText: sourceText,
    scanned: false,
    now: NOW,
    known,
  });
  it('keeps every item, verified, with ids from the PrimeGov meeting id', () => {
    expect(r.dropped).toBe(0);
    expect(r.warnings).toEqual([]);
    expect(r.meeting).toBe(known);
    expect(r.items).toHaveLength(12);
    for (const i of r.items) {
      expect(i.quote_verified).toBe(true);
      expect(i.status).toBe('upcoming');
      expect(i.source_url).toBe('https://houstontx.primegov.com/Public/CompiledDocument/6914');
      expect(i.external_id).toBe(sha1('719' + i.agenda_number));
    }
  });
  it('amounts are parsed by code', () => {
    const byNum = Object.fromEntries(r.items.map((i) => [i.agenda_number, i.amounts.map((a) => a.value)]));
    expect(byNum['5']).toEqual([239842]);
    expect(byNum['13']).toEqual([7387000]);
    expect(byNum['28']).toEqual([6716115]);
  });
});

describe('adapter run (offline)', () => {
  it('default window: the Oct 20 session, Agenda PDF only, items from the LLM path', async () => {
    const { http, urls } = fakeHttp();
    const { client, calls } = fakeLlm([output]);
    const r = AdapterResultSchema.parse(
      await createPrimeGovAdapter({ http, now: () => NOW, llm: client, models: MODELS, pdfText }).run(source, { kind: 'rotation' }, window),
    );
    expect(r.meetings.map((m) => m.external_id)).toEqual(['719']);
    expect(r.items).toHaveLength(12);
    expect(r.warnings).toEqual([]);
    expect(urls.filter((u) => u.includes('CompiledDocument'))).toEqual(['https://houstontx.primegov.com/Public/CompiledDocument/6914']);
    expect(calls[0]!.system).toMatch(/already known \(2026-10-20, regular\)/);
    expect(r.documents.map((d) => d.kind)).toEqual(['json', 'json', 'pdf_text', 'llm_output']);
  });
  it('D11: an unchanged PDF hash skips extraction but still emits the meeting', async () => {
    const pdf = new Uint8Array([1, 2, 3]);
    const { http } = fakeHttp(pdf);
    const { client, calls } = fakeLlm([]);
    const r = await createPrimeGovAdapter({ http, now: () => NOW, llm: client, models: MODELS, pdfText }).run(source, { kind: 'rotation' }, window, {
      documentHashes: { 'https://houstontx.primegov.com/Public/CompiledDocument/6914': documentContentHash(pdf) },
    });
    expect(calls).toHaveLength(0);
    expect(r.meetings).toHaveLength(1);
    expect(r.items).toEqual([]);
  });
  it('no agenda published yet: meeting with zero items and agenda_not_published', async () => {
    const noDocs = [{ ...upcoming[0]!, documentList: [] }];
    const fetchImpl = (async (u: string | URL | Request) =>
      new Response(String(u).endsWith('ListUpcomingMeetings') ? JSON.stringify(noDocs) : '[]')) as typeof fetch;
    const r = await createPrimeGovAdapter({ http: { fetchImpl, sleep: async () => {} }, now: () => NOW, llm: null }).run(source, { kind: 'rotation' }, window);
    expect(r.meetings).toHaveLength(1);
    expect(r.items).toEqual([]);
    expect(r.warnings).toEqual(['agenda_not_published: meeting 719 (2026-10-20T13:30:00)']);
  });
  it('no key: meetings only, one llm_unavailable warning, no PDF fetch', async () => {
    const { http, urls } = fakeHttp();
    const r = await createPrimeGovAdapter({ http, now: () => NOW, llm: null }).run(source, { kind: 'rotation' }, window);
    expect(r.meetings).toHaveLength(1);
    expect(r.warnings).toEqual(['llm_unavailable: no OPENROUTER_API_KEY or GEMINI_API_KEY is set; agenda items were not extracted']);
    expect(urls.some((u) => u.includes('CompiledDocument'))).toBe(false);
  });
  it('past window: archived meetings filtered by committee and window', async () => {
    const { http } = fakeHttp();
    const r = await createPrimeGovAdapter({ http, now: () => NOW, llm: null }).run(source, { kind: 'rotation' }, {
      from: day('2026-09-28').toJSDate(),
      to: day('2026-10-15').endOf('day').toJSDate(),
    });
    expect(r.meetings.map((m) => m.external_id)).toEqual(['716', '735', '718']);
  });
});
