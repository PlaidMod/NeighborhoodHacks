import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import type { LlmClient } from '@/lib/adapters/gemini';
import {
  buildFromExtraction,
  createLlmExtractAdapter,
  extractDocument,
  inventedDollarFigures,
  quoteVerified,
  repairHyphenation,
} from '@/lib/adapters/llmExtract';
import { getPdfText, pdfTextFromPages } from '@/lib/adapters/pdfText';
import { AdapterResultSchema, type SourceConfig } from '@/lib/adapters/types';
import { sha1 } from '@/lib/ingest/hash';
import { ZONE } from '@/lib/ingest/normalize';
import { leakingName } from '@/lib/ingest/redact';
import { CASES, CORRUPTED, buildCase, contextFor, loadOutput, read, readJson, summarize } from '../golden/llm-extract/fixtures';

const GOLDEN = fileURLToPath(new URL('../golden/llm-extract/', import.meta.url));
const MUD = CASES.find((c) => c.dir === 'mud489-2026-10-19')!;
const mudCtx = contextFor(MUD);
const MODELS = { extract: 'flash', fallback: 'pro' };

function fakeLlm(byModel: Record<string, string[]>) {
  const calls: { model: string; text?: string; pdf?: Uint8Array }[] = [];
  const client: LlmClient = {
    async generateJson(req) {
      calls.push({ model: req.model, text: req.text, pdf: req.pdf });
      const next = byModel[req.model]?.shift();
      if (next === undefined) throw new Error(`no output for ${req.model}`);
      return next;
    },
  };
  return { client, calls };
}

describe('golden extraction (recorded outputs)', () => {
  for (const c of CASES) {
    it(`${c.dir} matches expected.json`, () => {
      const { note: _n, now: _now, ...exp } = readJson<Record<string, unknown>>(`${c.dir}/expected.json`);
      expect(summarize(buildCase(c))).toEqual(exp);
    });
  }
  it('every item keeps a verified quote, a source_url and a stable id', () => {
    for (const c of CASES) {
      const r = buildCase(c);
      expect(r.dropped).toBe(0);
      for (const i of r.items) {
        expect(i.quote_verified).toBe(true);
        expect(i.source_url).toBe(r.meeting!.agenda_url);
        expect(i.external_id).toBe(sha1(r.meeting!.external_id + (i.agenda_number ?? i.title).toLowerCase().slice(0, 80)));
        if (i.contains_private_person) expect(leakingName(i.title)).toBe(false);
      }
    }
  });
  it('Lone Star tax-rate items carry rate amounts parsed by code', () => {
    const items = buildCase(CASES[0]!).items;
    expect(items.find((i) => i.agenda_number === '1')!.amounts).toEqual([{ value: 0.0839, text: '$0.0839 per $100 of assessed valuation', kind: 'rate' }]);
  });
  it('statuses follow the frozen clock', () => {
    expect(new Set(buildCase(CASES[0]!).items.map((i) => i.status))).toEqual(new Set(['awaiting_result']));
    expect(new Set(buildCase(MUD).items.map((i) => i.status))).toEqual(new Set(['upcoming']));
  });
  it('MUD 489 Oct 19: 11:00 AM regular meeting, id = sha1(source + date)', () => {
    const m = buildCase(MUD).meeting!;
    expect(m).toMatchObject({ date: '2026-10-19T11:00:00-05:00', type: 'regular', external_id: sha1('hcmud_4892026-10-19') });
  });
  it('MUD 489 Apr 9 is special from the filename', () => {
    expect(buildCase(CASES[2]!).meeting!.type).toBe('special');
  });
});

