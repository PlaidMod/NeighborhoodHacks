import type { EmailFields, Language, RegistrationMethod, RegistrationRecipe, WindowState } from './types.ts'
import { getMethodWindow, resolveDeadline } from './deadlines.ts'

export function availableMethods(recipe: RegistrationRecipe, state: WindowState, meetingISO?: string, now?: Date): RegistrationMethod[] {
  let meetingHasStarted = false
  if (meetingISO !== undefined && now !== undefined) {
    try {
      const meeting = Date.parse(resolveDeadline({anchor:'meeting_start'},meetingISO))
      if (!Number.isFinite(now.getTime())) return []
      meetingHasStarted = now.getTime() >= meeting
    } catch { return [] }
  }
  return recipe.methods.filter(method => {
    if ((state === 'closed' || meetingHasStarted) && method.availableAfterClose !== true) return false
    if (meetingISO !== undefined && now !== undefined && getMethodWindow(method,meetingISO,now).state === 'closed') return false
    return true
  })
}
export function defaultChannel(recipe: RegistrationRecipe, isStudent: boolean): string | null {
  if (isStudent && recipe.studentWrittenDefault) {
    const written = recipe.methods.find(method => method.kind === 'written' || method.kind === 'email')
    if (written) return written.id
  }
  return recipe.methods[0]?.id ?? null
}
export function buildEmail(method: RegistrationMethod, fields: EmailFields, lang: Language): string | null {
  if (!['email','written'].includes(method.kind) || !method.email || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(method.email)) return null
  const subject = (fields.subject ?? (lang === 'es' ? 'Comentario público' : 'Public comment')).trim()
  if (/[\r\n\u0000]/.test(subject) || (method.wordLimitSubject && subject.split(/\s+/u).filter(Boolean).length > method.wordLimitSubject)) return null
  const labels = lang === 'es' ? {name:'Nombre',address:'Dirección',mailingAddress:'Dirección postal',phone:'Teléfono',meeting:'Reunión',item:'Punto'} : {name:'Name',address:'Street address',mailingAddress:'Mailing address',phone:'Phone',meeting:'Meeting',item:'Agenda item'}
  const details = Object.entries(labels).flatMap(([key,label]) => fields[key] ? [`${label}: ${fields[key]}`] : [])
  const body = [...details,'',fields.body ?? ''].join('\n')
  try {
    return `mailto:${method.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  } catch { return null }
}
