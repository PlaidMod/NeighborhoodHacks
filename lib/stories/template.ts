import { fmtDay, fmtMoney, fmtRate, fmtTime, fmtWeekdayDay } from "./format"
import { turnoutPercent } from "./factCheck"
import type { Lang, Story, StoryFacts } from "./types"

/**
 * The plain fallback story (plan §9). Used when the AI story fails the fact-check
 * twice, or when no model is available. Built only from the facts, so it always
 * passes the fact-check, and it carries no AI label.
 */

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
      ? `Sign-up to speak on this item closes ${fmtWeekdayDay(closes, lang)} at ${fmtTime(closes, lang)}. You can also send a written comment. Use the Speak up button for each step.`
      : `La inscripción para hablar sobre este punto cierra el ${fmtWeekdayDay(closes, lang)} a las ${fmtTime(closes, lang)}. También puedes enviar un comentario por escrito. Usa el botón Speak up para cada paso.`
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
  const when = `${fmtWeekdayDay(f.meeting_date, lang)}, ${fmtTime(f.meeting_date, lang)}`
  const title = cut(f.title.replace(/\.$/, ""), 160)
  const shortTitle = cut(f.title.replace(/\.$/, ""), 70)
  const cancelled = f.meeting_status === "cancelled"

  let headline: string
  let dek: string
  if (cancelled) {
    headline = lang === "en" ? `${body} meeting set for ${day} is cancelled` : `Se canceló la reunión de ${body} del ${day}`
    dek = lang === "en" ? `The agenda had included: ${shortTitle}.` : `La agenda incluía: ${shortTitle}.`
  } else if (f.status === "upcoming") {
    headline = lang === "en" ? `${body} to consider ${shortTitle} on ${day}` : `${body} considerará el ${day}: ${shortTitle}`
    dek =
      lang === "en"
        ? `The item is on the agenda for the ${f.meeting_type} meeting on ${when}.`
        : `El punto está en la agenda de la reunión ${f.meeting_type === "regular" ? "ordinaria" : "especial"} del ${when}.`
  } else if (f.status === "awaiting_result") {
    headline = lang === "en" ? `${body} met ${day}; outcome not posted yet` : `${body} se reunió el ${day}; aún no se publica el resultado`
    dek =
      lang === "en"
        ? `The official result for this item has not been posted yet. This brief will update when it is.`
        : `El resultado oficial de este punto aún no se ha publicado. Este resumen se actualizará cuando se publique.`
  } else {
    const v = f.outcome?.vote_result
    const en = v === "passed" ? "approved" : v === "failed" ? "did not approve" : "took no action on"
    const es = v === "passed" ? "aprobó" : v === "failed" ? "no aprobó" : "no tomó acción sobre"
    headline = lang === "en" ? `${body} ${en}: ${shortTitle}` : `${body} ${es}: ${shortTitle}`
    dek =
      lang === "en"
        ? `The vote happened at the ${f.meeting_type} meeting on ${day}${f.outcome?.action ? `. Recorded action: ${cut(f.outcome.action, 80)}` : ""}.`
        : `La votación fue en la reunión del ${day}${f.outcome?.action ? `. Acción registrada: ${cut(f.outcome.action, 80)}` : ""}.`
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
