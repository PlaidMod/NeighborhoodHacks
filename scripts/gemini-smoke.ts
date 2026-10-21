// Checks that the AI key in .env.local works: npx tsx scripts/gemini-smoke.ts [--model <id>]
// With OPENROUTER_API_KEY set (the team's setup) the call goes to OpenRouter. Without it, it goes
// to Gemini directly: Vertex AI when GOOGLE_GENAI_USE_VERTEXAI=true, otherwise the Gemini API.
// Pass --model to check that a model ID works before putting it in .env.local.
import { config } from 'dotenv'
import { z } from 'zod'
import { geminiModel, generateJson } from '../lib/gemini'
import { openRouterKey } from '../lib/openrouter'

config({ path: '.env.local', quiet: true })

const flag = process.argv.indexOf('--model')
const model = flag === -1 ? geminiModel() : process.argv[flag + 1]
if (!model) throw new Error('Put a model ID after --model.')
const backend = openRouterKey()
  ? 'OpenRouter'
  : process.env.GOOGLE_GENAI_USE_VERTEXAI?.toLowerCase() === 'true'
    ? 'Vertex AI'
    : 'Gemini API'

const answer = await generateJson({
  model,
  schema: z.object({ ok: z.boolean() }),
  contents: 'Reply with {"ok": true}.',
})
console.log(`${backend}, ${model}:`, answer)
