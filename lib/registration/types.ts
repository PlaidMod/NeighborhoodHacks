export type Language = 'en' | 'es'
export type LocalizedText = Record<Language, string>
export type WindowState = 'before_open' | 'open' | 'closed' | 'unknown'
export interface DeadlineRule {
  anchor: 'meeting_start' | 'previous_weekday'
  offset_days?: number
  offset_hours?: number
  offset_minutes?: number
  time?: string
  business_days?: boolean
  weekday?: string
  holidays?: string[]
}
export interface RegistrationMethod {
  id: string
  kind: 'online_form' | 'email' | 'phone' | 'card_at_meeting' | 'written' | 'remote'
  label: LocalizedText
  instructions: LocalizedText
  url?: string
  email?: string
  phone?: string
  availableAfterClose?: boolean
  opensRule?: DeadlineRule
  closesRule?: DeadlineRule
  /** Verified fields to prepare; the official form remains authoritative. */
  requiredFields?: string[]
  wordLimitSubject?: number
}
export interface RegistrationRecipe {
  bodyIds: string[]
  name: string
  policyUrl: string
  lastVerified: string
  verificationStatus: 'verified' | 'partial'
  minutes: number | null
  /** Conservative rehearsal target, never an official speaker allocation. */
  practiceMinutes?: number
  meetingLocation: string
  meetingLocationText?: LocalizedText
  methods: RegistrationMethod[]
  opensRule?: DeadlineRule
  closesRule?: DeadlineRule
  /** Weekday of the comment session where this generic recipe applies (Sunday = 0). */
  meetingWeekday?: number
  agendaOnly?: boolean
  notes: LocalizedText
  contact?: LocalizedText
  accommodations?: LocalizedText
  studentWrittenDefault?: boolean
}
export interface RegistrationWindow {
  state: WindowState
  opensAt?: string
  closesAt?: string
}
export type EmailFields = Record<string, string | undefined>
