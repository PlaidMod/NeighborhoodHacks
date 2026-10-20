import type { CoachLanguage, GuardrailHit } from "./types.ts"

export const MAX_DRAFT_CHARS = 2000

export function estimateSeconds(draft: string): number {
  const words = draft.trim() ? draft.trim().split(/\s+/u).length : 0
  return Math.ceil(words / 130 * 60)
}

const patterns: { category: GuardrailHit["category"]; pattern: RegExp }[] = [
  { category: "private_info", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu },
  { category: "private_info", pattern: /(?<!\d)(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}(?!\d)/gu },
  { category: "private_info", pattern: /\b\d{1,6}\s+(?:[\p{L}\d]+\s+){1,4}(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|way)\b\.?/giu },
  { category: "private_info", pattern: /\b(?:calle|avenida|av\.|carretera|camino|bulevar)\s+(?:[\p{L}]+\s+){1,4}(?:n[uú]mero\s+|#\s*)?\d{1,6}\b/giu },
  { category: "threat", pattern: /\b(?:I\s+(?:will|am going to)|I'll|we\s+will|we're going to)\s+(?:kill|shoot|hurt|attack|stab)\s+(?:you|him|her|them|the\s+(?:mayor|board|council|trustees?))\b/giu },
  { category: "threat", pattern: /\b(?:I\s+will|I'll|we\s+will)\s+burn\s+(?:your|his|her|their)\s+(?:house|home)\s+down\b/giu },
  { category: "threat", pattern: /\b(?:(?:te|lo|la|los|las|les)\s+(?:voy|vamos)\s+a\s+(?:matar|disparar|golpear|atacar)|(?:voy|vamos)\s+a\s+(?:matarte|matarlo|matarla|matarlos|matarlas|dispararte|golpearte|atacarte))\b/giu },
  { category: "threat", pattern: /\b(?:voy|vamos)\s+a\s+(?:matar|disparar|golpear|atacar)\s+(?:al\s+(?:alcalde|concejal|comisionado)|a\s+la\s+(?:alcaldesa|junta))\b/giu },
  { category: "personal_attack", pattern: /\b(?:you\s+are|you're|he\s+is|she\s+is|(?:the\s+)?(?:mayor|trustee|councilmember|commissioner)(?:\s+[\p{L}-]+){0,3}\s+is)\s+(?:an?\s+)?(?:idiot|moron|scumbag|stupid|worthless|asshole)\b/giu },
  { category: "personal_attack", pattern: /\b(?:eres|usted\s+es|(?:el\s+|la\s+)?(?:alcalde|alcaldesa|concejal|comisionado)(?:\s+[\p{L}-]+){0,3}\s+es)\s+(?:un[ao]?\s+)?(?:idiota|imb[eé]cil|est[uú]pid[oa]|basura|in[uú]til)\b/giu },
]

export function detectGuardrails(draft: string, lang: CoachLanguage = "en"): GuardrailHit[] {
  const reasons = lang === "es" ? {
    private_info: "Contiene datos de contacto o una dirección; revisa antes de compartir.",
    threat: "Contiene una amenaza contra una persona o un grupo.",
    personal_attack: "Dirige un insulto a una persona; puedes criticar sus decisiones y políticas.",
  } : {
    private_info: "Contains contact information or a street address; review before sharing.",
    threat: "Contains a threat against a person or group.",
    personal_attack: "Directs an insult at a person; criticism of decisions and policies is allowed.",
  }
  const hits: GuardrailHit[] = []
  for (const { category, pattern } of patterns) {
    for (const match of draft.matchAll(pattern)) {
      // Negated statements describe what the speaker will not do.
      const prefix = draft.slice(Math.max(0, match.index - 12), match.index)
      if (category !== "private_info" && /\b(?:no|not|never|nunca|jam[aá]s)\s*$/iu.test(prefix)) continue
      // A possessive abstract object belongs to policy criticism, not the person/body.
      // Keep physical targets such as "the board's members" eligible for detection.
      const suffix = draft.slice(match.index + match[0].length)
      if (category === "threat" && /^(?:['’]s|['’])\s+(?:decisions?|polic(?:y|ies)|proposals?|budgets?|rules?|plans?|resolutions?|votes?|positions?|arguments?)\b/iu.test(suffix)) continue
      if (!hits.some(hit => hit.quote === match[0] && hit.category === category)) {
        hits.push({ quote: match[0], category, reason: reasons[category] })
      }
    }
  }
  return hits
}

/** Removes only literal hit spans; callers should show reasons and offer undo. */
export function removeFlaggedQuotes(draft: string, hits: readonly { quote: string }[]): string {
  const spans: [number, number][] = []
  for (const { quote } of hits) {
    if (!quote) continue
    let from = 0
    while (from < draft.length) {
      const start = draft.indexOf(quote, from)
      if (start < 0) break
      spans.push([start, start + quote.length])
      from = start + 1
    }
  }
  spans.sort((a, b) => a[0] - b[0])
  let cursor = 0
  let result = ""
  for (const [start, end] of spans) {
    if (start > cursor) result += draft.slice(cursor, start)
    cursor = Math.max(cursor, end)
  }
  return result + draft.slice(cursor)
}
