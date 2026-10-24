"use client"

import { ArrowRight, ChevronRight, Clock, Mic } from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { BodyIcon, Chip, LogoTile } from "@/components/prototype/civic"
import { useStory } from "@/components/prototype/story-sheet"
import { Button } from "@/components/ui/button"
import { Coverage } from "@/components/weekly/Coverage"
import { bodyPhoto } from "@/lib/bodyPhotos"
import type { Body, Update } from "@/lib/prototype/types"
import { relevance, whyFor } from "@/lib/prototype/updates"
import { TIME_ZONE, daysFromNow, fmtDate, fmtTime } from "@/lib/prototype/format"
import { useMarkDone, useNow, useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

/**
 * Tile styles for the bento grid, from the sports-page reference. Each tile shows its government's
 * photo (lib/bodyPhotos.ts) under a veil of the tile's color: solid behind the text at the top,
 * thinner at the bottom so the photo shows. The veils keep the text at 4.5:1 or better.
 */
const TILES = [
  { cls: "sm:col-span-2 bg-denim text-white", btn: "text-denim", veil: "from-denim/95 via-denim/85 to-denim/40", big: true },
  { cls: "bg-ink text-white", btn: "text-ink", veil: "from-ink/95 via-ink/85 to-ink/35" },
  { cls: "bg-brick text-white", btn: "text-brick", veil: "from-brick/95 via-brick/88 to-brick/40" },
  { cls: "xl:col-span-2 bg-sand text-ink", btn: "text-sand-deep", veil: "from-sand via-sand/95 to-sand/60", light: true },
  { cls: "xl:col-span-2 bg-denim-soft text-ink", btn: "text-denim", veil: "from-denim-soft via-denim-soft/95 to-denim-soft/60", light: true },
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

  // Deadlines this week: buildWeekly's (plan §10) with real data, the demo's sign-up deadlines otherwise.
  // Each shows its item's short headline, not the long label.
  const deadlines = (
    weekly
      ? weekly.deadlines.map((d) => ({ key: `${d.kind}-${d.at}-${d.item_id ?? ""}`, at: d.at, kind: d.kind, label: d.label, update: d.item_id ? byId.get(d.item_id) : undefined }))
      : commentable.map((u) => ({ key: u.id, at: u.comment!.deadline, kind: "registration" as const, label: u.title, update: u }))
  )
    .map((d) => ({ ...d, title: d.update?.title ?? d.label, body: d.update ? bodies.find((x) => x.id === d.update!.bodyId)?.short : undefined }))
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))

  // The calendar: this week and next, Sunday to Saturday, in Central time.
  const DAY = 86_400_000
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TIME_ZONE }).format(new Date(now)),
  )
  const dayKey = (iso: string) => fmtDate(iso, { year: "numeric", month: "2-digit", day: "2-digit" })
  const byDay = new Map<string, Update[]>()
  for (const u of updates) {
    const d = daysFromNow(u.date)
    if (d < -dow || d > 13 - dow) continue
    const k = dayKey(u.date)
    byDay.set(k, [...(byDay.get(k) ?? []), u])
  }
  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const iso = new Date(now + (i - dow) * DAY).toISOString()
    return {
      key: dayKey(iso),
      day: Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: TIME_ZONE }).format(new Date(iso))),
      weekday: fmtDate(iso, { weekday: "short" }),
      label: fmtDate(iso, { weekday: "long", month: "short", day: "numeric" }),
      today: i === dow,
      past: i < dow,
      items: (byDay.get(dayKey(iso)) ?? []).sort((a, b) => +new Date(a.date) - +new Date(b.date)),
      deadlines: deadlines.filter((d) => dayKey(d.at) === dayKey(iso)),
    }
  })

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
      <section className="mt-8 grid auto-rows-[minmax(220px,auto)] gap-4 sm:grid-cols-2 xl:auto-rows-[minmax(300px,auto)] xl:grid-cols-4">
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
                        ? "line-clamp-4 text-[1.3rem]"
                        : "line-clamp-3 text-[1.3rem]",
                  )}
                >
                  {u.title}
                </p>
                {u.summary && (
                  <p className={cn("mt-2 line-clamp-3 text-sm leading-relaxed", tile.light ? "text-ink/75" : "text-white/85")}>
                    {u.summary}
                  </p>
                )}
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

      {/* Everything below the bento stacks full width, so an empty section never leaves half the page blank. */}
      <div className="mt-12 space-y-12">
        {calendarDays.some((d) => d.items.length > 0 || d.deadlines.length > 0) && (
          <section>
            <SectionHeading>{t("calendar")}</SectionHeading>
            <WeekCalendar days={calendarDays} bodies={bodies} onOpen={openStory} />
          </section>
        )}

        {decided.length > 0 && (
          <section>
            <SectionHeading>{t("alsoDecided")}</SectionHeading>
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
                      {whyFor(u, profile.personas) && (
                        <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm">
                          <b>{t("forYou")}</b> {whyFor(u, profile.personas)}
                        </p>
                      )}
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
          </section>
        )}

        {!weekly && mud && (
          <div className="rounded-[28px] bg-white p-6 md:p-8">
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

        {commentable[0] && (
          <div className="flex flex-col gap-5 rounded-[28px] bg-brick p-6 font-sans text-white md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-4">
              <Mic aria-hidden className="mt-1 size-6 shrink-0 text-white/80" />
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-white/70 uppercase">{t("oneThing")}</p>
                <p className="mt-1 line-clamp-2 text-xl leading-snug font-extrabold tracking-tight">
                  {commentable[0].comment!.minutes !== null
                    ? t("speakFor", { minutes: commentable[0].comment!.minutes!, title: commentable[0].title })
                    : t("speakUnknown", { title: commentable[0].title })}
                </p>
              </div>
            </div>
            <Button asChild variant="white" className="shrink-0">
              <Link href={`/app/speak?item=${commentable[0].id}`}>
                {t("draft")} <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
      {children} <span aria-hidden className="h-px flex-1 bg-border" />
    </h2>
  )
}

type CalendarDay = {
  key: string
  day: number
  weekday: string
  label: string
  today: boolean
  past: boolean
  items: Update[]
  deadlines: { key: string; at: string; title: string; update?: Update }[]
}

function deadlineGroups(d: CalendarDay) {
  const groups = new Map<string, { at: string; count: number; title: string; first?: Update }>()
  for (const x of d.deadlines) {
    const g = groups.get(x.at)
    if (g) g.count += 1
    else groups.set(x.at, { at: x.at, count: 1, title: x.title, first: x.update })
  }
  return [...groups.values()]
}

/** "Harris County Commissioners Court" -> "Commissioners Court", so a calendar cell fits one line. */
function shortBody(name: string) {
  return name
    .replace(/^(Harris County|Houston|City of Houston)\s+/i, "")
    .replace(/\s+Board of (Managers|Trustees)$/i, " board")
    .replace(/\s+District$/i, "")
}

/**
 * Two weeks at a glance. Each day shows its sign-up deadline and which governments meet (with an
 * item count), not item titles. Picking a day lists that day's deadlines and items underneath.
 */
function WeekCalendar({ days, bodies, onOpen }: { days: CalendarDay[]; bodies: Body[]; onOpen: (u: Update) => void }) {
  const t = useTranslations("AppBrief")
  const busy = (d: CalendarDay) => d.items.length > 0 || d.deadlines.length > 0
  const [selected, setSelected] = React.useState(() => (days.find((d) => !d.past && busy(d)) ?? days.find((d) => d.today) ?? days[0]!).key)
  const day = days.find((d) => d.key === selected) ?? days[0]!
  const byBody = (d: CalendarDay) => {
    const counts = new Map<string, number>()
    for (const u of d.items) counts.set(u.bodyId, (counts.get(u.bodyId) ?? 0) + 1)
    return [...counts.entries()].map(([id, count]) => ({ body: bodies.find((b) => b.id === id), count })).filter((x) => x.body)
  }
  const cell = (d: CalendarDay) => (
    <>
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
          d.today ? "bg-brick text-white" : d.past ? "text-muted-foreground" : "text-ink",
        )}
      >
        {d.day}
      </span>
      {d.deadlines[0] && (
        <span className="mt-1.5 flex items-center gap-1 rounded-md bg-brick-soft px-1.5 py-0.5 text-[10px] font-bold text-brick-deep">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-brick" />
          <span className="truncate">
            {t("signupTag")} {fmtTime(d.deadlines[0].at)}
          </span>
        </span>
      )}
      {byBody(d)
        .slice(0, 2)
        .map(({ body, count }) => (
          <span key={body!.id} className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <BodyIcon kind={body!.kind} id={body!.id} className="size-4 rounded-full" />
            <span className="min-w-0 flex-1 truncate">{shortBody(body!.short)}</span>
            <span className="text-muted-foreground">{count}</span>
          </span>
        ))}
    </>
  )
  return (
    <div className="mt-4 font-sans">
      {/* Desktop: the grid */}
      <div className="hidden overflow-hidden rounded-[24px] bg-white md:block">
        <div className="grid grid-cols-7 border-b border-line">
          {days.slice(0, 7).map((d) => (
            <span key={d.key} className="px-3 py-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              {d.weekday}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => (
            <button
              key={d.key}
              onClick={() => setSelected(d.key)}
              aria-pressed={d.key === selected}
              className={cn(
                "flex min-h-28 flex-col items-stretch justify-start border-line p-2 text-left transition-[background-color] duration-150 hover:bg-denim-soft/40",
                i % 7 !== 6 && "border-r",
                i < 7 && "border-b",
                d.past && "bg-muted/60",
                d.key === selected && "bg-denim-soft/60 ring-2 ring-denim ring-inset",
              )}
            >
              {cell(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Phones: a row of days */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
        {days
          .filter((d) => !d.past)
          .map((d) => (
            <button
              key={d.key}
              onClick={() => setSelected(d.key)}
              aria-pressed={d.key === selected}
              className={cn(
                "flex w-14 shrink-0 flex-col items-center gap-1 rounded-2xl bg-white py-2",
                d.key === selected && "bg-ink text-white",
              )}
            >
              <span className="text-[10px] font-bold uppercase opacity-70">{d.weekday}</span>
              <span className="text-base font-extrabold">{d.day}</span>
              <span className="flex h-1.5 gap-1">
                {d.deadlines.length > 0 && <span className="size-1.5 rounded-full bg-brick" />}
                {d.items.length > 0 && <span className={cn("size-1.5 rounded-full", d.key === selected ? "bg-white" : "bg-denim")} />}
              </span>
            </button>
          ))}
      </div>

      {/* The picked day */}
      <div className="mt-3 rounded-[24px] bg-white p-5">
        <p className="text-sm font-bold">{day.label}</p>
        {!busy(day) && <p className="mt-2 text-sm text-muted-foreground">{t("dayEmpty")}</p>}
        <ul className="mt-3 space-y-2">
          {/* Deadlines at the same time collapse into one line ("Sign-up closes 8:00 AM · 19 items"). */}
          {deadlineGroups(day).map((g) => (
            <li key={g.at}>
              <button onClick={() => g.first && onOpen(g.first)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left text-sm">
                <span className="shrink-0 rounded-md bg-brick-soft px-2 py-0.5 text-xs font-bold text-brick-deep">
                  {t("signupShort")} {fmtTime(g.at)}
                </span>
                <span className="font-semibold text-muted-foreground">{g.count > 1 ? t("forItems", { count: g.count }) : g.title}</span>
              </button>
            </li>
          ))}
          {day.items.slice(0, 5).map((u) => (
            <li key={u.id}>
              <button onClick={() => onOpen(u)} className="flex w-full items-center gap-3 text-left text-sm">
                <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">{fmtTime(u.date)}</span>
                <span className="min-w-0 flex-1 truncate font-semibold hover:text-denim">{u.title}</span>
              </button>
            </li>
          ))}
        </ul>
        {day.items.length > 5 && (
          <Link href="/app/timeline" className="mt-3 inline-block text-sm font-semibold text-denim hover:underline">
            {t("seeAll", { count: day.items.length })}
          </Link>
        )}
      </div>
    </div>
  )
}
