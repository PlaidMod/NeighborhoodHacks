import { db } from '@/lib/db'
import { alertWindow } from './alerts'

/** Read-only input to P3's existing opt-in, quiet-hours and idempotency checks. */
export async function loadRegistrationWindows(now = new Date()) {
  const { data, error } = await db().from('items')
    .select('id, body_id, meeting:meetings!inner(date, type, status)')
    .eq('status', 'upcoming').is('removed_at', null)
    .eq('meeting.status', 'scheduled').gt('meeting.date', now.toISOString()).limit(500)
  if (error) throw error
  const rows = (data ?? []) as unknown as { id: string; body_id: string | null; meeting: { date: string; type: string | null; status: string } | null }[]
  const windows: Record<string, { opens_at: string | null; closes_at: string | null }> = {}
  for (const row of rows) {
    if (!row.body_id || !row.meeting) continue
    const window = alertWindow(row.body_id, row.meeting, now)
    if (window) windows[row.id] = window
  }
  return windows
}
