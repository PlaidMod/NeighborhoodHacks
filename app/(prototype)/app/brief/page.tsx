"use client"

import { ArrowRight, ChevronRight, Clock, Mic } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { Chip, KIND_STYLE } from "@/components/prototype/civic"
import { useStory } from "@/components/prototype/story-sheet"
import { Button } from "@/components/ui/button"
import type { Update } from "@/lib/prototype/types"
import { relevance, whyFor } from "@/lib/prototype/updates"
import { PERSONAS, daysFromNow, fmtDate, fmtTime, monthDay } from "@/lib/prototype/format"
import { useMarkDone, useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

/** Tile styles for the bento grid, from the sports-page reference. */
const TILES = [
  { cls: "sm:col-span-2 xl:row-span-1 bg-denim text-white", btn: "text-denim", big: true },
  { cls: "xl:row-span-2 bg-ink text-white", btn: "text-ink" },
  { cls: "xl:row-span-2 bg-brick text-white", btn: "text-brick" },
  { cls: "bg-sand text-ink", btn: "text-sand-deep", light: true },
  { cls: "bg-denim-soft text-ink", btn: "text-denim", light: true },
]

function score(u: Update, personas: Parameters<typeof relevance>[1]) {
  const tier = u.tier === "urgent" ? 30 : u.tier === "digest" ? 15 : 0
  return tier + relevance(u, personas) * 10 - Math.abs(daysFromNow(u.date))
}

export default function Brief() {
  const { updates, bodies, profile, jurisdiction } = useProfile()
  const openStory = useStory()
  const markDone = useMarkDone()
  React.useEffect(() => {
    const t = setTimeout(() => markDone("brief"), 2500)
    return () => clearTimeout(t)
  }, [markDone])

  const inRange = updates.filter((u) => {
    const d = daysFromNow(u.date)
    return d >= -8 && d <= 12
  })
  const top = [...inRange]
    .filter((u) => u.tier !== "timeline")
    .sort((a, b) => score(b, profile.personas) - score(a, profile.personas))
    .slice(0, 5)
  const decided = updates
    .filter((u) => u.type === "decision" && daysFromNow(u.date) >= -8 && daysFromNow(u.date) <= 0)
    .filter((u) => !top.includes(u))
  const calendar = updates
    .filter((u) => daysFromNow(u.date) >= 0 && daysFromNow(u.date) <= 10 && u.type !== "decision")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const commentable = calendar.filter((u) => u.comment)

  const start = new Date()
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const who = profile.personas.map((p) => PERSONAS.find((x) => x.id === p)?.label.toLowerCase()).join(" and ")
  // The MUD facts below are demo numbers: only the demo utility district carries them.
  const mud = bodies.find((b) => b.kind === "mud" && b.lastTurnout)

  return (
    <div className="mx-auto max-w-[1120px] pt-4 font-news">
      {/* Masthead */}
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
          <Chip tone="brick">Weekly brief</Chip>
          <span>
            {fmtDate(start.toISOString())} – {fmtDate(end.toISOString())}
          </span>
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> 4 min read
          </span>
        </div>
        <h1 className="mt-4 font-headline text-[2.6rem] leading-[1.02] font-black md:text-[3.6rem]">
          Your week in {jurisdiction.area}
        </h1>
        <p className="mt-3 max-w-2xl text-[1.02rem] text-muted-foreground">
          {bodies.length} governments, {decided.length + top.filter((u) => u.type === "decision").length}{" "}
          decisions, and {commentable.length} chances to speak up. Written for a {who || "resident"}.
        </p>
      </header>

      {/* Bento */}
      <section className="mt-8 grid auto-rows-[minmax(220px,auto)] gap-4 sm:grid-cols-2 xl:auto-rows-[240px] xl:grid-cols-4">
        {top.map((u, i) => {
          const t = TILES[i]
          const b = bodies.find((x) => x.id === u.bodyId)!
          const Icon = KIND_STYLE[b.kind].icon
          return (
            <button
              key={u.id}
              aria-label={u.title}
              onClick={() => openStory(u)}
              className={cn(
                "group relative flex flex-col justify-between gap-6 overflow-hidden rounded-[28px] p-6 text-left transition-transform motion-safe:hover:-translate-y-0.5",
                t.cls,
              )}
            >
              <Icon
                className={cn(
                  "absolute -right-8 -bottom-8 size-44 transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6",
                  t.light ? "text-ink/[0.06]" : "text-white/[0.08]",
                )}
                strokeWidth={1.1}
              />
              <div className="relative">
                <p className={cn("text-xs font-bold", t.light ? "text-muted-foreground" : "text-white/70")}>
                  {b.short}
                  {u.tier === "urgent" && (
                    <span className={cn("ml-2", t.light ? "text-brick" : "text-white")}>● Urgent</span>
                  )}
                </p>
                <p
                  className={cn(
                    "mt-2 font-headline leading-[1.1] font-bold",
                    t.big ? "max-w-[24ch] text-[1.5rem] xl:text-[1.75rem]" : "text-[1.3rem]",
                  )}
                >
                  {u.title}
                </p>
              </div>
              <span
                className={cn(
                  "relative inline-flex h-8 w-fit items-center gap-1 rounded-full bg-white px-3.5 text-xs font-bold shadow-sm",
                  t.btn,
                )}
              >
                {u.comment && daysFromNow(u.date) >= 0 ? "Read and respond" : "Read more"}
                <ChevronRight className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5" />
              </span>
            </button>
          )
        })}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Decided */}
        <section>
          <h2 className="flex items-center gap-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            Also decided this week <span className="h-px flex-1 bg-border" />
          </h2>
          <div className="mt-2 divide-y divide-border">
            {decided.map((u) => {
              const b = bodies.find((x) => x.id === u.bodyId)!
              return (
                <article key={u.id} className="group grid gap-2 py-6 sm:grid-cols-[140px_1fr]">
                  <div>
                    <p className="text-xs font-bold text-denim">{b.short}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(u.date, { weekday: "long" })}</p>
                  </div>
                  <div>
                    <button onClick={() => openStory(u)} className="text-left">
                      <h3 className="font-headline text-[1.4rem] leading-snug font-bold group-hover:text-denim">
                        {u.title}
                      </h3>
                    </button>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{u.summary}</p>
                    <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm">
                      <b>For you:</b> {whyFor(u, profile.personas)}
                    </p>
                    {u.vote && <Chip tone="sage" className="mt-3">{u.vote}</Chip>}
                  </div>
                </article>
              )
            })}
          </div>

          {mud && (
            <div className="mt-6 rounded-[28px] bg-white p-6 md:p-8">
              <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">By the numbers</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="font-headline text-4xl font-black text-brick">{mud.lastTurnout?.votes}</p>
                  <p className="mt-1 text-sm text-muted-foreground">votes in the last {mud.short} election</p>
                </div>
                <div>
                  <p className="font-headline text-4xl font-black">$38.5M</p>
                  <p className="mt-1 text-sm text-muted-foreground">in {mud.short} bonds on your ballot</p>
                </div>
                <div>
                  <p className="font-headline text-4xl font-black">14 mi</p>
                  <p className="mt-1 text-sm text-muted-foreground">from the district to where its board meets</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Calendar rail */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-[28px] bg-white p-6">
            <h2 className="font-headline text-xl font-bold">On the calendar</h2>
            <ul className="mt-4 space-y-4">
              {calendar.slice(0, 7).map((u) => {
                const { month, day } = monthDay(u.date)
                const b = bodies.find((x) => x.id === u.bodyId)!
                return (
                  <li key={u.id}>
                    <button onClick={() => openStory(u)} className="group flex w-full gap-3 text-left">
                      <span className="w-10 shrink-0 text-center leading-none">
                        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground">{month}</span>
                        <span className="block text-xl font-extrabold">{day}</span>
                      </span>
                      <span className="min-w-0 border-l border-border pl-3">
                        <span className="line-clamp-2 text-sm font-bold group-hover:text-denim">{u.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {b.short} · {fmtTime(u.date)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {commentable[0] && (
            <div className="rounded-[28px] bg-brick p-6 font-sans text-white">
              <Mic className="size-6 text-white/80" />
              <p className="mt-4 text-xs font-bold tracking-[0.14em] text-white/60 uppercase">One thing you can do</p>
              <p className="mt-2 text-xl leading-snug font-extrabold tracking-tight">
                Speak for 2 minutes on “{commentable[0].title}”
              </p>
              <Button asChild variant="white" className="mt-5 w-full">
                <Link href={`/app/speak?item=${commentable[0].id}`}>
                  Draft my comment <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
