import { generateJson } from "@/lib/gemini"
import type { JsonGenerator } from "./generate"
import { StorySchema } from "./types"

/** Stories are short; don't wait as long as extraction does. */
const STORY_TIMEOUT_MS = 30_000

/**
 * The production story generator: P5's shared Gemini client (lib/gemini.ts), with
 * structured output validated against StorySchema. Server-only. writeStories()
 * still runs its own fact-check on whatever comes back.
 */
export const geminiStoryGenerator: JsonGenerator = ({ system, prompt }) =>
  generateJson({ schema: StorySchema, contents: prompt, system, temperature: 0.2, timeoutMs: STORY_TIMEOUT_MS })
