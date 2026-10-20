import { DateTime } from "luxon"
import type { Lang } from "./types"

export const ZONE = "America/Chicago"

export function central(iso: string) {
  return DateTime.fromISO(iso, { setZone: true }).setZone(ZONE)
}

// AP style abbreviates Jan., Feb., Aug., Sept., Oct., Nov., Dec.; March–July are spelled out.
const AP_MONTH = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]
const ES_MONTH = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]
const EN_WEEKDAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const ES_WEEKDAY = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

/** "Oct. 28" / "28 de octubre" */
export function fmtDay(iso: string, lang: Lang) {
  const d = central(iso)
  return lang === "en" ? `${AP_MONTH[d.month - 1]} ${d.day}` : `${d.day} de ${ES_MONTH[d.month - 1]}`
}

/** "Wednesday, Oct. 28" / "miércoles 28 de octubre" */
export function fmtWeekdayDay(iso: string, lang: Lang) {
  const d = central(iso)
  return lang === "en"
    ? `${EN_WEEKDAY[d.weekday - 1]}, ${fmtDay(iso, lang)}`
    : `${ES_WEEKDAY[d.weekday - 1]} ${fmtDay(iso, lang)}`
}

/** AP style "5 p.m." / "11:30 a.m."; Spanish "5 p. m." */
export function fmtTime(iso: string, lang: Lang) {
  const d = central(iso)
  const h12 = d.hour % 12 === 0 ? 12 : d.hour % 12
  const mins = d.minute ? `:${String(d.minute).padStart(2, "0")}` : ""
  const pm = d.hour >= 12
  if (lang === "en") return `${h12}${mins} ${pm ? "p.m." : "a.m."}`
  return `${h12}${mins} ${pm ? "p. m." : "a. m."}`
}

/** "$38.5 million", "$322,895", "$0.3950 per $100" */
export function fmtMoney(value: number, lang: Lang) {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    const text = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, "")
    return lang === "en" ? `$${text} million` : `$${text} millones`
  }
  return `$${Math.round(value).toLocaleString("en-US")}`
}

export function fmtRate(value: number, lang: Lang) {
  return lang === "en" ? `$${value.toFixed(4)} per $100` : `$${value.toFixed(4)} por cada $100`
}

export const MONTHS = { en: AP_MONTH, es: ES_MONTH }
