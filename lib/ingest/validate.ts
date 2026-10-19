import type { Item, Meeting } from '@/lib/adapters/types';
import { normalize } from './normalize';

// Quote check, date window and required fields. Pure functions; each returns
// a list of problems (empty means OK) so callers can drop or warn.

/** True if `quote` appears in `source` after normalize() on both sides. */
export function quoteInSource(quote: string, source: string): boolean {
  const q = normalize(quote);
  return q.length > 0 && normalize(source).includes(q);
}

export function dateInWindow(iso: string, window: { from: Date; to: Date }): boolean {
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t >= window.from.getTime() && t <= window.to.getTime();
}

export function validateMeeting(m: Meeting, window?: { from: Date; to: Date }): string[] {
  const errs: string[] = [];
  if (!m.external_id) errs.push('meeting: missing external_id');
  if (!m.body_id) errs.push(`meeting ${m.external_id}: missing body_id`);
  if (Number.isNaN(Date.parse(m.date))) errs.push(`meeting ${m.external_id}: unparseable date ${m.date}`);
  else if (window && !dateInWindow(m.date, window)) errs.push(`meeting ${m.external_id}: date ${m.date} outside window`);
  if (m.end_date && Number.isNaN(Date.parse(m.end_date))) errs.push(`meeting ${m.external_id}: unparseable end_date`);
  return errs;
}

export function validateItem(item: Item, sourceText?: string): string[] {
  const errs: string[] = [];
  const id = item.external_id || '(no id)';
  if (!item.external_id) errs.push('item: missing external_id');
  if (!item.title?.trim()) errs.push(`item ${id}: empty title`);
  if (!item.source_url?.trim()) errs.push(`item ${id}: missing source_url`);
  if (!item.meeting_external_id) errs.push(`item ${id}: missing meeting_external_id`);
  if (item.source_quote !== undefined && sourceText !== undefined && !quoteInSource(item.source_quote, sourceText)) {
    errs.push(`item ${id}: source_quote not found in source text`);
  }
  for (const a of item.amounts) {
    if (!item.title.includes(a.text) && !(item.description ?? '').includes(a.text)) {
      errs.push(`item ${id}: amount text "${a.text}" not in title/description`);
    }
  }
  return errs;
}

/** Duplicate external_ids within one list. */
export function duplicateIds(records: { external_id: string }[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const r of records) (seen.has(r.external_id) ? dup : seen).add(r.external_id);
  return [...dup];
}

/** §5.1 status rule. */
export function itemStatus(
  item: Pick<Item, 'action' | 'vote_result'>,
  meetingStart: string,
  now: Date = new Date(),
): Item['status'] {
  if (item.action || item.vote_result) return 'decided';
  return Date.parse(meetingStart) < now.getTime() ? 'awaiting_result' : 'upcoming';
}
