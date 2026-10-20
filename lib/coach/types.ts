export type CoachLanguage = "en" | "es"
export type CoachMode = "explain" | "coach"
export type CoachProvider = "local" | "gemini"
export interface CoachInput {
  mode: CoachMode
  item_id: string
  zip?: string
  draft?: string
  lang: CoachLanguage
  browser_id?: string
}
export interface GuardrailHit {
  quote: string
  category: "personal_attack" | "private_info" | "threat"
  reason: string
}
export interface CoachPayload {
  questions: string[]
  feedback: { area: "structure" | "clarity" | "timing" | "item_reference"; note: string }[]
  cut_suggestions: { quote: string; reason: string }[]
  guardrail_hits: GuardrailHit[]
  estimated_seconds: number
}
export interface ExplainPayload {
  plain_summary: string
  who_it_affects: string
  questions_for_user: string[]
}
export type CoachResponse = CoachPayload & { provider: CoachProvider }
export type ExplainResponse = ExplainPayload & { provider: CoachProvider }
/** Only server-resolved prototype facts belong in this context. */
export interface CoachItem {
  id: string
  title: string
  summary: string
  why: string
  audiences: string[]
  source: string
  bodyName: string
  minutes: number
  isSample?: boolean
}
export type ProviderCall = (input: CoachInput, item: CoachItem, signal: AbortSignal) => Promise<unknown>
