import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ManualValidationError, createManualAdapter, listManualFiles, parseManualFile } from '@/lib/adapters/manual';
import { AdapterResultSchema, type SourceConfig } from '@/lib/adapters/types';
import { sha1 } from '@/lib/ingest/hash';

const EXAMPLE = 'data/manual/_example/2026-10-28-format-example.yaml';
const NOW = new Date('2026-10-19T12:00:00-05:00');

const yaml = (over: { body?: string; agenda?: string; items?: string; extra?: string } = {}) =>
  [
    'meeting:',
    `  body_id: ${over.body ?? 'hcmud_489'}`,
    '  date: "2026-10-28T10:00:00-05:00"',
    `  agenda_url: ${over.agenda ?? 'https://hcmud489.com/a.pdf'}`,
    'items:',
    over.items ??
      [
        '  - agenda_number: "5"',
        '    title: "Consider order calling a $14,000,000 bond election"',
        '    section: "Bonds"',
        '    source_url: https://hcmud489.com/a.pdf',
      ].join('\n'),
    over.extra ?? '',
  ].join('\n');

const FILE = 'data/manual/hcmud_489/2026-10-28-bond-order.yaml';

describe('parseManualFile', () => {
  it('the committed format example parses', () => {
    const r = parseManualFile(EXAMPLE, readFileSync(EXAMPLE, 'utf8'), NOW);
    expect(r.meeting.agenda_url).toBe('https://example.org/agenda.pdf');
    expect(r.items).toHaveLength(1);
    expect(r.meeting.is_demo).toBe(false);
  });
  it('maps meeting and items with stable ids, amounts and status', () => {
    const r = parseManualFile(FILE, yaml(), NOW);
    expect(r.meeting).toEqual({
      external_id: sha1('manual' + FILE),
      body_id: 'hcmud_489',
      date: '2026-10-28T10:00:00-05:00',
      type: 'regular',
      status: 'scheduled',
      agenda_url: 'https://hcmud489.com/a.pdf',
      is_demo: false,
    });
    const [item] = r.items;
    expect(item!.external_id).toBe(sha1('manual' + FILE + '5'));
    expect(item!.status).toBe('upcoming');
    expect(item!.amounts).toEqual([{ value: 14_000_000, text: '$14,000,000' }]);
    expect(item!.section).toBe('Bonds');
    expect(r.warnings).toEqual([]);
  });
  it('falls back to the title for the id; is_demo is carried to meeting and items', () => {
    const r = parseManualFile(FILE, yaml({ items: '  - title: "Approve minutes"\n    source_url: https://hcmud489.com/a.pdf', extra: 'is_demo: true' }), NOW);
    expect(r.items[0]!.external_id).toBe(sha1('manual' + FILE + 'Approve minutes'));
    expect(r.meeting.is_demo).toBe(true);
    expect(r.items[0]!.is_demo).toBe(true);
  });
  it('missing source_url names the file and line', () => {
    const text = yaml({ items: '  - agenda_number: "5"\n    title: "Item"' });
    expect(() => parseManualFile(FILE, text, NOW)).toThrow(ManualValidationError);
    expect(() => parseManualFile(FILE, text, NOW)).toThrow(`${FILE}:6: items.0.source_url: required field is missing`);
  });
  it('missing agenda_url names the file and line', () => {
    const text = yaml().replace(/ {2}agenda_url:.*\n/, '');
    expect(() => parseManualFile(FILE, text, NOW)).toThrow(`${FILE}:2: meeting.agenda_url: required field is missing`);
  });
  it('rejects a date without an offset, a body/directory mismatch and duplicate items', () => {
    expect(() => parseManualFile(FILE, yaml().replace('-05:00"', '"'), NOW)).toThrow(/:3: meeting.date: must be ISO 8601/);
    expect(() => parseManualFile(FILE, yaml({ body: 'other_body' }), NOW)).toThrow(/:2: meeting.body_id "other_body" does not match directory "hcmud_489"/);
    const dup = '  - { agenda_number: "1", title: a, source_url: "https://x.org/a" }\n  - { agenda_number: "1", title: b, source_url: "https://x.org/a" }';
    expect(() => parseManualFile(FILE, yaml({ items: dup }), NOW)).toThrow(/:7: duplicate item "1"/);
  });
  it('news guard (D24): news URLs are rejected', () => {
    expect(() => parseManualFile(FILE, yaml({ agenda: 'https://www.khou.com/x' }), NOW)).toThrow(/news domain/);
  });
  it('redacts personnel items like every adapter', () => {
    const items = '  - title: "Jane Q Public, teacher, Lincoln Elementary School, Consideration of Independent Hearing Examiner\'s Recommendation"\n    source_url: https://x.org/a';
    const r = parseManualFile(FILE, yaml({ items }), NOW);
    expect(r.items[0]!.contains_private_person).toBe(true);
    expect(r.items[0]!.title).not.toMatch(/Jane|Lincoln/);
  });
  it('warns when the file name date differs from the meeting date', () => {
    const r = parseManualFile('data/manual/hcmud_489/2026-10-27-x.yaml', yaml(), NOW);
    expect(r.warnings).toEqual(['data/manual/hcmud_489/2026-10-27-x.yaml: file name date 2026-10-27 differs from meeting date 2026-10-28']);
  });
});

