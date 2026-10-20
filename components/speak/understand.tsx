"use client"

import { useState } from "react"
import { ExternalLink, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BodyIcon } from "@/components/prototype/civic"
import type { Body, Update } from "@/lib/prototype/types"
import type { ExplainResponse } from "@/lib/coach/types"
import { requestCoaching } from "@/lib/speak/client"
import { formatSpeakTime, type SpeakLanguage, type SpeakMessages } from "@/lib/speak/messages"
import type { SpeakProgress } from "@/lib/speak/progress"
import { cn } from "@/lib/utils"
import { AI_LABEL } from "@/lib/stories/types"

type Props = { item: Update; body: Body; zip: string; lang: SpeakLanguage; t: SpeakMessages; progress: SpeakProgress; update: (patch: Partial<SpeakProgress>) => void }

export function UnderstandStep({ item, body, zip, lang, t, progress, update }: Props) {
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function explain() {
    setBusy(true); setError(false)
    try { setExplanation(await requestCoaching<ExplainResponse>({ mode: "explain", item_id: item.id, zip, lang })) }
    catch { setError(true) }
    finally { setBusy(false) }
  }
  return <div className="space-y-6">
    <div className="flex items-center gap-3"><BodyIcon id={body.id} kind={body.kind} /><div><p className="text-sm font-semibold">{body.name}</p><p className="text-xs text-muted-foreground">{formatSpeakTime(item.date, lang)}</p></div></div>
    <div><h2 className="max-w-3xl text-2xl leading-tight font-extrabold tracking-tight">{item.title}</h2>{lang === "es" && <p className="mt-2 text-xs text-muted-foreground">{t.original}</p>}<p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.summary}</p></div>
    {item.aiWritten && <p className="text-xs text-muted-foreground">{AI_LABEL[lang]}</p>}
    <Button variant="outline" disabled={busy} onClick={explain}><Lightbulb data-icon="inline-start" />{busy ? t.busy : t.explain}</Button>
    {error && <p role="alert" className="text-sm text-brick">{t.failed}</p>}
    {explanation && <section className="space-y-3 rounded-2xl bg-denim-soft p-5 text-denim-deep" aria-live="polite">
      <p className="text-xs font-bold">{explanation.provider === "gemini" ? t.gemini : t.local}</p>
      <p className="text-sm leading-relaxed">{explanation.plain_summary}</p><p className="text-sm leading-relaxed">{explanation.who_it_affects}</p>
      <ul className="list-disc space-y-1 pl-4 text-sm">{explanation.questions_for_user.map((question) => <li key={question}>{question}</li>)}</ul>
    </section>}
    <div className="rounded-2xl bg-surface p-4 text-sm leading-relaxed"><p>{t.fit}</p><a href={item.source} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 font-semibold text-denim underline underline-offset-4">{t.source}<ExternalLink className="size-3.5" aria-hidden /></a></div>
    <fieldset><legend className="text-sm font-bold">{t.stance}</legend><div className="mt-3 flex flex-wrap gap-2">{(["support", "oppose", "change", "delay", "question"] as const).map((stance) => <button key={stance} aria-pressed={progress.stance === stance} onClick={() => update({ stance })} className={cn("min-h-10 rounded-full border border-border px-4 text-sm font-semibold", progress.stance === stance && "border-denim bg-denim-soft text-denim-deep")}>{progress.stance === stance && <span aria-hidden>✓ </span>}{t[stance]}</button>)}</div></fieldset>
    <label className="block"><span className="text-sm font-bold">{t.experience}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t.experienceHint}</span><textarea maxLength={500} rows={3} value={progress.experience} onChange={(event) => update({ experience: event.target.value })} className="mt-3 w-full rounded-2xl border border-input bg-surface p-4 text-sm leading-relaxed" /></label>
    <label className="block"><span className="text-sm font-bold">{t.ask}</span><span className="mt-1 block text-xs text-muted-foreground">{t.askHint}</span><textarea maxLength={500} rows={2} value={progress.ask} onChange={(event) => update({ ask: event.target.value })} className="mt-3 w-full rounded-2xl border border-input bg-surface p-4 text-sm" /></label>
  </div>
}
