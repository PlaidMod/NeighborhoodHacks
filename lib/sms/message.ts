import { DateTime } from "luxon"
import type { AlertRule } from "@/lib/rules/ruleText"
import type { Lang } from "./types"

const ZONE = "America/Chicago"

/**
 * Text message wording (plan §11):
 *   [Body]: [headline]. [deadline]. Speak up: [short link] Reply STOP to opt out.
 *
 * Kept to 320 characters (two SMS segments). The headline is shortened first,
 * because the deadline, link and STOP line must always survive.
 */

export const MAX_SMS_CHARS = 320

const STOP: Record<Lang, string> = { en: "Reply STOP to opt out.", es: "Responde STOP para cancelar." }
const SPEAK: Record<Lang, string> = { en: "Speak up", es: "Participa" }

function when(iso: string, lang: Lang) {
  const d = DateTime.fromISO(iso, { setZone: true }).setZone(ZONE).setLocale(lang === "en" ? "en-US" : "es-US")
  return lang === "en" ? d.toFormat("ccc, LLL d, h:mm a") : d.toFormat("ccc d 'de' LLL, h:mm a")
}

export type DeadlineInput = {
  registration_closes_at?: string | null
  registration_opens_at?: string | null
  meeting_at: string
  /** When ingest first saw the item (P2's items.first_seen_at). */
  first_seen_at?: string | null
}

/**
 * The [deadline] part. Late-added items, whose sign-up window had already closed
 * when we first saw them, get the "may already be closed" wording (plan §11,
 * scraper spec §12.5b).
 */
export function deadlineText(d: DeadlineInput, lang: Lang): { text: string; late: boolean } {
  const closes = d.registration_closes_at
  const late = !!(closes && d.first_seen_at && new Date(d.first_seen_at) >= new Date(closes))
  if (late) {
    return {
      late,
      text:
        lang === "en"
          ? "Registration to speak may already be closed; check the official rules for ways to comment"
          : "Es posible que la inscripción para hablar ya esté cerrada; consulta las reglas oficiales para comentar",
    }
  }
  if (closes) {
    return { late, text: lang === "en" ? `Sign-up to speak closes ${when(closes, lang)}` : `La inscripción para hablar cierra el ${when(closes, lang)}` }
  }
  return { late, text: lang === "en" ? `Meeting ${when(d.meeting_at, lang)}` : `Reunión el ${when(d.meeting_at, lang)}` }
}

/** Ends a sentence once: Spanish times already end in "p.m.", so never add a second period. */
export const period = (s: string) => (s.endsWith(".") ? s : `${s}.`)

/** Shortens text to `max` characters at a word break, ending in "…". */
export function clip(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).replace(/\s+\S*$/, "")}…`
}

export function itemAlertText(
  a: { body: string; headline: string; deadline: DeadlineInput; link: string },
  lang: Lang,
) {
  const { text: dl } = deadlineText(a.deadline, lang)
  const tail = ` ${period(dl)} ${SPEAK[lang]}: ${a.link} ${STOP[lang]}`
  const head = `${a.body}: `
  const room = MAX_SMS_CHARS - head.length - tail.length - 1
  const headline = clip(a.headline.replace(/\.$/, ""), room)
  // A shortened headline already ends in "…"; don't add a period after it.
  return `${head}${headline}${headline.endsWith("…") ? "" : "."}${tail}`
}

export type ReminderRule = Extract<AlertRule, "registration_opens" | "registration_closes" | "protest_deadline">

/** Who a reminder is from: the item's government, or HCAD for the protest deadline. */
export const reminderSender = (rule: ReminderRule, body: string) => (rule === "protest_deadline" ? "HCAD" : body)

/** A reminder's sentence, without the sender, link or STOP line. Texts and browser notifications share it. */
export function reminderSentence(rule: ReminderRule, a: { title: string; at: string }, lang: Lang) {
  const t = clip(a.title.replace(/\.$/, ""), 120)
  const at = when(a.at, lang)
  const lines: Record<ReminderRule, Record<Lang, string>> = {
    registration_opens: {
      en: `Registration to speak on "${t}" opens today (${at}).`,
      es: `Hoy se abre la inscripción para hablar sobre "${t}" (${at}).`,
    },
    registration_closes: {
      en: period(`Registration to speak on "${t}" closes ${at}`),
      es: period(`La inscripción para hablar sobre "${t}" cierra el ${at}`),
    },
    protest_deadline: {
      en: period(`Your deadline to protest your home's appraised value is ${at}`),
      es: period(`Tu fecha límite para protestar el valor de tasación de tu casa es el ${at}`),
    },
  }
  return lines[rule][lang]
}

/** Reminder texts (7a, 7b) and the protest-deadline reminder. */
export function reminderText(rule: ReminderRule, a: { body: string; title: string; at: string; link: string }, lang: Lang) {
  const link = rule === "protest_deadline" ? a.link : `${SPEAK[lang]}: ${a.link}`
  return clip(`${reminderSender(rule, a.body)}: ${reminderSentence(rule, a, lang)} ${link} ${STOP[lang]}`, MAX_SMS_CHARS)
}

/** The reply to the opt-in confirmation and to HELP. */
export const OPT_IN_CONFIRMATION: Record<Lang, string> = {
  en: "ShowUp HTX: You're signed up for texts about big local votes (tax rates, bonds, school closures). Usually 1-3 a month. Msg & data rates may apply. Reply HELP for help, STOP to opt out.",
  es: "ShowUp HTX: Te inscribiste para recibir mensajes sobre votaciones locales importantes (impuestos, bonos, cierres de escuelas). Normalmente 1-3 al mes. Pueden aplicar tarifas de mensajes y datos. Responde HELP para ayuda, STOP para cancelar.",
}

export const HELP_REPLY: Record<Lang, string> = {
  en: "ShowUp HTX sends texts about big votes by your local governments. Why you got a text: tap its link. Reply STOP to opt out.",
  es: "ShowUp HTX envía mensajes sobre votaciones importantes de tus gobiernos locales. Para saber por qué recibiste un mensaje, abre su enlace. Responde STOP para cancelar.",
}
