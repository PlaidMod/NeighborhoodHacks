"use client"

import { CalendarDays, ExternalLink, Megaphone, Share2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"
import { BodyIcon, Chip, TYPE_ICON, TierPill } from "@/components/civic"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { getBody } from "@/lib/data/bodies"
import type { Update } from "@/lib/data/types"
import { whyFor } from "@/lib/data/updates"
import { TOPIC_LABEL, TYPE_LABEL, daysFromNow, fmtDateTime, relDay } from "@/lib/format"
import { useProfile } from "@/lib/profile"

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
  const { profile, bodies } = useProfile()
  const body = bodies.find((b) => b.id === u.bodyId) ?? getBody(u.bodyId)!
  const Icon = TYPE_ICON[u.type]
  const past = new Date(u.date) < new Date()

  return (
    <article className="font-news">
      <header className="bg-white px-6 pt-8 pb-6 md:px-8">
        <div className="flex items-center gap-3">
          <BodyIcon kind={body.kind} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{body.name}</p>
            <p className="text-xs text-muted-foreground">{body.yourSeat ?? body.seats}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Chip tone="outline">
            <Icon className="size-3" /> {TYPE_LABEL[u.type]}
          </Chip>
          <TierPill tier={u.tier} />
          <Chip tone="sand">{TOPIC_LABEL[u.topic]}</Chip>
        </div>
        <SheetTitle className="mt-4 font-headline text-[2rem] leading-[1.1] font-black text-ink">
          {u.title}
        </SheetTitle>
        <SheetDescription className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          {u.summary}
        </SheetDescription>
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-denim" />
          {fmtDateTime(u.date)}
          {Math.abs(daysFromNow(u.date)) < 7 && <span className="text-muted-foreground">· {relDay(u.date)}</span>}
        </p>
      </header>

      <div className="space-y-4 p-4 md:p-6">
        <div className="rounded-3xl bg-denim p-5 text-white">
          <p className="text-xs font-bold tracking-wider text-white/60 uppercase">Why it matters to you</p>
          <p className="mt-2 font-headline text-xl leading-snug font-bold italic">{whyFor(u, profile.personas)}</p>
        </div>

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
            <p className="text-sm font-semibold">Result</p>
            <Chip tone="sage">{u.vote}</Chip>
          </div>
        )}

        {u.detail && (
          <div className="space-y-3 rounded-3xl bg-white p-5 text-[0.95rem] leading-relaxed">
            {u.detail.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {u.comment && !past && (
          <div className="rounded-3xl bg-ink p-5 font-sans text-white">
            <div className="flex items-start gap-3">
              <Megaphone className="mt-0.5 size-5 shrink-0 text-brick-soft" />
              <div>
                <p className="font-bold">You can speak on this</p>
                <p className="mt-1 text-sm text-white/70">
                  Sign-up closes {fmtDateTime(u.comment.deadline)}. {u.comment.minutes} minutes per speaker.
                </p>
              </div>
            </div>
            <Button asChild variant="brick" className="mt-4 w-full" onClick={close}>
              <Link href={`/app/speak?item=${u.id}`}>Draft my {u.comment.minutes}-minute comment</Link>
            </Button>
          </div>
        )}

        <div className="flex gap-2 font-sans">
          <Button asChild variant="outline" className="flex-1">
            <a href={u.source} target="_blank" rel="noreferrer">
              Official source <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(`${u.title}: ${u.summary}`)
              toast.success("Copied a summary to share")
            }}
          >
            <Share2 /> Share
          </Button>
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          Sample data for this prototype. Always check the official agenda before a meeting.
        </p>
      </div>
    </article>
  )
}
