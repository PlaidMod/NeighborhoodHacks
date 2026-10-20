import { z } from "zod"

export type Lang = "en" | "es"

/**
 * Everything a story may say, as structured facts (plan §9). Stories are written
 * from these and nothing else; the fact-check rejects any number, date or time
 * that isn't here. Built from the DB by the story job, never from news.
 */
export type StoryFacts = {
  item_id: string
  body_name: string
  /** Short form used in headlines, e.g. "HISD board". Falls back to body_name. */
  body_short?: string
  /** ISO 8601 with offset. Displayed in America/Chicago. */
  meeting_date: string
  meeting_type: "regular" | "special"
  meeting_status?: "scheduled" | "cancelled"
  agenda_number?: string
  /** Already redacted by P2 when contains_private_person is true. */
  title: string
  description?: string
  status: "upcoming" | "awaiting_result" | "decided"
  outcome?: { action?: string; vote_result?: "passed" | "failed" | "no_action" }
  amounts: { value: number; text: string; kind?: "money" | "rate" }[]
  tax_rates?: { adopted_rate?: number | null; no_new_revenue_rate?: number | null; voter_approval_rate?: number | null }
  registration?: {
    /** ISO 8601. When sign-up to speak opens and closes, from P4's resolver. */
    opens_at?: string
    closes_at?: string
    channels: string[]
    minutes_per_speaker?: number
  }
  last_election?: { date: string; votes_cast: number; registered_voters?: number }
  contains_private_person: boolean
  source_url: string
}

export const StorySchema = z.object({
  headline: z.string().min(10).max(120),
  dek: z.string().min(10).max(240),
  body_paragraphs: z.array(z.string().min(20).max(900)).min(2).max(4),
  renter_line: z.string().min(10).max(240),
})

export type Story = z.infer<typeof StorySchema>

export type StoryResult = {
  story_en: Story
  story_es: Story
  story_source: "ai" | "template"
  /** Why the AI attempts were rejected, for logs and the health view. Never shown to users. */
  problems: string[]
}

/** The label every AI-written story carries (Project_Plan.md §6). Template stories carry none. */
export const AI_LABEL: Record<Lang, string> = {
  en: "Written with AI from the official agenda — see source",
  es: "Escrito con IA a partir de la agenda oficial — ver la fuente",
}
