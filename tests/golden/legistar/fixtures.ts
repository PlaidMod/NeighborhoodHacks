import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LegistarConfigSchema,
  mapEvent,
  mapEventItems,
  type LegistarConfig,
  type LegistarEvent,
  type LegistarEventItem,
} from '@/lib/adapters/legistar';
import { parseSources } from '@/lib/ingest/registry';

const DIR = fileURLToPath(new URL('.', import.meta.url));

export const FIXTURE_NAMES = [
  'harriscountytx-1244',
  'harriscountytx-1242',
  'harriscountytx-1243',
  'houstonisd-1306',
  'houstonisd-1332',
] as const;
export type FixtureName = (typeof FIXTURE_NAMES)[number];

export function loadFixture(name: FixtureName): { event: LegistarEvent; rows: LegistarEventItem[] } {
  const read = (f: string) => JSON.parse(readFileSync(join(DIR, name, f), 'utf8'));
  return { event: read('event.json'), rows: read('eventitems.json') };
}

export function loadExpected(name: FixtureName): unknown {
  return JSON.parse(readFileSync(join(DIR, name, 'expected.json'), 'utf8'));
}

export function sourceFor(name: FixtureName): { bodyId: string; cfg: LegistarConfig } {
  const id = name.startsWith('harriscountytx') ? 'hc_commissioners_court' : 'hisd_board';
  const src = parseSources(readFileSync(join(DIR, '..', '..', '..', 'data', 'sources.yaml'), 'utf8')).find((s) => s.id === id)!;
  return { bodyId: src.body_id!, cfg: LegistarConfigSchema.parse(src.config) };
}

/** Frozen clock used by the golden tests: Oct 18, 2026 noon Central. */
export const FROZEN_NOW = new Date('2026-10-18T12:00:00-05:00');

export function mapFixture(name: FixtureName, now: Date = FROZEN_NOW) {
  const { event, rows } = loadFixture(name);
  const { bodyId, cfg } = sourceFor(name);
  return mapEventItems(mapEvent(event, bodyId), rows, cfg, now);
}
