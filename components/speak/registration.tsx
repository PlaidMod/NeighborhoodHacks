"use client"

import { useState } from "react"
import { ArrowUpRight, Check, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { availableMethods, buildEmail, defaultChannel } from "@/lib/registration/channels"
import { getMethodWindow } from "@/lib/registration/deadlines"
import type { RegistrationMethod, RegistrationRecipe, RegistrationWindow } from "@/lib/registration/types"
import { formatSpeakTime, type SpeakLanguage, type SpeakMessages } from "@/lib/speak/messages"
import type { SpeakProgress } from "@/lib/speak/progress"
import type { Body, Update } from "@/lib/prototype/types"
import { cn } from "@/lib/utils"
import { changeChannel, selectedChannel } from '@/lib/speak/selection'

type Props = { item: Update; body: Body; recipe: RegistrationRecipe | null; window: RegistrationWindow; now: number; student: boolean; name: string; lang: SpeakLanguage; t: SpeakMessages; progress: SpeakProgress; update: (patch: Partial<SpeakProgress>) => void }

export function RegistrationStep({ item, body, recipe, window: registrationWindow, now, student, name, lang, t, progress, update }: Props) {
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'saving' | 'saved' | 'subscribe' | 'failed'>('idle')
  async function saveReminder() {
    setReminderStatus('saving')
    try {
      const response = await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: item.id }), signal: AbortSignal.timeout(15000) })
      setReminderStatus(response.ok ? 'saved' : response.status === 401 ? 'subscribe' : 'failed')
    } catch { setReminderStatus('failed') }
  }
  if (!recipe) return <div className="space-y-4"><h2 className="text-xl font-bold">{t.unknownRecipe}</h2><p className="text-sm leading-relaxed text-muted-foreground">{t.unknownHelp}</p><Button asChild variant="outline"><a href={body.website} target="_blank" rel="noreferrer">{t.visitBody}<ArrowUpRight data-icon="inline-end" /></a></Button></div>
  const methods = availableMethods(recipe, registrationWindow.state, item.date, new Date(now))
  const wanted = progress.channel ?? defaultChannel(recipe, student)
  const selected = selectedChannel(methods, wanted)
  const selectedWindow = selected ? getMethodWindow(selected, item.date, new Date(now)) : null
  const selectedCutoff = selectedWindow?.closesAt ?? registrationWindow.closesAt
  const status = { not_started: t.notStarted, registered: t.statusRegistered, confirmed: t.statusConfirmed }[selected ? progress.registrationStatus : 'not_started']
  const stateLabel = { before_open: t.windowBefore, open: t.windowOpen, closed: t.windowClosed, unknown: t.windowUnknown }[registrationWindow.state]
  const stateHint = { before_open: t.beforeHelp, open: t.noAuto, closed: t.closedHelp, unknown: t.unknownWindowHelp }[registrationWindow.state]
  return <div className="space-y-5">
    <header><h2 className="text-xl font-bold">{t.register}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.noAuto}</p></header>
    <div className={cn("rounded-2xl p-5", registrationWindow.state === "closed" ? "bg-brick-soft text-brick-deep" : "bg-denim-soft text-denim-deep")}><h3 className="font-bold">{stateLabel}</h3>{registrationWindow.opensAt && <p className="mt-2 text-sm">{t.opens}: {formatSpeakTime(registrationWindow.opensAt, lang)}</p>}{registrationWindow.closesAt && <p className="mt-2 text-sm">{t.closes}: {formatSpeakTime(registrationWindow.closesAt, lang)}</p>}<p className="mt-3 text-sm leading-relaxed">{stateHint}</p></div>
    <p className="text-sm leading-relaxed text-muted-foreground">{recipe.notes[lang]}</p>
    {recipe.agendaOnly && <p className="rounded-2xl border border-border p-4 text-sm">{t.agendaOnly}</p>}
    <fieldset><legend className="text-sm font-bold">{t.chooseChannel}</legend><div className="mt-3 flex flex-wrap gap-2">{methods.map((method) => <button key={method.id} aria-pressed={method.id === selected?.id} onClick={() => update(changeChannel(progress, method.id))} className={cn("min-h-10 rounded-full border border-border px-4 text-sm font-semibold", method.id === selected?.id && "border-denim bg-denim-soft text-denim-deep")}>{method.id === selected?.id && <Check className="mr-1 inline size-3.5" aria-hidden />}{method.label[lang]}</button>)}</div></fieldset>
    {selected ? <section className="space-y-4 rounded-2xl bg-surface p-5"><p className="text-sm leading-relaxed">{selected.instructions[lang]}</p>
      {selectedWindow?.state === "before_open" && <p className="text-sm font-semibold text-denim">{t.windowBefore}{selectedWindow.opensAt ? ` · ${t.opens}: ${formatSpeakTime(selectedWindow.opensAt, lang)}` : ""}</p>}
      {selected.requiredFields?.length ? <div><p className="text-xs font-bold">{t.required}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">{selected.requiredFields.map((field) => <li key={field}>{fieldLabel(field, t)}</li>)}</ul></div> : null}
      {(selected.kind === "email" || selected.kind === "written") && selected.email ? <RegistrationEmail key={selected.id} method={selected} item={item} name={name} lang={lang} t={t} draft={progress.draft} setDraft={(draft) => update({ draft })} /> : selected.kind === "phone" && selected.phone ? <Button asChild><a href={`tel:${selected.phone.replace(/[^+\d]/g, "")}`}><Phone data-icon="inline-start" />{t.call}</a></Button> : selected.url ? <Button asChild><a href={selected.url} target="_blank" rel="noreferrer">{t.openChannel}<ArrowUpRight data-icon="inline-end" /></a></Button> : null}
      {selected.kind === "card_at_meeting" && selectedCutoff && <p className="text-sm font-semibold">{t.arriveBy}: {formatSpeakTime(new Date(Date.parse(selectedCutoff) - 15 * 60_000).toISOString(), lang)}</p>}
      {selected.kind === "phone" && <p className="text-sm text-muted-foreground">{t.required}: {t.name}, {item.title}, {formatSpeakTime(item.date, lang)}.</p>}
    </section> : <p className="rounded-2xl bg-surface p-5 text-sm text-muted-foreground">{methods.length ? t.chooseChannel : t.noMethods}</p>}
    <div className="space-y-3 border-t border-line pt-5"><p className="text-sm font-semibold" aria-live="polite">{status}</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={registrationWindow.state === "before_open" || selectedWindow?.state === "before_open" || !selected} onClick={() => update({ registrationStatus: "registered", channel: selected?.id ?? null })}>{t.registered}</Button><Button variant={progress.registrationStatus === "confirmed" ? "default" : "outline"} disabled={!selected || progress.registrationStatus === "not_started"} onClick={() => update({ registrationStatus: "confirmed" })}><Check data-icon="inline-start" />{t.confirmed}</Button></div>
      {progress.registrationStatus !== "confirmed" && <p className="text-sm leading-relaxed text-muted-foreground">{t.confirmationHint}</p>}
      {recipe.contact && <p className="text-sm leading-relaxed"><span className="font-bold">{t.contact}: </span>{recipe.contact[lang]}</p>}
    </div>
    {recipe.accommodations && <section className="rounded-2xl bg-surface p-5"><h3 className="text-sm font-bold">{t.accommodations}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{recipe.accommodations[lang]}</p></section>}
    <label className="flex min-h-10 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-denim" checked={progress.reminderRequested} onChange={(event) => update({ reminderRequested: event.target.checked })} /><span>{t.reminder}<span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t.reminderNote}</span></span></label>
    {progress.reminderRequested && /^[0-9a-f-]{36}$/i.test(item.id) && <div className="space-y-2"><Button variant="outline" disabled={reminderStatus === 'saving' || reminderStatus === 'saved'} onClick={saveReminder}>{reminderStatus === 'saved' ? t.reminderSaved : t.saveReminder}</Button>{reminderStatus === 'subscribe' && <a href="/app/alerts" className="block text-sm text-denim underline">{t.reminderSubscribe}</a>}{reminderStatus === 'failed' && <p role="alert" className="text-sm text-brick">{t.failed}</p>}<p className="text-xs text-muted-foreground">{t.reminderDelivery}</p></div>}
    <p className="text-xs text-muted-foreground">{t.verified}: {recipe.lastVerified} · <a href={recipe.policyUrl} target="_blank" rel="noreferrer" className="font-semibold text-denim underline underline-offset-4">{t.recipeSource}</a></p>
  </div>
}

