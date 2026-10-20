import type { Persona, Topic, UpdateType } from "./types"

export const APP_NAME = "ShowUp"

const DAY = 86_400_000

function startOfDay(d: Date) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  return t
}

export function daysFromNow(iso: string) {
  return Math.round((+startOfDay(new Date(iso)) - +startOfDay(new Date())) / DAY)
}

export function relDay(iso: string) {
  const n = daysFromNow(iso)
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  if (n === -1) return "Yesterday"
  if (n > 1 && n < 7) return new Date(iso).toLocaleDateString("en-US", { weekday: "long" })
  if (n < 0 && n > -7) return `${-n} days ago`
  return fmtDate(iso)
}

/** relDay for mid-sentence use: "by tomorrow", "by Wednesday" */
export function relDayLower(iso: string) {
  const s = relDay(iso)
  return s === "Today" || s === "Tomorrow" || s === "Yesterday" ? s.toLowerCase() : s
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(iso).toLocaleDateString("en-US", opts)
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export function fmtDateTime(iso: string) {
  return `${fmtDate(iso, { weekday: "short", month: "short", day: "numeric" })} · ${fmtTime(iso)}`
}

export function monthDay(iso: string) {
  const d = new Date(iso)
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate(),
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
