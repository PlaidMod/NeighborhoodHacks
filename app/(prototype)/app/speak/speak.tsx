"use client"

import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { setLocale } from "@/app/actions/locale"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { BodyIcon } from "@/components/prototype/civic"
import { Button } from "@/components/ui/button"
import { UnderstandStep } from "@/components/speak/understand"
import { RegistrationStep } from "@/components/speak/registration"
import { DraftStep } from "@/components/speak/draft"
import { PracticeStep } from "@/components/speak/practice"
import { getRecipe } from "@/lib/registration/recipes"
import { getWindow } from "@/lib/registration/deadlines"
import { availableMethods, defaultChannel } from "@/lib/registration/channels"
import { selectSpeakItems } from "@/lib/speak/items"
import { changeChannel, selectedChannel } from '@/lib/speak/selection'
import { useNow, useProfile } from "@/lib/prototype/profile"
import { formatSpeakTime, speakMessages, type SpeakLanguage } from "@/lib/speak/messages"
import { clearProgress, EMPTY_PROGRESS, loadProgress, saveProgress, type SpeakProgress } from "@/lib/speak/progress"
import type { Body, Update } from "@/lib/prototype/types"
import { cn } from "@/lib/utils"

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export type SpeakEntry = { item: Update; body: Body; sample: boolean }

export function Speak({ entry = null }: { entry?: SpeakEntry | null }) {
  const { bodies: profileBodies, updates, profile, ready, source } = useProfile()
  const params = useSearchParams()
  const router = useRouter()
  const locale = useLocale()
  const lang: SpeakLanguage = params.get("lang") === "es" ? "es" : params.get("lang") === "en" ? "en" : locale === "es" ? "es" : "en"
  const t = speakMessages(lang)
  const bodies = entry && !profileBodies.some(body => body.id === entry.body.id) ? [...profileBodies, entry.body] : profileBodies
  const requestedId = params.get("item")
  const currentTime = useNow()
  const items = selectSpeakItems(entry ? [entry.item, ...updates.filter(item => item.id !== entry.item.id)] : updates, requestedId, currentTime)
  const item = requestedId ? items.find((candidate) => candidate.id === requestedId) : items[0]
  const body = bodies.find((candidate) => candidate.id === item?.bodyId)
  const sample = item?.id === entry?.item.id ? entry?.sample : source !== "db"
  return <div className="space-y-5 pt-5" lang={lang}>
    <header data-tour="speak-heading" className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[2.1rem] font-extrabold tracking-tight">{t.title}</h1><p className="mt-1 max-w-2xl text-base font-semibold text-ink">{t.subtitle}</p><p className="mt-3 max-w-2xl rounded-2xl bg-denim-soft px-4 py-3 text-sm leading-relaxed text-denim-deep"><b>{t.whatTitle}:</b> {t.whatBody}</p></div><label className="flex items-center gap-2 text-xs font-semibold">{t.language}<select value={lang} onChange={(event) => { const language = event.target.value as SpeakLanguage; void setLocale(language); router.replace(`/app/speak?item=${encodeURIComponent(item?.id ?? "")}&lang=${language}`, { scroll: false }) }} className="h-10 rounded-full border border-input bg-white px-3"><option value="en">English</option><option value="es">Español</option></select></label></header>
    {sample && <p className="rounded-2xl bg-sand px-4 py-3 text-xs leading-relaxed text-sand-deep">{t.sample}</p>}
    {!ready ? <p className="p-8 text-sm text-muted-foreground">{t.busy}</p> : !item || !body ? <div className="rounded-[24px] bg-white p-8"><h2 className="text-lg font-bold">{t.noItems}</h2><p className="mt-2 text-sm text-muted-foreground">{t.noItemsHelp}</p></div> : <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside data-tour="speak-items" className="rounded-[24px] bg-white p-3 xl:sticky xl:top-4"><h2 className="px-3 py-2 text-xs font-bold text-muted-foreground">{t.pick}</h2><ul className="max-h-80 space-y-1 overflow-y-auto overscroll-contain xl:max-h-[65vh]">{items.map((candidate) => {
        const candidateBody = bodies.find((value) => value.id === candidate.bodyId)
        if (!candidateBody) return null
        const active = candidate.id === item.id
        return <li key={candidate.id}><button onClick={() => router.replace(`/app/speak?item=${encodeURIComponent(candidate.id)}&lang=${lang}`, { scroll: false })} aria-pressed={active} className={cn("flex min-h-12 w-full items-start gap-3 rounded-2xl p-3 text-left", active ? "bg-denim-soft text-denim-deep" : "hover:bg-muted")}><BodyIcon id={candidateBody.id} kind={candidateBody.kind} className="size-8 rounded-xl" /><span><span className="line-clamp-2 text-sm font-semibold">{candidate.title}</span><span className="mt-1 block text-xs text-muted-foreground">{candidateBody.short}</span></span></button></li>
      })}</ul></aside>
      <SpeakFlow key={item.id} item={item} body={body} name={sample ? profile.name : ""} zip={profile.zip || "77004"} student={profile.personas.includes("student")} lang={lang} />
    </div>}
  </div>
}

