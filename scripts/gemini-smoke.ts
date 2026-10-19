// Checks that the Gemini key in .env.local works: npx tsx scripts/gemini-smoke.ts
import { config } from 'dotenv'
import { z } from 'zod'
import { geminiModel, generateJson } from '../lib/gemini'

config({ path: '.env.local' })

const answer = await generateJson({
  schema: z.object({ ok: z.boolean() }),
  contents: 'Reply with {"ok": true}.',
})
console.log(geminiModel(), answer)