describe('5 corrupted outputs are all rejected', () => {
  const run = (name: (typeof CORRUPTED)[number], link = true) =>
    buildFromExtraction([loadOutput(`corrupted/${name}.json`)], link ? mudCtx : { ...mudCtx, link: undefined });

  it('fake quote: item dropped with a warning', () => {
    const r = run('fake-quote');
    expect(r.items.map((i) => i.agenda_number)).toEqual(['1', '8', '13']);
    expect(r.dropped).toBe(1);
    expect(r.warnings.join('\n')).toMatch(/item 25 dropped: source_quote not in text/);
  });
  it('quote with one changed number: item dropped', () => {
    const r = run('changed-number');
    expect(r.items.some((i) => i.agenda_number === '9')).toBe(false);
    expect(r.warnings.join('\n')).toMatch(/item 9 dropped/);
  });
  it('out-of-window date: whole document rejected', () => {
    const r = run('out-of-window-date', false);
    expect(r.meeting).toBeUndefined();
    expect(r.items).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(/2025-06-16 is more than 60 days from today; document rejected/);
  });
  it('out-of-window LLM date with a link date: link date wins, with a warning', () => {
    const r = run('out-of-window-date');
    expect(r.meeting!.date).toBe('2026-10-19T11:00:00-05:00');
    expect(r.warnings.join('\n')).toMatch(/disagree; using the link date/);
  });
  it('empty title: item dropped', () => {
    const r = run('empty-title');
    expect(r.items.some((i) => i.agenda_number === '10')).toBe(false);
    expect(r.warnings.join('\n')).toMatch(/item 10 dropped: empty title/);
  });
  it('invented dollar figure: description dropped, amount not stored', () => {
    const r = run('invented-dollar');
    const item = r.items.find((i) => i.agenda_number === '9')!;
    expect(item.description).toBeUndefined();
    expect(item.amounts).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(/description dropped: \$0\.95, \$100 not in the document/);
  });
});

describe('validation helpers', () => {
  it('hyphenation repair', () => {
    expect(repairHyphenation('Tax Assessor-\nCollector')).toBe('Tax Assessor-Collector');
    expect(quoteVerified('Tax Assessor-Collector report', 'Receive Tax Assessor-\nCollector report and')).toBe(true);
    expect(quoteVerified('Tax Assessor- Collector', 'Tax Assessor-\nCollector')).toBe(true);
    expect(quoteVerified('', 'x')).toBe(false);
  });
  it('quote check ignores curly quotes, case and line breaks', () => {
    expect(quoteVerified('the "System") for the purchase', 'the “System”)\nfor the Purchase')).toBe(true);
  });
  it('dollar figures must appear in the source', () => {
    expect(inventedDollarFigures('rate of $0.0839 per $100', 'a tax rate of $0.0839 per $100 of value')).toEqual([]);
    expect(inventedDollarFigures('cost $1,250,000', 'cost $1,250,000.')).toEqual([]);
    expect(inventedDollarFigures('cost $1,250,001', 'cost $1,250,000.')).toEqual(['$1,250,001']);
  });
  it('title over 2,000 characters is dropped', () => {
    const out = loadOutput('corrupted/fake-quote.json');
    const long = 'x'.repeat(2000);
    const r = buildFromExtraction([{ ...out, items: [{ title: long, source_quote: '1. Public comments;' }] }], mudCtx);
    expect(r.items).toEqual([]);
    expect(r.warnings.join()).toMatch(/title over 2000/);
  });
});

