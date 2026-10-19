import { createHash } from 'node:crypto';
import type { Item, Meeting } from '@/lib/adapters/types';
import { normalize } from './normalize';

export function sha256(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function sha1(data: string): string {
  return createHash('sha1').update(data).digest('hex');
}

/** §5.5: sha256(normalize(title) | status | action | vote_result | amount values). */
export function itemContentHash(item: Pick<Item, 'title' | 'status' | 'action' | 'vote_result' | 'amounts'>): string {
  return sha256(
    [normalize(item.title), item.status, item.action ?? '', item.vote_result ?? '', item.amounts.map((a) => a.value).join(',')].join(
      '|',
    ),
  );
}

/** §5.5: sha256(date | end_date | status | type). Drives P3's meeting_moved rule. */
export function meetingContentHash(m: Pick<Meeting, 'date' | 'end_date' | 'status' | 'type'>): string {
  return sha256([m.date, m.end_date ?? '', m.status, m.type].join('|'));
}

/** §5.5: sha256 of raw bytes or response text. */
export function documentContentHash(raw: string | Uint8Array): string {
  return sha256(raw);
}

/** D11: external_id for LLM items = sha1(meeting_external_id + normalized agenda_number), else first 80 chars of the title. */
export function llmItemExternalId(meetingExternalId: string, agendaNumber: string | undefined, title: string): string {
  const key = agendaNumber && normalize(agendaNumber) ? normalize(agendaNumber) : normalize(title).slice(0, 80);
  return sha1(meetingExternalId + key);
}
