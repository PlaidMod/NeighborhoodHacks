import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapAgenda, mapListedMeeting, parseListing } from '@/lib/adapters/boardbook';

const DIR = fileURLToPath(new URL('.', import.meta.url));

export const ORG_ID = 668;
export const BODY_ID = 'cfisd_board';
/** Oct 19, 2026 Regular and Oct 8, 2026 Work Session. */
export const AGENDA_IDS = ['770676', '767938'] as const;
export type AgendaId = (typeof AGENDA_IDS)[number];

/** Frozen clock: Oct 18, 2026 noon Central (outside the maintenance window). */
export const FROZEN_NOW = new Date('2026-10-18T12:00:00-05:00');

export const readListing = () => readFileSync(join(DIR, 'listing.html'), 'utf8');
export const readAgenda = (id: AgendaId) => readFileSync(join(DIR, `agenda-${id}.html`), 'utf8');
export const loadExpected = (id: AgendaId): unknown => JSON.parse(readFileSync(join(DIR, `expected-${id}.json`), 'utf8'));

export function mapFixture(id: AgendaId, now: Date = FROZEN_NOW) {
  const listed = parseListing(readListing()).meetings.find((m) => m.id === id)!;
  return mapAgenda(mapListedMeeting(listed, BODY_ID, ORG_ID).meeting, readAgenda(id), now);
}
