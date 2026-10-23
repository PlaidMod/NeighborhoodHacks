"use client"

import { ArrowRight, ChevronRight, Clock, Mic } from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { Chip, LogoTile } from "@/components/prototype/civic"
import { useStory } from "@/components/prototype/story-sheet"
import { Button } from "@/components/ui/button"
import { Coverage } from "@/components/weekly/Coverage"
import { bodyPhoto } from "@/lib/bodyPhotos"
import type { Update } from "@/lib/prototype/types"
import { relevance, whyFor } from "@/lib/prototype/updates"
import { daysFromNow, fmtDate, fmtDateTime, fmtTime, monthDay } from "@/lib/prototype/format"
import { useMarkDone, useNow, useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

/**
 * Tile styles for the bento grid, from the sports-page reference. Each tile shows its government's
 * photo (lib/bodyPhotos.ts) under a veil of the tile's color: solid behind the text at the top,
 * thinner at the bottom so the photo shows. The veils keep the text at 4.5:1 or better.
 */
const TILES = [
  { cls: "sm:col-span-2 xl:row-span-1 bg-denim text-white", btn: "text-denim", veil: "from-denim/95 via-denim/85 to-denim/40", big: true },
  { cls: "xl:row-span-2 bg-ink text-white", btn: "text-ink", veil: "from-ink/95 via-ink/85 to-ink/35" },
  { cls: "xl:row-span-2 bg-brick text-white", btn: "text-brick", veil: "from-brick/95 via-brick/88 to-brick/40" },
  { cls: "bg-sand text-ink", btn: "text-sand-deep", veil: "from-sand via-sand/95 to-sand/60", light: true },
  { cls: "bg-denim-soft text-ink", btn: "text-denim", veil: "from-denim-soft via-denim-soft/95 to-denim-soft/60", light: true },
]

/** Demo ordering only. Real data uses P3's buildWeekly order (plan §10), passed in as `weekly`. */
function score(u: Update, personas: Parameters<typeof relevance>[1]) {
  const tier = u.tier === "urgent" ? 30 : u.tier === "digest" ? 15 : 0
  return tier + relevance(u, personas) * 10 - Math.abs(daysFromNow(u.date))
}

export default function Brief() {
  const t = useTranslations("AppBrief")
  const tl = useTranslations("AppLabels")
  const { updates, bodies, profile, jurisdiction, weekly } = useProfile()
  const openStory = useStory()
  const markDone = useMarkDone()
  const now = useNow()
  React.useEffect(() => {
    const timer = setTimeout(() => markDone("brief"), 2500)
    return () => clearTimeout(timer)
  }, [markDone])

  const byId = new Map(updates.map((u) => [u.id, u]))
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((u): u is Update => !!u)

  let top: Update[]
  let decided: Update[]
  let calendar: Update[]
  if (weekly) {
    // Lead story first, then "Coming up: you can still act" (plan §10).
    const comingUp = pick([...(weekly.leadId ? [weekly.leadId] : []), ...weekly.comingUpIds])
    top = comingUp.slice(0, 5)
    decided = pick(weekly.decidedIds)
    calendar = [...comingUp].sort((a, b) => +new Date(a.date) - +new Date(b.date))
  } else {
    const inRange = updates.filter((u) => {
      const d = daysFromNow(u.date)
      return d >= -8 && d <= 12
    })
    top = [...inRange]
      .filter((u) => u.tier !== "timeline")
      .sort((a, b) => score(b, profile.personas) - score(a, profile.personas))
      .slice(0, 5)
    decided = updates
      .filter((u) => u.type === "decision" && daysFromNow(u.date) >= -8 && daysFromNow(u.date) <= 0)
      .filter((u) => !top.includes(u))
    calendar = updates
      .filter((u) => daysFromNow(u.date) >= 0 && daysFromNow(u.date) <= 10 && u.type !== "decision")
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
  }
  const commentable = calendar.filter((u) => u.comment && +new Date(u.comment.deadline) > now)

  const start = new Date()
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const who = profile.personas.map((p) => tl(`persona.${p}`)).join(` ${t("and")} `)
  const minutes = Math.max(2, Math.round((top.length + decided.length) * 0.8))
  // The MUD facts below are demo numbers: only the demo utility district carries them.
  const mud = bodies.find((b) => b.kind === "mud" && b.lastTurnout)

  return (
    <div className="mx-auto max-w-[1120px] pt-4 font-news">
      {/* Masthead */}
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
          <Chip tone="brick">{t("chip")}</Chip>
          <span>
            {fmtDate(start.toISOString())} – {fmtDate(end.toISOString())}
          </span>
          <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3.5" /> {t("minRead", { count: minutes })}
          </span>
        </div>
        <h1 className="mt-4 font-headline text-[2.6rem] leading-[1.02] font-black md:text-[3.6rem]">
          {t("title", { area: jurisdiction.area })}
        </h1>
        <p className="mt-3 max-w-2xl text-[1.02rem] text-muted-foreground">
          {weekly
            ? weekly.intro
            : t("lede", {
                bodies: bodies.length,
                decisions: decided.length + top.filter((u) => u.type === "decision").length,
                chances: commentable.length,
                who: who || t("resident"),
              })}
        </p>
      </header>

      {top.length === 0 && (
        <div className="mt-8 rounded-[28px] bg-white p-8 font-sans">
          <p className="text-lg font-bold">{t("empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/app/timeline">{t("openTimeline")}</Link>
          </Button>
        </div>
      )}

      {/* Bento */}
      <section className="mt-8 grid auto-rows-[minmax(220px,auto)] gap-4 sm:grid-cols-2 xl:auto-rows-[240px] xl:grid-cols-4">
        {top.map((u, i) => {
          const tile = TILES[i]!
          const b = bodies.find((x) => x.id === u.bodyId)!
          const photo = bodyPhoto(b.id, b.kind)
          return (
            <button
              key={u.id}
              aria-label={u.title}
              onClick={() => openStory(u)}
              className={cn(
                "group relative flex flex-col justify-between gap-6 overflow-hidden rounded-[28px] p-6 text-left transition-transform motion-safe:hover:-translate-y-0.5",
                tile.cls,
              )}
            >
              <Image
                src={photo.src}
                alt=""
                fill
                sizes="(min-width: 1280px) 560px, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-[scale] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transition-none"
              />
              <span aria-hidden className={cn("absolute inset-0 bg-linear-to-b", tile.veil)} />
              <span className={cn("absolute right-4 bottom-3 font-sans text-[10px]", tile.light ? "text-ink/70" : "text-white/80")}>
                {photo.credit}
              </span>
              <div className="relative">
                <p className={cn("flex items-center gap-2 text-xs font-bold", tile.light ? "text-muted-foreground" : "text-white/70")}>
                  <LogoTile id={b.id} className="size-7 rounded-lg ring-0" />
                  {b.short}
                  {u.tier === "urgent" && (
                    <span className={cn("whitespace-nowrap", tile.light ? "text-brick" : "text-white")}>● {tl("urgent")}</span>
                  )}
                </p>
                <p
                  className={cn(
                    "mt-2 font-headline leading-[1.1] font-bold",
                    // Real headlines run long: clamp so the tile's button always shows (the full title is its aria-label).
                    tile.big
                      ? "line-clamp-3 max-w-[24ch] text-[1.5rem] xl:line-clamp-2 xl:text-[1.75rem]"
                      : i === 1 || i === 2
                        ? "line-clamp-[9] text-[1.3rem]"
                        : "line-clamp-3 text-[1.3rem]",
                  )}
                >
                  {u.title}
                </p>
              </div>
              <span
                className={cn(
                  "relative inline-flex h-8 w-fit shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-xs font-bold shadow-sm",
                  tile.btn,
                )}
              >
                {u.comment && daysFromNow(u.date) >= 0 ? t("readRespond") : t("readMore")}
                <ChevronRight aria-hidden className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5" />
              </span>
            </button>
          )
        })}
      </section>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Decided */}
        <section>
          <h2 className="flex items-center gap-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            {t("alsoDecided")} <span aria-hidden className="h-px flex-1 bg-border" />
          </h2>
          {decided.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t("noneDecided")}</p>}
          <div className="mt-2 divide-y divide-border">
            {decided.map((u) => {
              const b = bodies.find((x) => x.id === u.bodyId)!
              return (
                <article key={u.id} className="group grid gap-x-6 gap-y-3 py-6 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div>
                    <span className="relative mb-3 block h-36 overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-black/10 sm:h-28">
                      <Image
                        src={bodyPhoto(b.id, b.kind).src}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 160px, 100vw"
                        className="object-cover transition-[scale] duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
                      />
                    </span>
                    <p className="text-xs font-bold text-denim">{b.short}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(u.date, { weekday: "long" })}</p>
                  </div>
                  <div>
                    <button onClick={() => openStory(u)} className="text-left">
                      <h3 className="font-headline text-[1.4rem] leading-snug font-bold group-hover:text-denim">{u.title}</h3>
                    </button>
                    {u.summary && <p className="mt-2 leading-relaxed text-muted-foreground">{u.summary}</p>}
                    <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm">
                      <b>{t("forYou")}</b> {whyFor(u, profile.personas)}
                    </p>
                    {u.vote && (
                      <Chip tone="sage" className="mt-3">
                        {u.vote}
                      </Chip>
                    )}
                    {u.outcomePending && (
                      <Chip tone="sand" className="mt-3">
                        {tl("outcomePending")}
                      </Chip>
                    )}
                    {u.coverage !== undefined && <Coverage coverage={u.coverage} className="mt-4" />}
                  </div>
                </article>
              )
            })}
          </div>

          {!weekly && mud && (
            <div className="mt-6 rounded-[28px] bg-white p-6 md:p-8">
              <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">{t("byNumbers")}</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="font-headline text-4xl font-black text-brick">{mud.lastTurnout?.votes}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("votesLast", { name: mud.short })}</p>
                </div>
                <div>
                  <p className="font-headline text-4xl font-black">$38.5M</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("bondsBallot", { name: mud.short })}</p>
                </div>
                <div>
                  <p className="font-headline text-4xl font-black">14 mi</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("distance")}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Calendar rail */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {weekly && weekly.deadlines.length > 0 && (
            <div className="rounded-[28px] bg-white p-6">
              <h2 className="font-headline text-xl font-bold">{t("deadlines")}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {weekly.deadlines.map((d) => (
                  <li key={`${d.kind}-${d.at}-${d.item_id ?? ""}`} className="border-l-2 border-brick pl-3">
                    <p className="font-bold">{fmtDateTime(d.at)}</p>
                    <p className="text-muted-foreground">{d.label}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {calendar.length > 0 && (
            <div className="rounded-[28px] bg-white p-6">
              <h2 className="font-headline text-xl font-bold">{t("calendar")}</h2>
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
          )}

          {commentable[0] && (
            <div className="rounded-[28px] bg-brick p-6 font-sans text-white">
              <Mic aria-hidden className="size-6 text-white/80" />
              <p className="mt-4 text-xs font-bold tracking-[0.14em] text-white/60 uppercase">{t("oneThing")}</p>
              <p className="mt-2 text-xl leading-snug font-extrabold tracking-tight">
                {commentable[0].comment!.minutes !== null ? t("speakFor", { minutes: commentable[0].comment!.minutes!, title: commentable[0].title }) : t("speakUnknown", { title: commentable[0].title })}
              </p>
              <Button asChild variant="white" className="mt-5 w-full">
                <Link href={`/app/speak?item=${commentable[0].id}`}>
                  {t("draft")} <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
