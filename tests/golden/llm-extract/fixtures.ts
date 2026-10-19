import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExtraction, type Extraction } from '@/lib/adapters/gemini';
import { buildFromExtraction, type BuildContext } from '@/lib/adapters/llmExtract';

const DIR = fileURLToPath(new URL('.', import.meta.url));

export const read = (p: string) => readFileSync(join(DIR, p), 'utf8');
export const readJson = <T = unknown>(p: string): T => JSON.parse(read(p)) as T;

export type GoldenCase = {
  dir: string;
  source_id: string;
  /** Frozen clock for status and the 60-day date check. */
  now: string;
  link: { date: string; type: 'regular' | 'special' };
  default_time?: string;
};

export const CASES: GoldenCase[] = [
  { dir: 'lonestar-2026-10-01', source_id: 'lone_star_board', now: '2026-10-19T12:00:00-05:00', link: { date: '2026-10-01', type: 'regular' } },
  { dir: 'mud489-2026-10-19', source_id: 'hcmud_489', now: '2026-10-18T12:00:00-05:00', link: { date: '2026-10-19', type: 'regular' }, default_time: '11:00' },
  { dir: 'mud489-2026-04-09', source_id: 'hcmud_489', now: '2026-04-08T12:00:00-05:00', link: { date: '2026-04-09', type: 'special' }, default_time: '11:00' },
];

export const CORRUPTED = ['fake-quote', 'changed-number', 'out-of-window-date', 'empty-title', 'invented-dollar'] as const;

export function loadOutput(path: string): Extraction {
  const p = parseExtraction(read(path));
  if (!p.ok) throw new Error(`${path}: ${p.error}`);
  return p.value;
}

export function contextFor(c: GoldenCase, overrides: Partial<BuildContext> = {}): BuildContext {
  const meta = readJson<{ url: string }>(`${c.dir}/meta.json`);
  return {
    source_id: c.source_id,
    body_id: c.source_id,
    url: meta.url,
    fullText: read(`${c.dir}/source.txt`),
    scanned: false,
    now: new Date(c.now),
    link: c.link,
    default_time: c.default_time,
    ...overrides,
  };
}

export const buildCase = (c: GoldenCase, overrides?: Partial<BuildContext>) =>
  buildFromExtraction([loadOutput(`${c.dir}/gemini_output.json`)], contextFor(c, overrides));

/** The summary each expected.json stores. */
export function summarize(r: ReturnType<typeof buildCase>) {
  return {
    meeting: r.meeting,
    item_count: r.items.length,
    dropped: r.dropped,
    warnings: r.warnings,
    items: r.items.map((i) => ({
      external_id: i.external_id,
      agenda_number: i.agenda_number ?? null,
      title: i.title,
      section: i.section ?? null,
      status: i.status,
      amounts: i.amounts,
      contains_private_person: i.contains_private_person,
    })),
  };
}