describe('ids, collisions and chunk overlap', () => {
  const ext = loadOutput('corrupted/fake-quote.json');
  it('a repeated agenda number in one chunk gets #2', () => {
    const items = [ext.items[0]!, { ...ext.items[1]!, agenda_number: '1' }];
    const r = buildFromExtraction([{ ...ext, items }], mudCtx);
    expect(r.items.map((i) => i.external_id)).toEqual([r.items[0]!.external_id, `${r.items[0]!.external_id}#2`]);
    expect(r.warnings.join()).toMatch(/collision.*#2/);
  });
  it('the same item from an overlapping chunk is kept once', () => {
    const a = { ...ext, items: ext.items.slice(0, 3) };
    const b = { ...ext, items: ext.items.slice(2, 3) };
    const r = buildFromExtraction([a, b], mudCtx);
    expect(r.items).toHaveLength(3);
    expect(r.total).toBe(3);
  });
  it('agenda number trailing period is removed before hashing', () => {
    const r = buildFromExtraction([{ ...ext, items: [{ ...ext.items[0]!, agenda_number: '1.' }] }], mudCtx);
    expect(r.items[0]!.agenda_number).toBe('1');
    expect(r.items[0]!.external_id).toBe(sha1(r.meeting!.external_id + '1'));
  });
});

describe('redaction and comment rules', () => {
  const ext = loadOutput('corrupted/fake-quote.json');
  it('names in personnel items are redacted after the quote check', () => {
    const text = 'Personnel\n5. Jane Q Doe, teacher, Twain Elementary School, Consideration of Proposed Termination of contract';
    const r = buildFromExtraction(
      [{ ...ext, items: [{ agenda_number: '5', title: 'Jane Q Doe, teacher, Twain Elementary School, Consideration of Proposed Termination of contract', section: 'Personnel', source_quote: 'Jane Q Doe, teacher, Twain Elementary School, Consideration of Proposed Termination' }] }],
      { ...mudCtx, fullText: text },
    );
    expect(r.items[0]!.contains_private_person).toBe(true);
    expect(r.items[0]!.title).not.toMatch(/Jane|Twain/);
    expect(r.items[0]!.source_quote).not.toMatch(/Jane/);
  });
  it('comment instructions become comment_rules_text only when quoted exactly', () => {
    const quote = 'Persons with disabilities who plan to attend this meeting and would like to request auxiliary aids';
    const ok = buildFromExtraction([{ ...ext, meeting: { ...ext.meeting, comment_instructions_quote: quote } }], mudCtx);
    expect(ok.meeting!.comment_rules_text).toBe(quote);
    const bad = buildFromExtraction([{ ...ext, meeting: { ...ext.meeting, comment_instructions_quote: 'Sign up online by noon to speak.' } }], mudCtx);
    expect(bad.meeting!.comment_rules_text).toBeUndefined();
    expect(bad.warnings.join()).toMatch(/comment_instructions_quote not found/);
  });
});

describe('extractDocument (fake LLM)', () => {
  const pages = read(`${MUD.dir}/source.txt`).split('\f');
  const text = pdfTextFromPages(pages, 'x');
  const good = read(`${MUD.dir}/gemini_output.json`);
  const base = { source_id: 'hcmud_489', body_id: 'hcmud_489', url: mudCtx.url, pdf: new Uint8Array([1]), text, link: MUD.link, default_time: '11:00', models: MODELS, now: new Date(MUD.now) };

  it('Flash only when validation keeps >= 80% of items; sends text, not the PDF', async () => {
    const { client, calls } = fakeLlm({ flash: [good] });
    const r = await extractDocument({ ...base, llm: client });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toBe(text.text);
    expect(calls[0]!.pdf).toBeUndefined();
    expect(r.items).toHaveLength(38);
    expect(r.model).toBe('flash');
    expect(r.documents.map((d) => d.kind)).toEqual(['llm_output']);
  });
  it('D17: > 20% dropped -> one retry with the fallback model, keep the better run', async () => {
    const bad = JSON.parse(good);
    bad.items = bad.items.map((it: { source_quote: string }, i: number) => (i % 3 === 0 ? { ...it, source_quote: 'not in the text at all, invented' } : it));
    const { client, calls } = fakeLlm({ flash: [JSON.stringify(bad)], pro: [good] });
    const r = await extractDocument({ ...base, llm: client });
    expect(calls.map((c) => c.model)).toEqual(['flash', 'pro']);
    expect(r.model).toBe('pro');
    expect(r.items).toHaveLength(38);
    expect(r.warnings.join('\n')).toMatch(/13\/38 items dropped with flash; retrying with pro/);
    expect(r.documents).toHaveLength(2);
  });
  it('keeps the first run when the fallback is not better', async () => {
    const bad = JSON.parse(good);
    bad.items = bad.items.slice(0, 2).concat([{ title: 'x', source_quote: 'fake fake fake fake fake' }]);
    const { client } = fakeLlm({ flash: [JSON.stringify(bad)], pro: ['{"broken'] });
    const r = await extractDocument({ ...base, llm: client });
    expect(r.model).toBe('flash');
    expect(r.items).toHaveLength(2);
  });
  it('scanned document: PDF sent, quote check skipped, quote_verified = false', async () => {
    const scannedText = await getPdfText(new Uint8Array(readFileSync(join(GOLDEN, 'scanned/image-only.pdf'))));
    expect(scannedText.has_text_layer).toBe(false);
    const { client, calls } = fakeLlm({ flash: [good] });
    const r = await extractDocument({ ...base, text: scannedText, pdf: new Uint8Array([9, 9]), llm: client });
    expect(calls[0]!.pdf).toEqual(new Uint8Array([9, 9]));
    expect(r.items).toHaveLength(38);
    expect(r.items.every((i) => i.quote_verified === false)).toBe(true);
    expect(r.warnings.join()).toMatch(/scanned document/);
  });
  it('known meeting (PrimeGov path): meeting fields come from the caller', async () => {
    const known = { external_id: '6914', body_id: 'houston_city_council', date: '2026-10-19T09:00:00-05:00', type: 'regular' as const, status: 'scheduled' as const, agenda_url: 'https://x.test/a.pdf' };
    const { client } = fakeLlm({ flash: [good] });
    const r = await extractDocument({ ...base, link: undefined, known, llm: client });
    expect(r.meeting).toBe(known);
    expect(r.items[0]!.meeting_external_id).toBe('6914');
  });
});

describe('adapter run (offline)', () => {
  const source: SourceConfig = {
    id: 'hcmud_489',
    body_id: 'hcmud_489',
    adapter: 'llm_extract',
    config: {
      index_url: 'https://hcmud489.com/board-meetings/',
      link_pattern: '(?i)/static/.+agenda_.+\\.pdf$',
      date_from: 'filename',
      meeting_type_from_text: { special: '(?i)special' },
      default_time: '11:00',
    },
  };
  const index = read('discovery/mud489-index.html');
  const pdfBytes = new Uint8Array([37, 80, 68, 70, 1, 2, 3]);
  const fetchImpl = (async (u: string | URL | Request) =>
    String(u).endsWith('/board-meetings/') ? new Response(index) : new Response(pdfBytes)) as typeof fetch;
  const http = { fetchImpl, sleep: async () => {} };
  const pages = read(`${MUD.dir}/source.txt`).split('\f');
  const pdfText = async (b: Uint8Array) => pdfTextFromPages(pages, sha1(String(b.length)));
  const window = {
    from: DateTime.fromISO('2026-10-18', { zone: ZONE }).toJSDate(),
    to: DateTime.fromISO('2026-11-17', { zone: ZONE }).endOf('day').toJSDate(),
  };
  const now = () => new Date(MUD.now);

  it('discovers, extracts and returns a schema-valid result', async () => {
    const { client } = fakeLlm({ flash: [read(`${MUD.dir}/gemini_output.json`)] });
    const r = AdapterResultSchema.parse(await createLlmExtractAdapter({ http, now, llm: client, models: MODELS, pdfText }).run(source, { kind: 'rotation' }, window));
    expect(r.meetings).toHaveLength(1);
    expect(r.items).toHaveLength(38);
    expect(r.documents.map((d) => d.kind)).toEqual(['html', 'pdf_text', 'llm_output']);
    expect(r.warnings).toEqual([]);
  });
  it('D11: unchanged content_hash skips the document (no LLM call)', async () => {
    const { client, calls } = fakeLlm({ flash: [] });
    const url = 'https://hcmud489.com/static/dfaef0088dbe419a94dafac34a137a29/Agenda_October_19_2026_HCMUD_489_5b93c39b1d.pdf';
    const { documentContentHash } = await import('@/lib/ingest/hash');
    const r = await createLlmExtractAdapter({ http, now, llm: client, models: MODELS, pdfText }).run(source, { kind: 'rotation' }, window, {
      documentHashes: { [url]: documentContentHash(pdfBytes) },
    });
    expect(calls).toHaveLength(0);
    expect(r.meetings).toEqual([]);
  });
  it('no key: meeting from the link, no items, one llm_unavailable warning', async () => {
    const r = await createLlmExtractAdapter({ http, now, llm: null, models: MODELS, pdfText }).run(source, { kind: 'rotation' }, window);
    expect(r.meetings.map((m) => m.date)).toEqual(['2026-10-19T11:00:00-05:00']);
    expect(r.items).toEqual([]);
    expect(r.warnings).toEqual(['llm_unavailable: GEMINI_API_KEY is not set; agenda items were not extracted']);
  });
  it('results mode without known meetings does nothing but warn (Step 10 tests: minutes.test.ts)', async () => {
    const r = await createLlmExtractAdapter({ http, now, llm: null }).run(source, { kind: 'results', meeting_external_ids: ['x'] }, window);
    expect(r.result_updates).toEqual([]);
    expect(r.warnings).toEqual(['meeting x: not in the known meetings; skipped']);
  });
});
