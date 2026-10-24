"use client"

import { CalendarDays, ExternalLink, Megaphone, Share2, Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"
import { BodyIcon, Chip, TYPE_ICON, TierPill } from "@/components/prototype/civic"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { getBody } from "@/lib/prototype/bodies"
import type { Update } from "@/lib/prototype/types"
import { whyFor } from "@/lib/prototype/updates"
import { Coverage } from "@/components/weekly/Coverage"
import { daysFromNow, fmtDateTime, relDay } from "@/lib/prototype/format"
import { useProfile } from "@/lib/prototype/profile"
import { AI_LABEL } from "@/lib/stories/types"
import type { ExplainResponse } from "@/lib/coach/types"
import { requestCoaching } from "@/lib/speak/client"

const StoryContext = React.createContext<(u: Update) => void>(() => {})

export function useStory() {
  return React.useContext(StoryContext)
}

export function StoryProvider({ children }: { children: React.ReactNode }) {
  const [story, setStory] = React.useState<Update | null>(null)
  const [open, setOpen] = React.useState(false)
  const show = React.useCallback((u: Update) => {
    setStory(u)
    setOpen(true)
  }, [])

  return (
    <StoryContext.Provider value={show}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto overscroll-contain border-0 bg-surface p-0 sm:max-w-xl! sm:rounded-l-[28px]">
          {story && <Story u={story} close={() => setOpen(false)} />}
        </SheetContent>
      </Sheet>
    </StoryContext.Provider>
  )
}

function Story({ u, close }: { u: Update; close: () => void }) {
  const t = useTranslations("AppStory")
  const tl = useTranslations("AppLabels")
  const lang = useLocale() === "es" ? "es" : "en"
  const { profile, bodies, source } = useProfile()
  const body = bodies.find((b) => b.id === u.bodyId) ?? getBody(u.bodyId)!
  const Icon = TYPE_ICON[u.type]
  const past = new Date(u.date) < new Date()

  return (
    <article className="font-news">
      <header className="bg-white px-6 pt-8 pb-6 md:px-8">
        <div className="flex items-center gap-3">
          <BodyIcon kind={body.kind} id={body.id} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{body.name}</p>
            <p className="text-xs text-muted-foreground">{body.yourSeat ?? body.seats}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Chip tone="outline">
            <Icon aria-hidden className="size-3" /> {tl(`type.${u.type}`)}
          </Chip>
          <TierPill tier={u.tier} />
          <Chip tone="sand">{tl(`topic.${u.topic}`)}</Chip>
        </div>
        <SheetTitle className="mt-4 font-headline text-[2rem] leading-[1.1] font-black text-ink">
          {u.title}
        </SheetTitle>
        <SheetDescription className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          {u.summary}
        </SheetDescription>
        {u.officialTitle && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-denim">{t("officialText")}</summary>
            <p className="mt-2 leading-relaxed text-muted-foreground">{u.officialTitle}</p>
          </details>
        )}
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
          <CalendarDays aria-hidden className="size-4 text-denim" />
          {fmtDateTime(u.date)}
          {Math.abs(daysFromNow(u.date)) < 7 && <span className="text-muted-foreground">· {relDay(u.date)}</span>}
        </p>
      </header>

      <div className="space-y-4 p-4 md:p-6">
        {/* No written story yet: ask the AI coach for a plain-words explanation when the item is opened. */}
        {u.itemPath && !u.summary && <PlainWords id={u.id} lang={lang} />}

        {whyFor(u, profile.personas) && (
          <div className="rounded-3xl bg-denim p-5 text-white">
            <p className="text-xs font-bold tracking-wider text-white/60 uppercase">{t("why")}</p>
            <p className="mt-2 font-headline text-xl leading-snug font-bold italic">{whyFor(u, profile.personas)}</p>
          </div>
        )}

        {u.numbers && (
          <div className="grid grid-cols-3 gap-2">
            {u.numbers.map((n) => (
              <div key={n.label} className="rounded-2xl bg-white p-4">
                <p className="font-headline text-xl font-black tabular">{n.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.label}</p>
              </div>
            ))}
          </div>
        )}

        {u.vote && (
          <div className="flex items-center justify-between rounded-2xl bg-white p-4">
            <p className="text-sm font-semibold">{t("result")}</p>
            <Chip tone="sage">{u.vote}</Chip>
          </div>
        )}

        {u.outcomePending && (
          <div className="flex items-center justify-between rounded-2xl bg-white p-4">
            <p className="text-sm font-semibold">{t("result")}</p>
            <Chip tone="sand">{tl("outcomePending")}</Chip>
          </div>
        )}

        {u.detail && (
          <div className="space-y-3 rounded-3xl bg-white p-5 text-[0.95rem] leading-relaxed">
            {u.detail.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {u.coverage !== undefined && (
          <div className="rounded-3xl bg-white p-5">
            <Coverage coverage={u.coverage} />
          </div>
        )}

        {u.comment && !past && (
          <div className="rounded-3xl bg-ink p-5 font-sans text-white">
            <div className="flex items-start gap-3">
              <Megaphone className="mt-0.5 size-5 shrink-0 text-brick-soft" />
              <div>
                <p className="font-bold">{t("canSpeak")}</p>
                <p className="mt-1 text-sm text-white/70">
                  {u.comment.minutes !== null ? t("signupCloses", { when: fmtDateTime(u.comment.deadline), minutes: u.comment.minutes }) : t("signupClosesUnknown", { when: fmtDateTime(u.comment.deadline) })}
                </p>
              </div>
            </div>
            <Button asChild variant="brick" className="mt-4 w-full" onClick={close}>
              <Link href={`/app/speak?item=${u.id}`}>{u.comment.minutes !== null ? t("draft", { minutes: u.comment.minutes }) : t("draftUnknown")}</Link>
            </Button>
          </div>
        )}

        <div className="flex gap-2 font-sans">
          <Button asChild variant="outline" className="flex-1">
            <a href={u.source} target="_blank" rel="noreferrer">
              {t("source")} <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(`${u.title}: ${u.summary}`)
              toast.success(t("copied"))
            }}
          >
            <Share2 /> {t("share")}
          </Button>
        </div>
        {u.itemPath && (
          <Button asChild variant="ghost" className="w-full font-sans">
            <Link href={u.itemPath}>{t("fullStory")}</Link>
          </Button>
        )}
        <p className="px-1 text-xs text-muted-foreground">
          {u.aiWritten ? AI_LABEL[lang] : source === "db" ? t("footReal") : t("footSample")}
        </p>
      </div>
    </article>
  )
}

/**
 * "In plain words": the AI coach's explanation (P4's /api/coach, mode "explain") of an agenda item
 * that has no written story yet. Asked once per item and language, then kept for the browser
 * session, so reopening an item doesn't spend another call. Hidden if the coach can't explain it.
 */
function PlainWords({ id, lang }: { id: string; lang: "en" | "es" }) {
  const t = useTranslations("AppStory")
  const key = `showup.explain.${lang}.${id}`
  const [state, setState] = React.useState<{ status: "loading" | "done" | "error"; data?: ExplainResponse }>(() => {
    try {
      const cached = sessionStorage.getItem(key)
      if (cached) return { status: "done", data: JSON.parse(cached) as ExplainResponse }
    } catch {}
    return { status: "loading" }
  })
  React.useEffect(() => {
    if (state.status !== "loading") return
    let live = true
    requestCoaching<ExplainResponse>({ mode: "explain", item_id: id, lang })
      .then((data) => {
        if (!live) return
        try {
          sessionStorage.setItem(key, JSON.stringify(data))
        } catch {}
        setState({ status: "done", data })
      })
      .catch(() => live && setState({ status: "error" }))
    return () => {
      live = false
    }
  }, [id, key, lang, state.status])
  if (state.status === "error") return null
  return (
    <section aria-live="polite" className="rounded-3xl bg-white p-5 font-sans">
      <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-denim uppercase">
        <Sparkles aria-hidden className="size-3.5" strokeWidth={2.25} />
        {t("plainWords")}
      </p>
      {state.status === "loading" ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-denim-soft px-4 py-3 text-sm font-semibold text-denim-deep" role="status">
          {t("explaining")}
          <span aria-hidden className="flex items-end gap-1">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="size-1.5 rounded-full bg-denim motion-safe:animate-bounce motion-reduce:animate-pulse"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[0.98rem] leading-relaxed text-ink">{state.data!.plain_summary}</p>
          {state.data!.who_it_affects && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{state.data!.who_it_affects}</p>}
          <p className="mt-3 text-[11px] text-muted-foreground">{state.data!.provider === "gemini" ? t("aiExplained") : t("localExplained")}</p>
        </>
      )}
    </section>
  )
}
