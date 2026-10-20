import { isAuthorizedCron, unauthorizedCronResponse } from '@/lib/cron'
import { getOptionalEnv } from '@/lib/env'
import { geminiModel } from '@/lib/gemini'
import { geminiExtractor, geminiJudge, judgeModel, runPerspectivesJob, supabasePerspectivesStore } from '@/lib/perspectives/job'
import { runAlertsJob, supabaseAlertsStore } from '@/lib/sms/job'
import { twilioConfigured } from '@/lib/sms/subscriber'
import { twilioClient, twilioConfigFromEnv } from '@/lib/sms/twilio'
import { geminiStoryGenerator } from '@/lib/stories/gemini'
import { runStoryJob, supabaseStoryStore } from '@/lib/stories/job'
import { loadRegistrationWindows } from '@/lib/registration/server'

// GET /api/cron/alerts (Technical Plan §11). Writes pending stories first, so texts can
// use their headlines, then news coverage blocks (§9a), then queues and sends alerts. Without Twilio keys it queues but
// sends nothing.
export const maxDuration = 300

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return unauthorizedCronResponse()
  const stories = await runStoryJob({
    store: supabaseStoryStore,
    generate: getOptionalEnv('GEMINI_API_KEY') ? geminiStoryGenerator : undefined,
    limit: 10,
  })
  // News coverage blocks (perspectives spec §6). They never feed texts, so a failure here,
  // such as P2's news tables not existing yet, must not stop the alerts below.
  let perspectives: unknown = 'skipped: no Gemini key'
  if (getOptionalEnv('GEMINI_API_KEY')) {
    try {
      perspectives = await runPerspectivesJob({
        store: supabasePerspectivesStore,
        extract: geminiExtractor,
        judge: geminiJudge,
        models: { extract: geminiModel(), judge: judgeModel() },
      })
    } catch (error) {
      perspectives = 'failed'
      console.warn(`perspectives job skipped: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const twilio = twilioConfigured() ? twilioClient(twilioConfigFromEnv()) : null
  const alerts = await runAlertsJob({
    store: supabaseAlertsStore,
    send: twilio ? async (to, body) => void (await twilio.sendSms(to, body)) : null,
    siteUrl: getOptionalEnv('SITE_URL') ?? new URL(req.url).origin,
    windows: await loadRegistrationWindows(),
  })
  return Response.json({ stories, perspectives, alerts })
}
