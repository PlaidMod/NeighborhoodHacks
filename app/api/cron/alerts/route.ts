import { isAuthorizedCron, unauthorizedCronResponse } from '@/lib/cron'
import { getOptionalEnv } from '@/lib/env'
import { runAlertsJob, supabaseAlertsStore } from '@/lib/sms/job'
import { twilioConfigured } from '@/lib/sms/subscriber'
import { twilioClient, twilioConfigFromEnv } from '@/lib/sms/twilio'
import { geminiStoryGenerator } from '@/lib/stories/gemini'
import { runStoryJob, supabaseStoryStore } from '@/lib/stories/job'

// GET /api/cron/alerts (Technical Plan §11). Writes pending stories first, so texts can
// use their headlines, then queues and sends alerts. Without Twilio keys it queues but
// sends nothing.
export const maxDuration = 300

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return unauthorizedCronResponse()
  const stories = await runStoryJob({
    store: supabaseStoryStore,
    generate: getOptionalEnv('GEMINI_API_KEY') ? geminiStoryGenerator : undefined,
    limit: 10,
  })
  const twilio = twilioConfigured() ? twilioClient(twilioConfigFromEnv()) : null
  const alerts = await runAlertsJob({
    store: supabaseAlertsStore,
    send: twilio ? async (to, body) => void (await twilio.sendSms(to, body)) : null,
    siteUrl: getOptionalEnv('SITE_URL') ?? new URL(req.url).origin,
  })
  return Response.json({ stories, alerts })
}
