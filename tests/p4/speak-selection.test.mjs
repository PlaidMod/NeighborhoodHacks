import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSpeakItems } from '../../lib/speak/items.ts';
import { changeChannel, selectedChannel } from '../../lib/speak/selection.ts';
import { EMPTY_PROGRESS } from '../../lib/speak/progress.ts';

test('the default picker excludes past and outcome-pending items but keeps an explicit historical link', () => {
  const items = [
    { id: 'old', type: 'agenda', date: '2026-10-19T12:00:00Z', outcomePending: true },
    { id: 'later', type: 'agenda', date: '2026-10-23T12:00:00Z' },
    { id: 'next', type: 'agenda', date: '2026-10-21T12:00:00Z' },
  ];
  const now = Date.parse('2026-10-20T12:00:00Z');
  assert.deepEqual(selectSpeakItems(items, null, now).map(i => i.id), ['next', 'later']);
  assert.deepEqual(selectSpeakItems(items, 'old', now).map(i => i.id), ['old', 'next', 'later']);
});

test('expired channels are never silently replaced or confirmed for another channel', () => {
  const progress = { ...EMPTY_PROGRESS, channel: 'online', registrationStatus: 'confirmed', checklist: ['registration', 'materials'] };
  assert.equal(selectedChannel([{ id: 'written' }], progress.channel), null);
  const next = changeChannel(progress, 'written');
  assert.equal(next.channel, 'written');
  assert.equal(next.registrationStatus, 'not_started');
  assert.deepEqual(next.checklist, ['materials']);
  assert.equal(selectedChannel([{ id: 'written' }], next.channel)?.id, 'written');
  assert.equal(changeChannel(progress, 'online').registrationStatus, 'confirmed');
});
