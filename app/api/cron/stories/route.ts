import { isAuthorizedCron, unauthorizedCronResponse } from '@/lib/cron'
import { llmConfigured } from '@/lib/openrouter'
import { geminiStoryGenerator } from '@/lib/stories/gemini'
import { runStoryJob, supabaseStoryStore } from '@/lib/stories/job'

// Writes stories for items that P2's ingest flagged with needs_story. The alerts cron
// runs the same job first; this route lets a teammate trigger it by hand.
export const maxDuration = 300

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return unauthorizedCronResponse()
  // Without a Gemini key every story uses the plain template, which still passes the fact-check.
  const generate = llmConfigured() ? geminiStoryGenerator : undefined
  const result = await runStoryJob({ store: supabaseStoryStore, generate, limit: 10 })
  return Response.json(result)
}
