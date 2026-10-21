import { describe, expect, it } from 'vitest';
import { decideReview } from '@/lib/review';

const ID = '3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c';
const NOW = new Date('2026-10-21T15:00:00Z');

function deps(order: string[] = []) {
  const updates: { id: string; patch: object }[] = [];
  return {
    updates,
    requireAdmin: async () => {
      order.push('requireAdmin');
      return { email: 'admin@example.org' };
    },
    updatePending: async (id: string, patch: object) => {
      order.push('update');
      updates.push({ id, patch });
    },
    now: () => NOW,
  };
}

describe('decideReview', () => {
  it('checks the admin before writing anything', async () => {
    const order: string[] = [];
    await decideReview('approve', ID, deps(order));
    expect(order).toEqual(['requireAdmin', 'update']);
  });

  it('approve records who approved it and when', async () => {
    const d = deps();
    expect(await decideReview('approve', ID, d)).toBe('done');
    expect(d.updates).toEqual([{ id: ID, patch: { review_status: 'approved', reviewed_at: NOW.toISOString(), reviewed_by: 'admin@example.org' } }]);
  });

  it('reject also moves the item to the timeline tier, so it can never text', async () => {
    const d = deps();
    await decideReview('reject', ID, d);
    expect(d.updates[0]!.patch).toEqual({ review_status: 'rejected', tier: 'timeline', reviewed_at: NOW.toISOString(), reviewed_by: 'admin@example.org' });
  });

  it('refuses an ID that is not a UUID, after the admin check and without writing', async () => {
    const order: string[] = [];
    const d = deps(order);
    expect(await decideReview('approve', "1' or '1'='1", d)).toBe('invalid');
    expect(order).toEqual(['requireAdmin']);
    expect(d.updates).toEqual([]);
  });

  it('stops when the admin check throws (signed out or not on the list)', async () => {
    const d = { ...deps(), requireAdmin: async () => Promise.reject(new Error('NEXT_REDIRECT')) };
    await expect(decideReview('approve', ID, d)).rejects.toThrow('NEXT_REDIRECT');
    expect(d.updates).toEqual([]);
  });
});