function fieldLabel(field: string, t: SpeakMessages) {
  const labels: Record<string, string> = { name: t.name, subject: t.subject, item: t.fieldItem, email: t.fieldEmail, address: t.fieldAddress, mailingAddress: t.fieldMailingAddress, phone: t.fieldPhone }
  return labels[field] ?? field
}

function RegistrationEmail({ method, item, name, lang, t, draft, setDraft }: { method: RegistrationMethod; item: Update; name: string; lang: SpeakLanguage; t: SpeakMessages; draft: string; setDraft: (draft: string) => void }) {
  const [fields, setFields] = useState({ name, address: "", mailingAddress: "", phone: "", subject: "", body: "" })
  const [error, setError] = useState(false)
  const body = method.kind === "written" ? draft : fields.body
  const link = buildEmail(method, { ...fields, body, meeting: formatSpeakTime(item.date, lang), item: item.title }, lang)
  const requiredFields = (method.requiredFields ?? []).filter((field): field is keyof typeof fields => field in fields)
  const hasDetails = requiredFields.every((field) => fields[field].trim().length > 0) && fields.name.trim().length > 0 && fields.subject.trim().length > 0 && body.trim().length > 0
  const visibleFields: (keyof typeof fields)[] = ["name", ...(requiredFields.includes("address") ? ["address", "mailingAddress"] as const : []), ...(requiredFields.includes("phone") ? ["phone"] as const : []), "subject", "body"]
  return <div className="space-y-3">
    <p className="text-xs font-semibold">{method.email}</p>
    {visibleFields.map((field) => <label key={field} className="block"><span className="text-xs font-semibold">{field === "body" ? method.kind === "written" ? t.draftLabel : t.emailBody : fieldLabel(field, t)}</span>{field === "body" ? <textarea maxLength={2000} rows={3} value={body} onChange={(event) => { if (method.kind === "written") setDraft(event.target.value); else setFields({ ...fields, body: event.target.value }); setError(false) }} className="mt-1 w-full rounded-xl border border-input bg-white p-3 text-sm" /> : <input maxLength={200} value={fields[field]} onChange={(event) => { setFields({ ...fields, [field]: event.target.value }); setError(false) }} className="mt-1 h-11 w-full rounded-xl border border-input bg-white px-3 text-sm" />}</label>)}
    {method.wordLimitSubject && <p className="text-xs text-muted-foreground">{t.emailSubjectLimit} ({method.wordLimitSubject})</p>}
    {method.wordLimitSubject && fields.subject.trim().split(/\s+/u).length > method.wordLimitSubject && <Button size="sm" variant="outline" onClick={() => { setFields({ ...fields, subject: fields.subject.trim().split(/\s+/u).slice(0, method.wordLimitSubject).join(" ") }); setError(false) }}>{t.shortSubject} ({method.wordLimitSubject})</Button>}
    {link && hasDetails ? <Button asChild><a href={link}><Mail data-icon="inline-start" />{t.email}</a></Button> : <Button variant="outline" onClick={() => setError(true)}>{t.email}</Button>}
    {error && <p role="alert" className="text-xs text-brick">{t.missingEmail}</p>}<p className="text-xs leading-relaxed text-muted-foreground">{t.emailHint}</p>
  </div>
}
