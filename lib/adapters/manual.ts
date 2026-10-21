import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { DateTime } from 'luxon';
import { LineCounter, parseDocument, type Document } from 'yaml';
import { z } from 'zod';
import type { Adapter, AdapterResult, Item, Meeting, RunMode, SourceConfig } from './types';
import { parseAmounts } from '@/lib/ingest/amounts';
import { sha1 } from '@/lib/ingest/hash';
import { ZONE } from '@/lib/ingest/normalize';
import { redactPersonnel } from '@/lib/ingest/redact';
import { assertNoNewsUrls } from '@/lib/ingest/registry';
import { itemStatus } from '@/lib/ingest/validate';

// ManualAdapter (agent-scraper-spec §8 Step 9, D12, D18). Hand-entered meetings live in
// data/manual/{body_id}/{YYYY-MM-DD}-{slug}.yaml and go through the same amounts, redact and
// hash steps as scraped items. Directories starting with "_" (e.g. _example) are skipped.

export const ManualConfigSchema = z.object({ dir: z.string().default('data/manual') }).loose();

const urlField = z.string().url();
const ManualItemSchema = z.object({
  agenda_number: z.union([z.string(), z.number()]).transform(String).optional(),
  title: z.string().trim().min(1),
  section: z.string().optional(),
  description: z.string().optional(),
  matter_type: z.string().optional(),
  action: z.string().optional(),
  vote_result: z.enum(['passed', 'failed', 'no_action']).optional(),
  attachments: z.array(z.object({ name: z.string(), url: urlField })).default([]),
  source_url: urlField,
});
const ManualFileSchema = z.object({
  meeting: z.object({
    body_id: z.string().min(1),
    date: z.string().refine((d) => DateTime.fromISO(d, { setZone: true }).isValid && /T\d{2}:\d{2}.*([+-]\d{2}:\d{2}|Z)$/.test(d), {
      message: 'must be ISO 8601 with a time and an offset, e.g. "2026-10-28T10:00:00-05:00"',
    }),
    end_date: z.string().optional(),
    type: z.enum(['regular', 'special']).default('regular'),
    status: z.enum(['scheduled', 'cancelled']).default('scheduled'),
    agenda_url: urlField,
    video_url: urlField.optional(),
    minutes_url: urlField.optional(),
    comment_rules_text: z.string().optional(),
  }),
  items: z.array(ManualItemSchema).default([]),
  is_demo: z.boolean().default(false),
});
export type ManualFile = z.infer<typeof ManualFileSchema>;

export const FILE_NAME_RE = /^(\d{4}-\d{2}-\d{2})-[a-z0-9][a-z0-9-]*\.ya?ml$/;

export class ManualValidationError extends Error {
  constructor(readonly file: string, readonly line: number | undefined, detail: string) {
    super(`${file}${line ? `:${line}` : ''}: ${detail}`);
    this.name = 'ManualValidationError';
  }
}

/** Line of the deepest existing node on `path` (1-based), for error messages. */
function lineOf(doc: Document, lc: LineCounter, path: (string | number)[]): number | undefined {
  for (let n = path.length; n >= 0; n--) {
    const node = doc.getIn(path.slice(0, n), true) as { range?: [number, number, number] } | undefined;
    if (node?.range) return lc.linePos(node.range[0]).line;
  }
  return undefined;
}

export type ParsedManual = { meeting: Meeting; items: Item[]; warnings: string[] };

/**
 * Parse and validate one manual YAML file. `file` is the repo-relative POSIX path, which is part of
 * every external_id. Throws ManualValidationError (file and line) on any problem.
 */
