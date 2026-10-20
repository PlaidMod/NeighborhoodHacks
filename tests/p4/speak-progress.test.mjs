import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_PROGRESS, progressKey, loadProgress, saveProgress, clearProgress } from '../../lib/speak/progress.ts';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const completed = {
  version: 1, step: 3, registrationStatus: 'confirmed', channel: 'in_person',
  draft: 'I support safer crossings near our school.', stance: 'support',
  experience: 'I walk here daily.', ask: 'Please fund the crossing.',
  reminderRequested: true, checklist: ['registration', 'practice'],
};

test('restores all user progress after saving', () => {
  const local = storage();
  assert.equal(saveProgress(local, 'council:42', completed), true);
  assert.deepEqual(loadProgress(local, 'council:42'), completed);
});

test('switching exact item IDs never transfers another item draft', () => {
  const local = storage();
  saveProgress(local, 'a/b', completed);
  for (const id of ['a%2Fb', 'a', 'a/b ', 'A/b', 'a?b']) {
    assert.notEqual(progressKey(id), progressKey('a/b'));
    assert.deepEqual(loadProgress(local, id), EMPTY_PROGRESS);
  }
  assert.ok(progressKey('a/b').endsWith('a%2Fb'));
});

test('corrupt, obsolete, incomplete and unexpected records default safely', () => {
  const invalid = [
    '{', 'null', '[]', '"text"', '{}',
    JSON.stringify({ ...completed, version: 0 }),
    JSON.stringify({ ...completed, step: -1 }),
    JSON.stringify({ ...completed, step: 4 }),
    JSON.stringify({ ...completed, step: 1.5 }),
    JSON.stringify({ ...completed, step: null }),
    JSON.stringify({ ...completed, registrationStatus: 'sent' }),
    JSON.stringify({ ...completed, stance: 'neutral' }),
    JSON.stringify({ ...completed, channel: {} }),
    JSON.stringify({ ...completed, reminderRequested: 'yes' }),
    JSON.stringify({ ...completed, checklist: [42] }),
    JSON.stringify({ ...completed, unexpected: 'private metadata' }),
    JSON.stringify(completed).replace('{', '{"__proto__":{"polluted":true},'),
    JSON.stringify({ ...completed, constructor: 'bad' }),
  ];
  for (const raw of invalid) {
    assert.deepEqual(loadProgress({ getItem: () => raw }, 'item'), EMPTY_PROGRESS, raw);
  }
  assert.equal({}.polluted, undefined);
});

test('rejects oversized strings and checklists but preserves exact allowed boundaries', () => {
  const local = storage();
  const boundary = { ...completed, draft: 'd'.repeat(2000), experience: 'e'.repeat(500), ask: 'a'.repeat(500), channel: 'c'.repeat(100), checklist: Array(32).fill('x'.repeat(100)) };
  assert.equal(saveProgress(local, 'item', boundary), true);
  assert.deepEqual(loadProgress(local, 'item'), boundary);
  for (const patch of [
    { draft: 'd'.repeat(2001) }, { experience: 'e'.repeat(501) },
    { ask: 'a'.repeat(501) }, { channel: 'c'.repeat(101) },
    { checklist: Array(33).fill('x') }, { checklist: ['x'.repeat(101)] },
  ]) {
    const invalid = { ...completed, ...patch };
    assert.deepEqual(loadProgress({ getItem: () => JSON.stringify(invalid) }, 'item'), EMPTY_PROGRESS);
    assert.equal(saveProgress(local, 'item', invalid), false);
    assert.deepEqual(loadProgress(local, 'item'), boundary);
  }
});

test('unavailable and throwing browser storage never crashes', () => {
  const throwing = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('denied'); },
  };
  for (const local of [null, throwing]) {
    assert.deepEqual(loadProgress(local, 'item'), EMPTY_PROGRESS);
    assert.equal(saveProgress(local, 'item', completed), false);
    assert.equal(clearProgress(local, 'item'), false);
  }
});

test('clearing affects only the chosen item', () => {
  const local = storage();
  saveProgress(local, 'first', completed);
  saveProgress(local, 'second', { ...completed, draft: 'Another item.' });
  assert.equal(clearProgress(local, 'first'), true);
  assert.deepEqual(loadProgress(local, 'first'), EMPTY_PROGRESS);
  assert.equal(loadProgress(local, 'second').draft, 'Another item.');
});

test('empty and loaded progress values do not share mutable checklists', () => {
  const first = loadProgress(null, 'item');
  first.checklist.push('changed');
  assert.deepEqual(loadProgress(null, 'item').checklist, []);
  assert.deepEqual(EMPTY_PROGRESS.checklist, []);
});
