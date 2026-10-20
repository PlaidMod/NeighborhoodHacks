import { cookies } from 'next/headers'
import { z } from 'zod'
import { jsonError } from '@/lib/sms/http'
import { SUBSCRIBER_COOKIE, verifySubscriber } from '@/lib/sms/subscriber'
import { saveReminder } from '@/lib/sms/subscribers'

// POST /api/reminders { item_id }: Speak up (P4) asks for reminders 7a/7b on one item.
// This (user_id, item_id) row is the only server record that someone started Speak up.
// No draft content is ever sent here (Technical Plan §11).

const Body = z.object({ item_id: z.uuid() })

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError('invalid_request', 400)
  const userId = verifySubscriber((await cookies()).get(SUBSCRIBER_COOKIE)?.value)
  if (!userId) return jsonError('not_subscribed', 401)
  await saveReminder(userId, parsed.data.item_id)
  return Response.json({ ok: true })
}