export function parseManualFile(file: string, text: string, now: Date = new Date()): ParsedManual {
  const lc = new LineCounter();
  const doc = parseDocument(text, { lineCounter: lc });
  if (doc.errors.length) {
    const e = doc.errors[0]!;
    throw new ManualValidationError(file, e.linePos?.[0]?.line, e.message);
  }
  const raw = doc.toJS() as unknown;
  try {
    assertNoNewsUrls(file, raw);
  } catch (e) {
    throw new ManualValidationError(file, undefined, (e as Error).message);
  }
  const parsed = ManualFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    const path = issue.path.filter((p): p is string | number => typeof p === 'string' || typeof p === 'number');
    const missing = issue.code === 'invalid_type' && issue.input === undefined;
    const detail = `${path.join('.') || '(root)'}: ${missing ? 'required field is missing' : issue.message}`;
    throw new ManualValidationError(file, lineOf(doc, lc, path), detail);
  }
  const f = parsed.data;
  const warnings: string[] = [];
  const base = posix.basename(file);
  const nameDate = base.match(FILE_NAME_RE)?.[1];
  const localDate = DateTime.fromISO(f.meeting.date, { setZone: true }).setZone(ZONE).toFormat('yyyy-MM-dd');
  if (!nameDate) warnings.push(`${file}: file name should be {YYYY-MM-DD}-{slug}.yaml`);
  else if (nameDate !== localDate) warnings.push(`${file}: file name date ${nameDate} differs from meeting date ${localDate}`);
  const dirBody = posix.basename(posix.dirname(file));
  if (!dirBody.startsWith('_') && dirBody !== f.meeting.body_id) {
    throw new ManualValidationError(file, lineOf(doc, lc, ['meeting', 'body_id']), `meeting.body_id "${f.meeting.body_id}" does not match directory "${dirBody}"`);
  }

  const { body_id, date, end_date, type, status, agenda_url, video_url, minutes_url, comment_rules_text } = f.meeting;
  const meeting: Meeting = {
    external_id: sha1('manual' + file),
    body_id,
    date,
    ...(end_date ? { end_date } : {}),
    type,
    status,
    agenda_url,
    ...(video_url ? { video_url } : {}),
    ...(minutes_url ? { minutes_url } : {}),
    ...(comment_rules_text ? { comment_rules_text } : {}),
    is_demo: f.is_demo,
  };
  const seen = new Set<string>();
  const items = f.items.map((it, i) => {
    const key = it.agenda_number?.trim() || it.title;
    const id = sha1('manual' + file + key);
    if (seen.has(id)) throw new ManualValidationError(file, lineOf(doc, lc, ['items', i]), `duplicate item "${key}"`);
    seen.add(id);
    const item: Item = {
      external_id: id,
      meeting_external_id: meeting.external_id,
      body_id,
      ...(it.agenda_number ? { agenda_number: it.agenda_number } : {}),
      title: it.title,
      ...(it.section ? { section: it.section } : {}),
      ...(it.description ? { description: it.description } : {}),
      ...(it.matter_type ? { matter_type: it.matter_type } : {}),
      status: itemStatus(it, date, now),
      ...(it.action ? { action: it.action } : {}),
      ...(it.vote_result ? { vote_result: it.vote_result } : {}),
      amounts: parseAmounts(`${it.title} ${it.description ?? ''}`),
      attachments: it.attachments,
      contains_private_person: false,
      source_url: it.source_url,
      is_demo: f.is_demo,
    };
    return redactPersonnel(item);
  });
  return { meeting, items, warnings };
}

/** Manual YAML files under `dir`, skipping any directory or file whose name starts with "_" or ".". */
export function listManualFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      if (name.startsWith('_') || name.startsWith('.')) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.ya?ml$/i.test(name)) out.push(p);
    }
  };
  try {
    walk(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  return out;
}

const toPosix = (p: string) => p.split(sep).join('/');

export type ManualDeps = { now?: () => Date; cwd?: string };

export function createManualAdapter(deps: ManualDeps = {}): Adapter {
  return {
    async run(source: SourceConfig, mode: RunMode, window): Promise<AdapterResult> {
      const result: AdapterResult = { meetings: [], items: [], documents: [], result_updates: [], warnings: [] };
      if (mode.kind === 'results') return result; // outcomes are typed into the YAML (action / vote_result)
      const cfg = ManualConfigSchema.parse(source.config);
      const cwd = deps.cwd ?? process.cwd();
      const now = (deps.now ?? (() => new Date()))();
      // The ignore comment stops the bundler tracing the whole project; next.config.ts ships data/manual.
      for (const abs of listManualFiles(join(/*turbopackIgnore: true*/ cwd, cfg.dir))) {
        const file = toPosix(relative(cwd, abs));
        const text = readFileSync(abs, 'utf8');
        let parsed: ParsedManual;
        try {
          parsed = parseManualFile(file, text, now);
        } catch (e) {
          result.warnings.push(`manual validation error: ${(e as Error).message}`);
          continue;
        }
        const t = Date.parse(parsed.meeting.date);
        if (t < window.from.getTime() || t > window.to.getTime()) continue;
        result.meetings.push(parsed.meeting);
        result.items.push(...parsed.items);
        result.warnings.push(...parsed.warnings);
      }
      return result;
    },
  };
}

export const manualAdapter: Adapter = createManualAdapter();
