'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminAuth'
import { db } from '@/lib/db'
import { decideReview, type ReviewDecision, type ReviewPatch } from '@/lib/review'

async function decide(decision: ReviewDecision, formData: FormData): Promise<void> {
  await decideReview(decision, String(formData.get('id') ?? ''), {
    requireAdmin,
    async updatePending(id: string, patch: ReviewPatch) {
      const { error } = await db().from('items').update(patch).eq('id', id).eq('review_status', 'pending')
      if (error) throw new Error(error.message)
    },
  })
  revalidatePath('/admin/review')
}

/** Approve a pending item: P3's next alerts run may text it. */
export async function approveItem(formData: FormData): Promise<void> {
  await decide('approve', formData)
}

/** Reject a pending item: it stays on the timeline and never texts. */
export async function rejectItem(formData: FormData): Promise<void> {
  await decide('reject', formData)
}
