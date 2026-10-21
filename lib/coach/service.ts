import type { CoachInput, CoachItem, CoachPayload, CoachResponse, ExplainPayload, ExplainResponse, ProviderCall } from "./types.ts"
import { detectGuardrails, estimateSeconds } from "./guardrails.ts"
import { validateCoachPayload, validateExplainPayload } from "./validate.ts"

function localExplanation(input: CoachInput, item: CoachItem): ExplainPayload {
  const es = input.lang === "es"
  const audience: Record<string, string> = es
    ? { student: "estudiantes", parent: "familias", renter: "inquilinos", homeowner: "propietarios", voter: "votantes" }
    : { student: "students", parent: "families", renter: "renters", homeowner: "homeowners", voter: "voters" }
  return {
    plain_summary: item.isSample === false
      ? (es ? `Resumen local de los datos de la agenda; verifica el aviso oficial. ${item.summary} Fuente: ${item.source}` : `Local summary of agenda data; check the official notice. ${item.summary} Source: ${item.source}`)
      : es
      ? `Explicación local con datos de muestra del prototipo, no un aviso oficial verificado. Organismo: ${item.bodyName}. Texto de muestra original en inglés: ${item.summary} Fuente enlazada para verificar: ${item.source}`
      : `Local explanation from prototype sample data, not a verified official notice. Body: ${item.bodyName}. ${item.summary} Linked source to check: ${item.source}`,
    who_it_affects: es
      ? `El prototipo identifica a ${item.audiences.map(a => audience[a] ?? "residentes").join(", ") || "residentes del área"}. Confirma el alcance en la fuente.`
      : `${item.why} The prototype identifies ${item.audiences.map(a => audience[a] ?? "residents").join(", ") || "area residents"}; confirm the scope in the source.`,
    questions_for_user: es
      ? ["¿Qué efecto tendría en tu vida?", "¿Qué dato necesitas verificar en la fuente antes de comentar?"]
      : ["How would this affect your life?", "What fact do you need to check in the source before commenting?"],
  }
}

function timingFeedback(input: CoachInput, item: CoachItem): CoachPayload['feedback'][number] {
  const seconds = estimateSeconds(input.draft ?? "")
  const minutes = Number.isFinite(item.minutes) && item.minutes > 0 ? item.minutes : 2
  const verified = item.minutesVerified === true
  const above = seconds > minutes * 60
  const note = input.lang === 'es'
    ? `${seconds} segundos estimados a 130 palabras por minuto. ${verified
      ? `Límite verificado de ${minutes} minutos; confirma el aviso actual de la reunión.`
      : `El objetivo de práctica de ${minutes} minutos es una suposición; confirma el límite real en el aviso de la reunión.`}${above ? (verified ? ' Supera ese límite.' : ' Supera ese objetivo de práctica.') : ''}`
    : `${seconds} estimated seconds at 130 words per minute. ${verified
      ? `Compared with the verified ${minutes}-minute limit; check the current meeting notice.`
      : `The ${minutes}-minute practice target is an assumption; confirm the actual limit in the meeting notice.`}${above ? (verified ? ' Above that limit.' : ' Above that practice target.') : ''}`
  return { area: 'timing', note }
}

function localCoaching(input: CoachInput, item: CoachItem): CoachPayload {
  const es = input.lang === "es"
  const draft = input.draft ?? ""
  const seconds = estimateSeconds(draft)
  return {
    questions: es
      ? ["¿Qué experiencia propia quieres que entienda el organismo?", "¿Qué acción concreta quieres solicitar con tus propias palabras?"]
      : ["What personal experience do you want the body to understand?", "What specific action do you want to request in your own words?"],
    feedback: [
      { area: "structure", note: es ? "Comprueba que tu comentario identifica el tema, explica tu experiencia y termina con tu solicitud." : "Check that your comment identifies the topic, explains your experience, and ends with your request." },
      { area: "clarity", note: es ? "Revisa si cada frase aporta una idea que quieres comunicar." : "Review whether each sentence contributes a point you want to make." },
      { area: "item_reference", note: item.isSample === false
        ? (es ? `Verifica tu referencia al punto «${item.title}» en el aviso oficial.` : `Check your reference to “${item.title}” in the official notice.`)
        : es ? `Verifica la referencia al tema de muestra «${item.title}» en la fuente; no se ha comprobado el orden del día actual.` : `Check your reference to the sample item “${item.title}” against the source; the current agenda has not been verified.` },
      timingFeedback(input, item),
    ],
    cut_suggestions: [],
    guardrail_hits: detectGuardrails(draft, input.lang),
    estimated_seconds: seconds,
  }
}

export async function runCoach(input: CoachInput, item: CoachItem, options: { provider?: ProviderCall; timeoutMs?: number } = {}): Promise<CoachResponse | ExplainResponse> {
  const fallback = input.mode === "explain" ? localExplanation(input, item) : localCoaching(input, item)
  if (!options.provider) return { provider: "local", ...fallback }
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("Coach timeout")) }, Math.min(15000, options.timeoutMs ?? 15000))
    })
    const payload = await Promise.race([options.provider(input, item, controller.signal), timeout])
    if (input.mode === "explain") {
      const valid = validateExplainPayload(payload)
      return valid ? { provider: "gemini", ...valid } : { provider: "local", ...fallback }
    }
    const valid = validateCoachPayload(payload, input.draft ?? "")
    if (!valid) return { provider: "local", ...fallback }
    const deterministic = detectGuardrails(input.draft ?? "", input.lang)
    return {
      provider: "gemini", ...valid,
      feedback: [...valid.feedback.filter(value => value.area !== 'timing'), timingFeedback(input, item)],
      guardrail_hits: [...deterministic, ...valid.guardrail_hits.filter(hit => !deterministic.some(existing => existing.quote === hit.quote && existing.category === hit.category))],
      estimated_seconds: estimateSeconds(input.draft ?? ""),
    }
  } catch {
    // Do not log provider errors: upstream error messages can include input text.
    return { provider: "local", ...fallback }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
