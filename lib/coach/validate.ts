import type { CoachInput, CoachPayload, ExplainPayload } from "./types.ts"
import { MAX_DRAFT_CHARS } from "./guardrails.ts"

type Obj = Record<string, unknown>
const object = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)
const keys = (v: Obj, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k))
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 4000
const strings = (v: unknown) => Array.isArray(v) && v.length <= 10 && v.every(text)
const list = (v: unknown, check: (v: Obj) => boolean) => Array.isArray(v) && v.length <= 30 && v.every(x => object(x) && check(x))

// Reject obvious provider ghostwriting instructions without filtering residents' drafts.
// This is a narrow additional check, not proof of semantic neutrality.
const replacementInstructions = [
  /\b(?:say|write|try saying|use this wording|di|diga|escribe|escriba|puedes decir)\s*:\s*(?:["“«]|I\b|I['’]m\b|we\b|yo\b|me\b)/iu,
  /\b(?:replace|rewrite|rephrase)\b[^.!?\n]{0,100}\b(?:with|as)\s*:?\s*["“«]/iu,
  /\b(?:reemplaza|reemplace|sustituye|sustituya|reformula)\b[^.!?\n]{0,100}\b(?:por|con|as[ií])\s*:?\s*["“«]/iu,
]
const coachText = (v: unknown): v is string => text(v) && !replacementInstructions.some(pattern => pattern.test(v))

export const isBrowserId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)

export function parseCoachInput(v: unknown): CoachInput | null {
  if (!object(v) || !keys(v, ["mode", "item_id", "zip", "draft", "lang", "browser_id"])) return null
  if (v.mode !== "explain" && v.mode !== "coach") return null
  if (v.lang !== "en" && v.lang !== "es") return null
  if (typeof v.item_id !== "string" || !/^[a-z0-9-]{1,120}$/.test(v.item_id)) return null
  if (v.zip !== undefined && (typeof v.zip !== "string" || !/^\d{5}$/.test(v.zip))) return null
  if (v.browser_id !== undefined && !isBrowserId(v.browser_id)) return null
  if (v.draft !== undefined && (typeof v.draft !== "string" || v.draft.length > MAX_DRAFT_CHARS)) return null
  if (v.mode === "coach" && (typeof v.draft !== "string" || !v.draft.trim())) return null
  return v as unknown as CoachInput
}

export function validateExplainPayload(v: unknown): ExplainPayload | null {
  if (!object(v) || !keys(v, ["plain_summary", "who_it_affects", "questions_for_user"])) return null
  if (!text(v.plain_summary) || !text(v.who_it_affects) || !strings(v.questions_for_user)) return null
  return v as unknown as ExplainPayload
}

export function validateCoachPayload(v: unknown, draft: string): CoachPayload | null {
  if (!object(v) || !keys(v, ["questions", "feedback", "cut_suggestions", "guardrail_hits", "estimated_seconds"])) return null
  const quote = (x: Obj) => text(x.quote) && draft.includes(x.quote) && coachText(x.reason)
  if (!Array.isArray(v.questions) || v.questions.length > 10 || !v.questions.every(coachText)) return null
  if (!list(v.feedback, x => keys(x, ["area", "note"]) && typeof x.area === "string" && ["structure", "clarity", "timing", "item_reference"].includes(x.area) && coachText(x.note))) return null
  if (!list(v.cut_suggestions, x => keys(x, ["quote", "reason"]) && quote(x))) return null
  if (!list(v.guardrail_hits, x => keys(x, ["quote", "category", "reason"]) && typeof x.category === "string" && ["personal_attack", "private_info", "threat"].includes(x.category) && quote(x))) return null
  if (typeof v.estimated_seconds !== "number" || !Number.isFinite(v.estimated_seconds) || v.estimated_seconds < 0 || v.estimated_seconds > 10000) return null
  return v as unknown as CoachPayload
}
