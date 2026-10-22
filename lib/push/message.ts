import { clip, deadlineText, period, reminderSender, reminderSentence, type DeadlineInput, type ReminderRule } from '@/lib/sms/message'
import type { Lang } from '@/lib/sms/types'

// Browser notification wording. Same facts as the texts (plan §11), split into a title
// (the government) and a body (headline and deadline). The text-only parts, the link and
// "Reply STOP", are left out: tapping the notification opens the link, and notifications
// are turned off on the alerts page or in the browser.

/** Long bodies get cut off on lock screens; the deadline must always survive. */
export const MAX_PUSH_BODY = 240

/** The JSON the service worker (public/sw.js) shows. */
export type PushNotice = { title: string; body: string; url: string; tag: string; lang: Lang }

export function itemNotice(a: { body: string; headline: string; deadline: DeadlineInput; link: string; tag: string }, lang: Lang): PushNotice {
  const tail = ` ${period(deadlineText(a.deadline, lang).text)}`
  const headline = clip(a.headline.replace(/\.$/, ''), MAX_PUSH_BODY - tail.length - 1)
  // A shortened headline already ends in "…"; don't add a period after it.
  return { title: a.body, body: `${headline}${headline.endsWith('…') ? '' : '.'}${tail}`, url: a.link, tag: a.tag, lang }
}

export function reminderNotice(rule: ReminderRule, a: { body: string; title: string; at: string; link: string; tag: string }, lang: Lang): PushNotice {
  return { title: reminderSender(rule, a.body), body: clip(reminderSentence(rule, a, lang), MAX_PUSH_BODY), url: a.link, tag: a.tag, lang }
}

const CONFIRMATION: Record<Lang, string> = {
  en: "Notifications are on. We'll let you know when one of your governments is about to vote on something big. Usually 1–3 a month.",
  es: 'Activaste las notificaciones. Te avisaremos cuando uno de tus gobiernos esté por votar sobre algo importante. Normalmente de 1 a 3 al mes.',
}

/** Sent right after sign-up, so the reader sees what a notification looks like. */
export function confirmationNotice(lang: Lang, siteUrl: string): PushNotice {
  return { title: 'ShowUp HTX', body: CONFIRMATION[lang], url: `${siteUrl.replace(/\/$/, '')}/app/alerts`, tag: 'signup', lang }
}
