import { describe, expect, it } from 'vitest';
import { documentContentHash, itemContentHash, llmItemExternalId, meetingContentHash } from '@/lib/ingest/hash';

const item = { title: 'Approve  “budget”', status: 'upcoming' as const, amounts: [{ value: 5, text: '$5' }] };

describe('hash stability', () => {
  it('same input gives the same item hash', () => {
    expect(itemContentHash(item)).toBe(itemContentHash({ ...item }));
  });
  it('item hash ignores whitespace/case/curly-quote differences', () => {
    expect(itemContentHash(item)).toBe(itemContentHash({ ...item, title: 'approve "BUDGET"' }));
  });
  it('item hash changes with amount or status', () => {
    expect(itemContentHash(item)).not.toBe(itemContentHash({ ...item, amounts: [{ value: 6, text: '$6' }] }));
    expect(itemContentHash(item)).not.toBe(itemContentHash({ ...item, status: 'decided' }));
  });
  it('meeting hash changes when the date moves', () => {
    const m = { date: '2026-11-05T09:00:00-06:00', status: 'scheduled' as const, type: 'regular' as const };
    expect(meetingContentHash(m)).toBe(meetingContentHash({ ...m }));
    expect(meetingContentHash(m)).not.toBe(meetingContentHash({ ...m, date: '2026-11-06T09:00:00-06:00' }));
  });
  it('document hash is sha256 hex', () => {
    expect(documentContentHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('LLM item id uses agenda number, else title prefix', () => {
    expect(llmItemExternalId('m1', ' 4.A. ', 'x')).toBe(llmItemExternalId('m1', '4.a.', 'y'));
    expect(llmItemExternalId('m1', undefined, 'Title A')).not.toBe(llmItemExternalId('m1', undefined, 'Title B'));
  });
});
