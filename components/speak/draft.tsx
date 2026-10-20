"use client"

import { useState } from "react"
import { ClipboardCopy, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { CoachResponse } from "@/lib/coach/types"
import { detectGuardrails, estimateSeconds, removeFlaggedQuotes } from "@/lib/coach/guardrails"
import { requestCoaching } from "@/lib/speak/client"
import type { SpeakLanguage, SpeakMessages } from "@/lib/speak/messages"
import { cn } from "@/lib/utils"

type Props = { itemId: string; zip: string; lang: SpeakLanguage; t: SpeakMessages; draft: string; minutes: number | null; setDraft: (draft: string) => void }

export function DraftStep({ itemId, zip, lang, t, draft, minutes, setDraft }: Props) {
  const [result, setResult] = useState<{ draft: string; value: CoachResponse } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [removal, setRemoval] = useState<{ before: string; after: string } | null>(null)
  const seconds = estimateSeconds(draft)
  const current = result?.draft === draft ? result.value : null
  const deterministic = detectGuardrails(draft, lang)
  const hits = current ? [...deterministic, ...current.guardrail_hits] : deterministic
  const uniqueHits = hits.filter((hit, index) => hits.findIndex((other) => other.quote === hit.quote && other.category === hit.category) === index)
  const over = minutes !== null && seconds > minutes * 60

  async function review() {
    if (!draft.trim()) return
    setBusy(true); setError(false)
    const submitted = draft
    try { setResult({ draft: submitted, value: await requestCoaching<CoachResponse>({ mode: "coach", item_id: itemId, zip, draft: submitted, lang }) }) }
    catch { setError(true) }
    finally { setBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(draft); toast.success(t.copied) }
    catch { toast.error(t.copyFailed) }
  }
  return <div className="space-y-5">
    <label className="block"><span className="text-lg font-bold">{t.draftLabel}</span><span className="mt-2 block max-w-2xl text-sm leading-relaxed text-muted-foreground">{t.draftHint}</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={12} placeholder={t.draftPlaceholder} className="mt-4 w-full resize-y rounded-2xl border border-input bg-surface p-5 text-base leading-relaxed" /></label>
    <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{draft.trim().split(/\s+/u).filter(Boolean).length} {t.words} · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} {t.spoken}</span><span>{draft.length}/2000 {t.characters}</span></div>
    {minutes !== null && <div role="meter" aria-label={t.spoken} aria-valuemin={0} aria-valuemax={minutes * 60} aria-valuenow={Math.min(seconds, minutes * 60)} className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", over ? "bg-brick" : "bg-denim")} style={{ width: `${Math.min(100, seconds / (minutes * 60) * 100)}%` }} /></div>}
    {over && <p className="text-sm text-brick">{t.over}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !draft.trim()} onClick={review}><ShieldCheck data-icon="inline-start" />{busy ? t.busy : t.getFeedback}</Button><Button variant="outline" disabled={!draft.trim()} onClick={copy}><ClipboardCopy data-icon="inline-start" />{t.copy}</Button></div>
    {error && <p role="alert" className="text-sm text-brick">{t.failed}</p>}
    {result && !current && <p className="text-xs text-muted-foreground">{t.changedDraft}</p>}
    <section className="rounded-2xl bg-surface p-5" aria-live="polite"><h3 className="font-bold">{t.safety}</h3>{uniqueHits.length ? <><ul className="mt-3 space-y-3">{uniqueHits.map((hit) => <li key={`${hit.category}:${hit.quote}`} className="text-sm"><q className="break-words font-semibold text-brick">{hit.quote}</q><p className="mt-1 text-muted-foreground">{hit.reason}</p></li>)}</ul><Button variant="outline" className="mt-4" onClick={() => { const after = removeFlaggedQuotes(draft, uniqueHits); setRemoval({ before: draft, after }); setDraft(after); setResult(null); toast.success(t.removed) }}>{t.remove}</Button></> : <p className="mt-2 text-sm text-muted-foreground">{t.nothingFlagged}</p>}{removal && removal.after === draft && <Button variant="outline" className="mt-3" onClick={() => { setDraft(removal.before); setRemoval(null) }}>{t.undo}</Button>}</section>
    {current && <section className="space-y-4 rounded-2xl bg-denim-soft p-5 text-denim-deep"><h3 className="text-xs font-bold">{current.provider === "gemini" ? t.feedbackAI : t.feedbackLocal}</h3><ul className="list-disc space-y-2 pl-4 text-sm">{current.feedback.map((feedback, index) => <li key={index}>{feedback.note}</li>)}</ul>{current.questions.length > 0 && <><p className="text-sm font-bold">{t.questions}</p><ul className="list-disc space-y-2 pl-4 text-sm">{current.questions.map((question) => <li key={question}>{question}</li>)}</ul></>}{current.cut_suggestions.length > 0 && <><p className="text-sm font-bold">{t.cuts}</p><ul className="space-y-2 text-sm">{current.cut_suggestions.map((cut, index) => <li key={index}><q>{cut.quote}</q> — {cut.reason}</li>)}</ul></>}</section>}
  </div>
}