function SpeakFlow({ item, body, name, zip, student, lang }: { item: Update; body: Body; name: string; zip: string; student: boolean; lang: SpeakLanguage }) {
  const t = speakMessages(lang)
  const recipe = getRecipe(body.id, item.meetingType, item.date)
  const [progress, setProgress] = useState(() => {
    const loaded = loadProgress(storage(), item.id)
    return { ...loaded, channel: loaded.channel ?? (recipe ? defaultChannel(recipe, student) : null) }
  })
  const [storageProblem, setStorageProblem] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const registrationWindow = recipe ? getWindow(recipe, item.date, new Date(now)) : { state: "unknown" as const }
  const steps = [t.understand, t.register, t.draft, t.practice]
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const interval = setInterval(tick, 1000)
    document.addEventListener("visibilitychange", tick)
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", tick) }
  }, [])
  function update(patch: Partial<SpeakProgress>) {
    const next = { ...progress, ...patch }
    setProgress(next)
    setStorageProblem(!saveProgress(storage(), item.id, next))
    setError(null)
  }
  function next() {
    if (progress.step === 0 && !progress.stance) return setError(t.selectPurpose)
    if (progress.step === 2 && !progress.draft.trim()) return setError(t.emptyDraft)
    if (progress.step === 1) {
      const methods = recipe ? availableMethods(recipe, registrationWindow.state, item.date, new Date(now)) : []
      const selected = selectedChannel(methods, progress.channel)
      if (methods.length && !selected) return setError(t.chooseChannel)
      if (!selected) return update({ ...changeChannel(progress, null), step: 2 })
    }
    update({ step: Math.min(progress.step + 1, 3) as SpeakProgress["step"] })
  }
  function reset() {
    const cleared = clearProgress(storage(), item.id)
    setProgress({ ...EMPTY_PROGRESS, checklist: [], channel: recipe ? defaultChannel(recipe, student) : null })
    setStorageProblem(!cleared)
    setError(null)
    toast.success(t.cleared)
  }
  return <section className="min-w-0 rounded-[28px] bg-white">
    <nav aria-label={t.title} className="scrollbar-none flex gap-2 overflow-x-auto border-b border-line p-3">{steps.map((step, index) => <button key={index} aria-current={progress.step === index ? "step" : undefined} disabled={index > progress.step} onClick={() => update({ step: index as SpeakProgress["step"] })} className={cn("flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold disabled:opacity-50", index === progress.step ? "bg-ink text-white" : "text-muted-foreground")}><span className={cn("grid size-5 place-items-center rounded-full border border-current/30 text-[10px]", index < progress.step && "bg-denim text-white")}>{index < progress.step ? <Check className="size-3" aria-hidden /> : index + 1}</span>{step}</button>)}</nav>
    <div className="p-5 md:p-8">
      <div key={`${progress.step}:${lang}`}>
        {progress.step === 0 && <UnderstandStep item={item} body={body} zip={zip} lang={lang} t={t} progress={progress} update={update} />}
        {progress.step === 1 && <RegistrationStep item={item} body={body} recipe={recipe} window={registrationWindow} now={now} student={student} name={name} lang={lang} t={t} progress={progress} update={update} />}
        {progress.step === 2 && <DraftStep itemId={item.id} zip={zip} lang={lang} t={t} draft={progress.draft} minutes={recipe?.minutes ?? null} setDraft={(draft) => update({ draft })} />}
        {progress.step === 3 && <PracticeStep item={item} recipe={recipe} progress={progress} update={update} lang={lang} t={t} />}
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-brick">{error}</p>}
      <div className="sticky bottom-0 z-20 -mx-5 mt-8 flex flex-wrap gap-3 border-t border-line bg-white/95 px-5 py-4 shadow-[0_-8px_24px_rgb(27_38_59/0.06)] backdrop-blur md:-mx-8 md:px-8">
        {progress.step > 0 && <Button variant="outline" onClick={() => update({ step: (progress.step - 1) as SpeakProgress["step"] })}><ArrowLeft data-icon="inline-start" />{t.back}</Button>}
        {progress.step < 3 && <Button onClick={next}>{progress.step === 1 ? t.nextDraft : progress.step === 2 ? t.nextPractice : t.continue}<ArrowRight data-icon="inline-end" /></Button>}
      </div>
      {progress.step === 1 && progress.registrationStatus !== "confirmed" && <p className="mt-3 text-xs text-muted-foreground">{t.registerFirst}</p>}
      <div className="mt-6 space-y-3 border-t border-line pt-5 text-xs leading-relaxed text-muted-foreground"><p>{t.central} {t.meeting}: {formatSpeakTime(item.date, lang)}</p><p>{t.privacy}</p><p>{t.saveNote}</p>{storageProblem && <p role="status" className="font-semibold text-brick">{t.storageUnavailable}</p>}<div className="flex flex-wrap items-center gap-4"><a href={item.source} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-denim underline underline-offset-4">{t.source}<ExternalLink className="size-3.5" aria-hidden /></a><button onClick={reset} className="min-h-10 font-semibold text-denim underline underline-offset-4">{t.clear}</button></div></div>
    </div>
  </section>
}