describe('manual adapter', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'manual-'));
  mkdirSync(join(cwd, 'data/manual/hcmud_489'), { recursive: true });
  mkdirSync(join(cwd, 'data/manual/_example'), { recursive: true });
  writeFileSync(join(cwd, 'data/manual/hcmud_489/2026-10-28-bond-order.yaml'), yaml());
  writeFileSync(join(cwd, 'data/manual/hcmud_489/2026-10-29-broken.yaml'), yaml({ items: '  - title: x' }));
  writeFileSync(join(cwd, 'data/manual/_example/2026-10-28-example.yaml'), readFileSync(EXAMPLE, 'utf8'));
  const source: SourceConfig = { id: 'manual', adapter: 'manual', config: { dir: 'data/manual' } };
  const window = { from: new Date('2026-10-19T00:00:00-05:00'), to: new Date('2026-11-18T23:59:59-06:00') };

  it('skips _ directories', () => {
    expect(listManualFiles(join(cwd, 'data/manual')).map((f) => f.replace(/\\/g, '/').split('/').pop())).toEqual([
      '2026-10-28-bond-order.yaml',
      '2026-10-29-broken.yaml',
    ]);
  });
  it('loads valid files, reports invalid ones, and returns a schema-valid result', async () => {
    const r = AdapterResultSchema.parse(await createManualAdapter({ cwd, now: () => NOW }).run(source, { kind: 'rotation' }, window));
    expect(r.meetings).toHaveLength(1);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.external_id).toBe(sha1('manual' + 'data/manual/hcmud_489/2026-10-28-bond-order.yaml' + '5'));
    expect(r.warnings).toEqual([
      'manual validation error: data/manual/hcmud_489/2026-10-29-broken.yaml:6: items.0.source_url: required field is missing',
    ]);
  });
  it('window filter and a missing directory', async () => {
    const later = { from: new Date('2026-12-01T00:00:00-06:00'), to: new Date('2026-12-31T00:00:00-06:00') };
    expect((await createManualAdapter({ cwd, now: () => NOW }).run(source, { kind: 'rotation' }, later)).meetings).toEqual([]);
    const none = await createManualAdapter({ cwd, now: () => NOW }).run({ ...source, config: { dir: 'nope' } }, { kind: 'rotation' }, window);
    expect(none).toEqual({ meetings: [], items: [], documents: [], result_updates: [], warnings: [] });
  });
  it('the real data/manual has no loadable files yet (no demo data, D18)', () => {
    expect(listManualFiles('data/manual')).toEqual([]);
  });
});
