import { factCheck } from "./factCheck"
import { buildStoryPrompt } from "./prompt"
import { templateStory } from "./template"
import { StorySchema, type Lang, type Story, type StoryFacts, type StoryResult } from "./types"

/**
 * Anything that turns a prompt into JSON. Production uses Gemini (see gemini.ts);
 * tests pass a fake. Keeping it injected means the story job never needs a
 * network connection to be tested.
 */
export type JsonGenerator = (req: { system: string; prompt: string; lang: Lang }) => Promise<unknown>

const MAX_ATTEMPTS = 2

async function tryLang(facts: StoryFacts, lang: Lang, generate: JsonGenerator, problems: string[]): Promise<Story | null> {
  const { system, prompt } = buildStoryPrompt(facts, lang)
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await generate({ system, prompt, lang })
      const parsed = StorySchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : raw)
      if (!parsed.success) {
        problems.push(`${lang} attempt ${attempt}: schema: ${parsed.error.issues.map((i) => i.message).join("; ")}`)
        continue
      }
      const found = factCheck(parsed.data, facts, lang)
      if (found.length === 0) return parsed.data
      problems.push(...found.map((p) => `${lang} attempt ${attempt}: ${p}`))
    } catch (e) {
      problems.push(`${lang} attempt ${attempt}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return null
}

/**
 * Write one item's story in English and Spanish (plan §9). Each language gets one
 * regeneration after a failed fact-check. If either language still fails, both
 * use the template, so the item's label stays consistent.
 */
export async function writeStories(facts: StoryFacts, generate?: JsonGenerator): Promise<StoryResult> {
  const problems: string[] = []
  if (generate) {
    const en = await tryLang(facts, "en", generate, problems)
    const es = en ? await tryLang(facts, "es", generate, problems) : null
    if (en && es) return { story_en: en, story_es: es, story_source: "ai", problems }
  } else {
    problems.push("no generator configured")
  }
  return {
    story_en: templateStory(facts, "en"),
    story_es: templateStory(facts, "es"),
    story_source: "template",
    problems,
  }
}
