import { fmtDay, fmtMoney, fmtRate, fmtTime, fmtWeekdayDay } from "./format"
import { turnoutPercent } from "./factCheck"
import type { Lang, Story, StoryFacts } from "./types"

/**
 * The plain fallback story (plan §9). Used when the AI story fails the fact-check
 * twice, or when no model is available. Built only from the facts, so it always
 * passes the fact-check, and it carries no AI label.
 */

/** Ends a sentence with one period, even when it already ends in "p.m." */
function sentence(text: string) {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function cut(text: string, max: number) {
  if (text.length <= max) return text
  const trimmed = text.slice(0, max).replace(/\s+\S*$/, "")
  return `${trimmed}…`
}

function amountLine(f: StoryFacts, lang: Lang) {
  const parts = f.amounts.map((a) => (a.kind === "rate" ? fmtRate(a.value, lang) : fmtMoney(a.value, lang)))
  if (!parts.length) return null
  return lang === "en" ? `The agenda item lists ${parts.join(", ")}.` : `El punto de la agenda menciona ${parts.join(", ")}.`
}

function weighInLine(f: StoryFacts, lang: Lang) {
  const closes = f.registration?.closes_at
  if (f.status !== "upcoming") return null
  if (closes) {
    return lang === "en"
      ? `${sentence(`Sign-up to speak on this item closes ${fmtWeekdayDay(closes, lang)} at ${fmtTime(closes, lang)}`)} You can also send a written comment. Use the Speak up button for each step.`
      : `${sentence(`La inscripción para hablar sobre este punto cierra el ${fmtWeekdayDay(closes, lang)} a las ${fmtTime(closes, lang)}`)} También puedes enviar un comentario por escrito. Usa el botón Participa para cada paso.`
  }
  return lang === "en"
    ? "Check the official agenda for how to comment, or use the Speak up button."
    : "Consulta la agenda oficial para saber cómo comentar, o usa el botón Speak up."
}

function turnoutLine(f: StoryFacts, lang: Lang) {
  const e = f.last_election
  if (!e) return null
  const pct = turnoutPercent(f)
  const day = fmtDay(e.date, lang)
  if (lang === "en") {
    return pct == null
      ? `In this body's last election, on ${day}, ${e.votes_cast.toLocaleString("en-US")} people voted.`
      : `In this body's last election, on ${day}, ${e.votes_cast.toLocaleString("en-US")} of ${e.registered_voters!.toLocaleString("en-US")} registered voters cast a ballot (${pct.toFixed(1)}%).`
  }
  return pct == null
    ? `En la última elección de este organismo, el ${day}, votaron ${e.votes_cast.toLocaleString("en-US")} personas.`
    : `En la última elección de este organismo, el ${day}, votaron ${e.votes_cast.toLocaleString("en-US")} de ${e.registered_voters!.toLocaleString("en-US")} votantes registrados (${pct.toFixed(1)}%).`
}

export function templateStory(f: StoryFacts, lang: Lang): Story {
  const body = f.body_short ?? f.body_name
  const day = fmtDay(f.meeting_date, lang)
  const when =
    lang === "en"
      ? `${fmtWeekdayDay(f.meeting_date, lang)}, at ${fmtTime(f.meeting_date, lang)}`
      : `${fmtWeekdayDay(f.meeting_date, lang)} a las ${fmtTime(f.meeting_date, lang)}`
  const title = cut(f.title.replace(/\.$/, ""), 160)
  const shortTitle = cut(f.title.replace(/\.$/, ""), 90)
  const cancelled = f.meeting_status === "cancelled"

  // Agenda titles start with a verb ("Approve the…"), so the headline leads with the
  // date or outcome and quotes the title as written instead of forcing it into a sentence.
  const type = lang === "en" ? f.meeting_type : f.meeting_type === "regular" ? "ordinaria" : "especial"
  let headline: string
  let dek: string
  if (cancelled) {
    headline = lang === "en" ? `Meeting cancelled ${day}: ${shortTitle}` : `Reunión cancelada el ${day}: ${shortTitle}`
    dek = lang === "en" ? `${body} cancelled its meeting set for ${day}.` : `${body} canceló su reunión del ${day}.`
  } else if (f.status === "upcoming") {
    headline = lang === "en" ? `Vote ${day}: ${shortTitle}` : `Votación el ${day}: ${shortTitle}`
    dek = sentence(
      lang === "en" ? `${body} takes this up at its ${type} meeting ${when}` : `${body} lo tratará en su reunión ${type} del ${when}`,
    )
  } else if (f.status === "awaiting_result") {
    headline = lang === "en" ? `Outcome not posted yet: ${shortTitle}` : `Aún no se publica el resultado: ${shortTitle}`
    dek =
      lang === "en"
        ? `${body} met ${day}. The official result hasn't been posted yet, and this brief will update when it is.`
        : `${body} se reunió el ${day}. El resultado oficial aún no se ha publicado; este resumen se actualizará cuando se publique.`
  } else {
    const v = f.outcome?.vote_result
    const en = v === "passed" ? "Passed" : v === "failed" ? "Did not pass" : "No action"
    const es = v === "passed" ? "Aprobado" : v === "failed" ? "No aprobado" : "Sin acción"
    headline = lang === "en" ? `${en} ${day}: ${shortTitle}` : `${es} el ${day}: ${shortTitle}`
    const action = f.outcome?.action ? cut(f.outcome.action, 80) : null
    dek = sentence(
      lang === "en"
        ? `${body} voted at its ${type} meeting ${day}${action ? `. Recorded action: ${action}` : ""}`
        : `${body} votó en su reunión ${type} del ${day}${action ? `. Acción registrada: ${action}` : ""}`,
    )
  }

  const paragraphs = [
    lang === "en"
      ? `The official agenda for the ${f.body_name} meeting on ${day} lists this item${f.agenda_number ? ` as item ${f.agenda_number}` : ""}: "${title}."`
      : `La agenda oficial de la reunión de ${f.body_name} del ${day} incluye este punto${f.agenda_number ? ` como el punto ${f.agenda_number}` : ""}: "${title}".`,
    amountLine(f, lang),
    turnoutLine(f, lang),
    weighInLine(f, lang),
  ].filter((p): p is string => !!p)

  while (paragraphs.length < 2) {
    paragraphs.push(
      lang === "en"
        ? "Read the full item and any attachments at the official source link."
        : "Lee el punto completo y sus anexos en el enlace de la fuente oficial.",
    )
  }

  return {
    headline: cut(headline, 120),
    dek: cut(dek, 240),
    body_paragraphs: paragraphs.slice(0, 4),
    renter_line:
      lang === "en"
        ? "Renters can weigh in too. You don't need to own a home to speak at a public meeting."
        : "Los inquilinos también pueden opinar. No necesitas ser dueño de una casa para hablar en una reunión pública.",
  }
}
