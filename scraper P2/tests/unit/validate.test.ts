import { describe, expect, it } from 'vitest';
import type { Classifier, Item } from '@/lib/adapters/types';
import { attributeBody } from '@/lib/ingest/attribution';
import { classifyStub } from '@/lib/ingest/classifyStub';
import { dateInWindow, duplicateIds, itemStatus, quoteInSource, validateItem } from '@/lib/ingest/validate';

const item: Item = {
  external_id: 'i1',
  meeting_external_id: 'm1',
  body_id: 'b',
  title: 'Pay $5',
  status: 'upcoming',
  amounts: [{ value: 5, text: '$5' }],
  attachments: [],
  contains_private_person: false,
  source_url: 'https://x.gov',
};

describe('validate', () => {
  it('quote check normalizes both sides', () => {
    expect(quoteInSource('Approve the “budget”', 'x approve  the "budget" y')).toBe(true);
    expect(quoteInSource('made up', 'x')).toBe(false);
  });
  it('window check', () => {
    const w = { from: new Date('2026-10-01'), to: new Date('2026-10-31') };
    expect(dateInWindow('2026-10-15T09:00:00-05:00', w)).toBe(true);
    expect(dateInWindow('2026-11-15T09:00:00-06:00', w)).toBe(false);
  });
  it('item checks', () => {
    expect(validateItem(item)).toEqual([]);
    expect(validateItem({ ...item, title: ' ', source_quote: 'q' }, 'nope').length).toBeGreaterThanOrEqual(2);
  });
  it('duplicates', () => expect(duplicateIds([{ external_id: 'a' }, { external_id: 'a' }, { external_id: 'b' }])).toEqual(['a']));
  it('status rule', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(itemStatus({ vote_result: 'passed' }, '2026-10-30T09:00:00-05:00', now)).toBe('decided');
    expect(itemStatus({}, '2026-10-15T09:00:00-05:00', now)).toBe('awaiting_result');
    expect(itemStatus({}, '2026-10-30T09:00:00-05:00', now)).toBe('upcoming');
  });
});

describe('attribution', () => {
  const map = { 'Flood Control District': 'flood_control' };
  it('maps headers case-insensitively', () => expect(attributeBody('  FLOOD CONTROL district ', 'cc', map)).toBe('flood_control'));
  it('falls back to default', () => expect(attributeBody('Budget', 'cc', map)).toBe('cc'));
});

describe('classifier contract', () => {
  it('stub returns timeline/other and any Classifier can be swapped in', () => {
    const body = { id: 'b', sms_eligible: true, type: 'mud' };
    const run = (c: Classifier) => c(item, body, null);
    expect(run(classifyStub)).toEqual({ item_type: 'other', tier: 'timeline' });
    expect(run(() => ({ item_type: 'tax_rate', tier: 'sms', rule_fired: 'x' })).tier).toBe('sms');
  });
});
