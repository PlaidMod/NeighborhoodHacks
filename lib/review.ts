// The review queue's decision (agent-scraper-spec §9 P2-E). Items the AI read that could send a
// text, and items whose quote couldn't be checked, wait here as review_status = 'pending'.
// Approving lets P3's alerts job text them; rejecting moves them to the timeline tier for good.

export type ReviewDecision = 'approve' | 'reject';

export type ReviewPatch = {
  review_status: 'approved' | 'rejected';
  reviewed_at: string;
  reviewed_by: string;
  tier?: 'timeline';
};

export type ReviewDeps = {
  /** Throws (redirect or 404) unless an allowlisted admin is signed in. */
  requireAdmin: () => Promise<{ email: string }>;
  /** Updates the item only while it's still pending, so a double click can't flip a decision. */
  updatePending: (itemId: string, patch: ReviewPatch) => Promise<void>;
  now?: () => Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function decideReview(decision: ReviewDecision, itemId: string, deps: ReviewDeps): Promise<'done' | 'invalid'> {
  const { email } = await deps.requireAdmin();
  if (!UUID.test(itemId)) return 'invalid';
  const reviewed = { reviewed_at: (deps.now?.() ?? new Date()).toISOString(), reviewed_by: email };
  const patch: ReviewPatch =
    decision === 'approve' ? { review_status: 'approved', ...reviewed } : { review_status: 'rejected', tier: 'timeline', ...reviewed };
  await deps.updatePending(itemId, patch);
  return 'done';
}
