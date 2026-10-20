"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, Pause, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RegistrationRecipe } from "@/lib/registration/types"
import { remainingSeconds } from "@/lib/speak/timer"
import { speakingTarget } from "@/lib/speak/items"
import { formatSpeakTime, type SpeakLanguage, type SpeakMessages } from "@/lib/speak/messages"
import type { SpeakProgress } from "@/lib/speak/progress"
import type { Update } from "@/lib/prototype/types"

export function PracticeStep({ item, recipe, progress, update, lang, t }: { item: Update; recipe: RegistrationRecipe | null; progress: SpeakProgress; update: (patch: Partial<SpeakProgress>) => void; lang: SpeakLanguage; t: SpeakMessages }) {
  const target = speakingTarget(recipe)
  const limit = target.minutes * 60
  const [elapsed, setElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [clock, setClock] = useState(0)
  const left = remainingSeconds(limit, elapsed, startedAt, clock)
  const running = startedAt !== null && left > 0
  const method = recipe?.methods.find((candidate) => candidate.id === progress.channel)
  const written = method?.kind === "written" || method?.kind === "email"
  useEffect(() => {
    if (!running) return
    const tick = () => setClock(Date.now())
    const interval = setInterval(tick, 250)
    document.addEventListener("visibilitychange", tick)
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", tick) }
  }, [running])
  function toggleTimer() {
    const now = Date.now()
    if (running && startedAt !== null) { setElapsed(Math.min(limit * 1000, elapsed + Math.max(0, now - startedAt))); setStartedAt(null) }
    else { if (left === 0) setElapsed(0); setClock(now); setStartedAt(now) }
  }
  const checks = [
    { id: "registration", text: t.checkRegistration }, { id: "location", text: t.checkLocation },
    { id: "materials", text: t.checkMaterials }, { id: "access", text: t.checkAccess },
  ]
  return <div className="space-y-6">
    {!written && <section className="rounded-[24px] bg-ink p-6 text-white"><h2 className="text-sm font-bold">{t.timer}</h2><p className="mt-5 text-6xl font-bold tracking-tight tabular" role="timer" aria-label={t.timer}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</p><div className="mt-5 flex gap-3"><Button variant="white" onClick={toggleTimer}>{running ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}{running ? t.pause : t.start}</Button><Button variant="white" onClick={() => { setElapsed(0); setStartedAt(null); setClock(0) }}><RotateCcw data-icon="inline-start" />{t.resetTimer}</Button></div>{left === 0 && <p role="status" className="mt-4 text-sm text-white">{t.timeUp}</p>}{!recipe?.minutes && <p className="mt-4 text-xs leading-relaxed text-white/80">{t.minutesUnknown}</p>}</section>}
    <div className="max-h-80 overflow-y-auto overscroll-contain rounded-2xl bg-surface p-5 text-base leading-relaxed whitespace-pre-wrap">{progress.draft}</div>
    <section className="rounded-2xl border border-border p-5"><h2 className="font-bold">{t.checklist}</h2>{checks.map((check) => <label key={check.id} className="mt-4 flex min-h-10 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-denim" checked={progress.checklist.includes(check.id)} onChange={(event) => update({ checklist: event.target.checked ? [...progress.checklist.filter((id) => id !== check.id), check.id] : progress.checklist.filter((id) => id !== check.id) })} /><span>{check.text}</span></label>)}</section>
    <section className="space-y-3 rounded-2xl bg-denim-soft p-5 text-denim-deep"><p className="text-sm font-bold">{t.meeting}: {formatSpeakTime(item.date, lang)}</p>{recipe && <p className="text-sm leading-relaxed">{t.arrival}: {recipe.meetingLocationText?.[lang] ?? recipe.meetingLocation}</p>}{method?.kind === "remote" && <p className="text-sm">{t.remoteHelp}</p>}{progress.registrationStatus !== "confirmed" && <p className="text-sm font-semibold">{t.registrationPending}</p>}<Button asChild variant="outline"><a href={recipe?.policyUrl ?? item.source} target="_blank" rel="noreferrer">{t.recipeSource}<ArrowUpRight data-icon="inline-end" /></a></Button></section>
  </div>
}
