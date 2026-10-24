import { createHash } from "node:crypto"
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini"
import { openRouterJson, openRouterKey } from "@/lib/openrouter"
import type { Lang, WeeklyEdition, WeeklyItem } from "./build"

/**
 * The week in a few plain sentences: "This week Houston City Council approved
 * $12.9 million for concrete panel replacement…". Written by the LLM from the
 * items' own headlines, summaries and outcomes, and told to restate only those
 * (we summarize, we never recommend). Returns null when no model is set up or
 * it fails, so the page falls back to its fact lines.
 *
 * Cached in memory per edition for 6 hours: the brief changes when agendas do,
 * not per page view.
 */

const TTL_MS = 6 * 60 * 60 * 1000
const MAX_ITEMS = 40
const cache = new Map<string, { at: number; points: string[] }>()

const SCHEMA = {
  type: "object",
  properties: { points: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 } },
  required: ["points"],
}

function line(item: WeeklyItem, lang: Lang, kind: "decided" | "coming") {
  const story = lang === "es" ? item.story_es : item.story_en
  const head = story?.headline ?? item.title
  const dek = story?.dek ? ` — ${story.dek}` : ""
  const result = item.outcome?.vote_result ? ` [result: ${item.outcome.vote_result}]` : ""
  return `- (${kind}, ${item.body_name}, ${item.meeting_date.slice(0, 10)}) ${head}${dek}${result}`
}

export async function weeklyNarrative(edition: WeeklyEdition, lang: Lang): Promise<string[] | null> {
  const apiKey = openRouterKey()
  // Same model as the AI-written stories.
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
  if (!apiKey) return null

  const decided = edition.decided.slice(0, MAX_ITEMS / 2)
  const coming = [edition.lead, ...edition.comingUp].filter((i): i is WeeklyItem => !!i).slice(0, MAX_ITEMS / 2)
  if (decided.length + coming.length === 0) return null

  const key = createHash("sha1")
    .update(lang + ":v3")
    .update(JSON.stringify([...decided, ...coming].map((i) => [i.item_id, i.outcome?.vote_result ?? null])))
    .digest("hex")
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.points

  const language = lang === "es" ? "Spanish" : "English"
  const system = `You write the summary at the top of a neighborhood's weekly local-government brief in Houston.
Write 3 or 4 short sentences, each under 20 words, in plain ${language} that a 12-year-old could follow. Explain what is actually happening and why it matters to a neighbor, covering the most important things from the list below.
- Start the first sentence with "This week" (or "Esta semana" in Spanish).
- Say who did what: name the government (e.g. "Houston City Council", "the county commissioners").
- Decided items happened: use past tense, and say if they passed or failed when a result is given. Coming items are upcoming votes: say what they will decide and when.
- Group many similar routine items into one sentence (e.g. "the county also has 14 land and permit approvals on Oct. 29").
- Use only facts in the list. Never give opinions, never say whether something is good or bad, never tell anyone what to do or how to vote.
- No government jargon, ever. Translate it: "plat" or "replat" -> "plan to divide land for building", "interlocal agreement" -> "deal with another government", "Purchasing Agent" -> "the county's buying office", "appropriation" -> "money", "ordinance" -> "city law", "amendment to an agreement" -> "change to a contract", "TIRZ"/"redevelopment authority" -> "a neighborhood development fund".
- Never copy an agenda title. Say what it does in everyday words.`

  try {
    const text = await openRouterJson({
      apiKey,
      model,
      system,
      content: [
        "Decided this week:",
        ...decided.map((i) => line(i, lang, "decided")),
        "",
        "Coming up:",
        ...coming.map((i) => line(i, lang, "coming")),
      ].join("\n"),
      schema: SCHEMA,
      temperature: 0.2,
      timeoutMs: 15_000,
    })
    const parsed = JSON.parse(text) as { points?: unknown }
    const points = Array.isArray(parsed.points)
      ? parsed.points.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim()).slice(0, 4)
      : []
    if (points.length === 0) return null
    cache.set(key, { at: Date.now(), points })
    return points
  } catch (err) {
    console.warn("weekly narrative failed (falling back to fact lines):", err)
    return null
  }
}
