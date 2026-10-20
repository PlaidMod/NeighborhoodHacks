import type { Persona, Topic, UpdateType } from "./types"

export const APP_NAME = "ShowUp"

const DAY = 86_400_000

// Every date and time is shown in Central time (CLAUDE.md "Time"), in the page's language.
// These screens render only in the browser (the shell waits for the profile), so the
// language is read from <html lang>, which app/layout.tsx sets from next-intl.
export const TIME_ZONE = "America/Chicago"

export function uiLocale() {
  return typeof document !== "undefined" && document.documentElement.lang === "es" ? "es-US" : "en-US"
}
const isEs = () => uiLocale() === "es-US"

/** Days since 1970 for the Central-time calendar date of `d`. */
function centralDay(d: Date) {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(d)
    .split("-")
    .map(Number)
  return Math.round(Date.UTC(y!, m! - 1, day!) / DAY)
}

export function daysFromNow(iso: string) {
  return centralDay(new Date(iso)) - centralDay(new Date())
}

export function relDay(iso: string) {
  const n = daysFromNow(iso)
  const es = isEs()
  if (n === 0) return es ? "Hoy" : "Today"
  if (n === 1) return es ? "Mañana" : "Tomorrow"
  if (n === -1) return es ? "Ayer" : "Yesterday"
  if (n > 1 && n < 7) {
    const w = new Date(iso).toLocaleDateString(uiLocale(), { weekday: "long", timeZone: TIME_ZONE })
    return es ? w.charAt(0).toUpperCase() + w.slice(1) : w
  }
  if (n < 0 && n > -7) return es ? `Hace ${-n} días` : `${-n} days ago`
  return fmtDate(iso)
}

/** relDay for mid-sentence use: "by tomorrow", "by Wednesday" */
export function relDayLower(iso: string) {
  const n = daysFromNow(iso)
  const s = relDay(iso)
  return n >= -1 && n <= 1 ? s.toLowerCase() : s
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(iso).toLocaleDateString(uiLocale(), { ...opts, timeZone: TIME_ZONE })
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(uiLocale(), { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE })
}

export function fmtDateTime(iso: string) {
  return `${fmtDate(iso, { weekday: "short", month: "short", day: "numeric" })} · ${fmtTime(iso)}`
}

export function monthDay(iso: string) {
  const d = new Date(iso)
  return {
    month: d.toLocaleDateString(uiLocale(), { month: "short", timeZone: TIME_ZONE }).replace(".", "").toUpperCase(),
    day: Number(d.toLocaleDateString("en-US", { day: "numeric", timeZone: TIME_ZONE })),
  }
}

export function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export const PERSONAS: { id: Persona; label: string; blurb: string }[] = [
  { id: "student", label: "Student", blurb: "High school or college" },
  { id: "parent", label: "Parent", blurb: "Kids in local schools" },
  { id: "renter", label: "Renter", blurb: "You rent your home" },
  { id: "homeowner", label: "Homeowner", blurb: "You pay property tax directly" },
  { id: "voter", label: "First-time voter", blurb: "New to voting here" },
]

export const TOPIC_LABEL: Record<Topic, string> = {
  schools: "Schools",
  taxes: "Taxes",
  flooding: "Flooding",
  streets: "Streets",
  safety: "Safety",
  elections: "Elections",
  budget: "Budget",
  housing: "Housing",
  parks: "Parks",
}

export const TYPE_LABEL: Record<UpdateType, string> = {
  agenda: "Agenda posted",
  decision: "Decided",
  hearing: "Public hearing",
  election: "On the ballot",
  meeting: "Meeting",
  deadline: "Deadline",
}
