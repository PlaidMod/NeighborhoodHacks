// Checks that the Gemini key in .env.local works: npx tsx scripts/gemini-smoke.ts [--model <id>]
// With GOOGLE_GENAI_USE_VERTEXAI=true the call goes to Vertex AI; otherwise to the Gemini API.
// Pass --model to check that a model ID exists before putting it in .env.local.
import { config } from 'dotenv'
import { z } from 'zod'
import { geminiModel, generateJson } from '../lib/gemini'

config({ path: '.env.local', quiet: true })

const flag = process.argv.indexOf('--model')
const model = flag === -1 ? geminiModel() : process.argv[flag + 1]
if (!model) throw new Error('Put a model ID after --model.')
const backend = process.env.GOOGLE_GENAI_USE_VERTEXAI?.toLowerCase() === 'true' ? 'Vertex AI' : 'Gemini API'

const answer = await generateJson({
  model,
  schema: z.object({ ok: z.boolean() }),
  contents: 'Reply with {"ok": true}.',
})
console.log(`${backend}, ${model}:`, answer)
