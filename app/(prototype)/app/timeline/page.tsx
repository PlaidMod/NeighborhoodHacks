"use client"

import { ArrowRight, ChevronDown, Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { BodyIcon } from "@/components/prototype/civic"
import { FallingBooks } from "@/components/prototype/falling-books"
import { Reveal } from "@/components/prototype/reveal"
import { useNavOpen } from "@/components/prototype/app-shell"
import { useStory } from "@/components/prototype/story-sheet"
import { Switch } from "@/components/ui/switch"
import { bodyPhoto } from "@/lib/bodyPhotos"
import { daysFromNow, fmtDate, fmtTime, relDay, relDayLower } from "@/lib/prototype/format"
import { useNow, useProfile } from "@/lib/prototype/profile"
import type { Body, Topic, Update } from "@/lib/prototype/types"
import { cn } from "@/lib/utils"

// The timeline (plan §2, Project_Plan §6): every item from the reader's governments, coming up
// soonest first, then what was already decided. Cards load in batches as the reader scrolls.

const BATCH = 6

/** Soft elevation: tiles float a little above the page without a heavy shadow. */
const LIFT = "shadow-[0_1px_2px_rgb(27_38_59/0.04),0_6px_20px_-12px_rgb(27_38_59/0.16)]"
const LIFT_HI = "hover:shadow-[0_1px_2px_rgb(27_38_59/0.05),0_14px_32px_-14px_rgb(27_38_59/0.22)]"
const EASE = "ease-[cubic-bezier(0.2,0,0,1)]"

export default function Timeline() {
  const t = useTranslations("AppTimeline")
  const { updates, bodies, jurisdiction, weekly } = useProfile()
  const openStory = useStory()
  const navOpen = useNavOpen()
  const now = useNow()
  const [topic, setTopic] = React.useState<Topic | null>(null)
  const [muted, setMuted] = React.useState<string[]>([])
  const [limit, setLimit] = React.useState(BATCH)

  const byBody = new Map(bodies.map((b) => [b.id, b]))
  const topics = [...new Set(updates.map((u) => u.topic))]
  const filtered = updates.filter((u) => {
    if (muted.includes(u.bodyId)) return false
    if (topic && u.topic !== topic) return false
    return true
  })
  const upcoming = filtered.filter((u) => +new Date(u.date) >= now).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const past = filtered.filter((u) => +new Date(u.date) < now).sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const ordered = [...upcoming, ...past]
  const visible = ordered.slice(0, limit)
  const hasMore = limit < ordered.length

  // Upcoming items grouped by day; everything already past goes under one heading.
  const groups: { key: string; label: string; sub: string; today: boolean; items: Update[] }[] = []
  for (const u of visible) {
    const isPast = +new Date(u.date) < now
    const key = isPast ? "past" : fmtDate(u.date, { year: "numeric", month: "2-digit", day: "2-digit" })
    let g = groups.find((x) => x.key === key)
    if (!g) {
      g = isPast
        ? { key, label: t("decidedHeading"), sub: "", today: false, items: [] }
        : { key, label: relDay(u.date), sub: fmtDate(u.date, { weekday: "short", month: "short", day: "numeric" }), today: daysFromNow(u.date) === 0, items: [] }
      groups.push(g)
    }
    g.items.push(u)
  }

  // Tiles alternate sides across the whole list, not per day.
  const side = new Map(visible.filter((u) => +new Date(u.date) >= now).map((u, i) => [u.id, i % 2 === 1]))

  const change = (fn: () => void) => {
    fn()
    setLimit(BATCH)
  }

  // The memo is the week's lead story (plan §10) when there's real data, else the most urgent item coming up.
  const soon = updates.filter((u) => +new Date(u.date) >= now).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const lead = (weekly?.leadId && updates.find((u) => u.id === weekly.leadId)) || soon.find((u) => u.tier === "urgent") || soon[0]
  const weighIn = soon.filter((u) => daysFromNow(u.date) <= 7 && u.type !== "decision").length
  const nextDeadline = updates
    .filter((u) => u.comment && +new Date(u.comment.deadline) > now)
    .sort((a, b) => +new Date(a.comment!.deadline) - +new Date(b.comment!.deadline))[0]

  return (
    <div
      // With the sidebar open, the left column folds away (its track animates to 0) and the timeline moves left.
      style={{ "--left": navOpen ? "0px" : "304px" } as React.CSSProperties}
      className="grid grid-cols-[minmax(0,1fr)] gap-10 pt-4 pb-10 lg:grid-cols-[minmax(0,1fr)_272px] lg:gap-x-16 xl:grid-cols-[var(--left)_minmax(0,1fr)_272px] xl:gap-x-0 xl:transition-[grid-template-columns] xl:duration-300 xl:ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
    >
      <FallingBooks />
      {/* Left: the big number, the week's memo and topics. Hidden while the sidebar is open. */}
      <aside
        inert={navOpen}
        className={cn(
          "lg:col-span-2 xl:sticky xl:top-6 xl:col-span-1 xl:min-w-0 xl:self-start xl:overflow-hidden xl:pr-16 xl:transition-opacity xl:duration-200",
          navOpen && "lg:max-xl:hidden xl:pointer-events-none xl:opacity-0",
        )}
      >
        <Reveal>
          <p className="text-sm font-semibold text-muted-foreground">
            {t("dateline", { date: fmtDate(new Date(now).toISOString(), { weekday: "long", month: "long", day: "numeric" }), area: jurisdiction.area })}
          </p>
        </Reveal>
        <div className="sm:flex sm:flex-wrap sm:items-end sm:gap-x-8 sm:gap-y-6 xl:block">
          <Reveal delay={100}>
            <CountUp value={weighIn} className="mt-5 block text-[4.5rem] leading-[0.8] font-bold tracking-[-0.06em] tabular-nums md:text-[5.5rem]" />
            <p className="mt-2.5 text-[0.86rem] font-semibold text-muted-foreground">
              <span className="text-ink">{t("bigLabel")}</span> {t("bigSub")}
            </p>
          </Reveal>
          {lead && (
            <Reveal delay={200} className="mt-8 min-w-0 sm:mt-0 sm:flex-1 xl:mt-8">
              <button
                onClick={() => openStory(lead)}
                className={cn(
                  "group block w-full max-w-md rounded-[22px] bg-sand p-4 text-left transition-[rotate,translate] duration-300 hover:-translate-y-0.5 hover:rotate-0 sm:-rotate-1 motion-reduce:rotate-0 motion-reduce:transition-none",
                  EASE,
                  LIFT,
                )}
              >
                <span className="text-xs font-bold text-sand-deep">{t("memoKicker")}</span>
                <span className="mt-1.5 line-clamp-3 text-[1.02rem] leading-snug font-bold tracking-[-0.02em] text-ink">{lead.title}</span>
                <span className="mt-2 block text-sm font-semibold text-sand-deep">
                  {lead.comment && +new Date(lead.comment.deadline) > now
                    ? t("memoSignup", { when: `${relDayLower(lead.comment.deadline)}, ${fmtTime(lead.comment.deadline)}` })
                    : t("memoVote", { when: relDayLower(lead.date) })}
                </span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-ink">
                  <span className="grid size-7 place-items-center rounded-full bg-ink text-white transition-[translate] duration-150 group-hover:translate-x-0.5">
                    <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
                  </span>
                  {t("memoRead")}
                </span>
              </button>
            </Reveal>
          )}
        </div>
        <Reveal delay={300}>
          <div role="group" aria-label={t("topicsLabel")} className="scrollbar-none -mr-4 mt-8 flex gap-2 overflow-x-auto pr-4 xl:mr-0 xl:flex-wrap xl:overflow-visible xl:pr-0">
            <TopicChip on={!topic} onClick={() => change(() => setTopic(null))}>
              {t("tabs.all")}
            </TopicChip>
            {topics.map((x) => (
              <TopicChip key={x} on={topic === x} onClick={() => change(() => setTopic(topic === x ? null : x))}>
                <TopicLabel topic={x} />
              </TopicChip>
            ))}
          </div>
        </Reveal>
      </aside>

      {/* Center: the scrolling timeline. Clipped sideways so tiles sliding in never widen the page. */}
      <section className="min-w-0 overflow-x-clip xl:pr-16">
        <Reveal className="mb-8 text-center">
          <h1 className="text-[1.6rem] leading-none font-bold tracking-[-0.035em]">{t("title")}</h1>
        </Reveal>

        <Spine>
          {groups.map((g) => (
            <div key={g.key} className="mb-2">
              <Reveal className="relative mt-10 mb-4 flex items-baseline gap-2.5 first:mt-0">
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1 -left-[37px] size-[11px] rounded-full border-2",
                    g.today ? "border-brick bg-brick" : g.key === "past" ? "border-sage bg-canvas" : "border-ink bg-canvas",
                  )}
                />
                <h2 className="text-base font-bold">{g.label}</h2>
                {g.sub && <span className="text-sm font-semibold text-muted-foreground/80">{g.sub}</span>}
              </Reveal>
              <div className="space-y-6">
                {g.items.map((u) => {
                  const b = byBody.get(u.bodyId)
                  if (!b) return null
                  return g.key === "past" ? (
                    <DecidedRow key={u.id} u={u} b={b} onOpen={() => openStory(u)} />
                  ) : (
                    <StoryTile key={u.id} u={u} b={b} right={side.get(u.id) ?? false} now={now} onOpen={() => openStory(u)} />
                  )
                })}
              </div>
            </div>
          ))}
          {ordered.length === 0 && (
            <Reveal className="rounded-[26px] bg-white p-10 text-center">
              <p className="font-bold">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
            </Reveal>
          )}
          {ordered.length > 0 && <LoadMore hasMore={hasMore} onMore={() => setLimit((l) => l + BATCH)} />}
        </Spine>
      </section>

      {/* Right: the next deadline and quick actions */}
      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <Reveal delay={200}>
          <Countdown u={nextDeadline} />
        </Reveal>
        <Reveal delay={300}>
          <QuickActions u={nextDeadline} bodies={bodies} muted={muted} onMute={(id, on) => change(() => setMuted((m) => (on ? m.filter((x) => x !== id) : [...m, id])))} />
        </Reveal>
      </aside>
    </div>
  )
}

function TopicLabel({ topic }: { topic: Topic }) {
  const tl = useTranslations("AppLabels")
  return <>{tl(`topic.${topic}`)}</>
}

function TopicChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full border border-line px-3.5 text-[0.78rem] font-semibold text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white hover:text-ink active:scale-[0.96]",
        on && "border-ink bg-ink text-white hover:bg-ink hover:text-white",
      )}
    >
      {children}
    </button>
  )
}

/** The timeline's line, which fills in brick as the reader scrolls through it. */
function Spine({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const fill = React.useRef<HTMLSpanElement>(null)
  React.useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = ref.current
      if (!el || !fill.current) return
      const r = el.getBoundingClientRect()
      const seen = Math.min(Math.max((window.innerHeight * 0.6 - r.top) / r.height, 0), 1)
      fill.current.style.scale = `1 ${seen}`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])
  return (
    <div ref={ref} className="relative pl-10">
      <span aria-hidden className="absolute top-2 bottom-6 left-[9px] w-px bg-border" />
      <span ref={fill} aria-hidden className="absolute top-2 bottom-6 left-[9px] w-0.5 -translate-x-[0.5px] origin-top bg-brick" style={{ scale: "1 0" }} />
      {children}
    </div>
  )
}

function StoryTile({ u, b, right, now, onOpen }: { u: Update; b: Body; right: boolean; now: number; onOpen: () => void }) {
  const t = useTranslations("AppTimeline")
  const tb = useTranslations("AppBrief")
  const tl = useTranslations("AppLabels")
  const photo = bodyPhoto(b.id, b.kind)
  const urgent = u.tier === "urgent"
  const closes = u.comment && +new Date(u.comment.deadline) > now ? u.comment.deadline : null
  const outlets = u.coverage?.outlet_count ?? 0

  // Scroll-linked depth (Motion). As the tile comes up from the bottom it slides in from its own
  // side, grows from 88% and untilts; across the whole screen its photo moves against the scroll.
  // Tied to scroll position, so it reverses when you scroll back. Still with reduced motion.
  const ref = React.useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const enter = useTransform(scrollYProgress, [0, 0.4], [0, 1], { clamp: true })
  const x = useTransform(enter, [0, 1], [reduce ? 0 : right ? 72 : -72, 0])
  const scale = useTransform(enter, [0, 1], [reduce ? 1 : 0.88, 1])
  const rotate = useTransform(enter, [0, 1], [reduce ? 0 : right ? 3 : -3, 0])
  const opacity = useTransform(enter, [0, 1], [reduce ? 1 : 0.25, 1])
  const photoY = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -22, reduce ? 0 : 22])
  const tileTransform = useMotionTemplate`translateX(${x}px) scale(${scale}) rotate(${rotate}deg)`
  const photoTransform = useMotionTemplate`translateY(${photoY}%)`

  return (
    <motion.div ref={ref} style={{ transform: tileTransform, opacity }} className={cn("w-full origin-center lg:w-[86%]", right && "lg:ml-[14%]")}>
      <button
        onClick={onOpen}
        aria-label={u.title}
        className={cn(
          "group block w-full overflow-hidden rounded-[26px] border border-transparent bg-white text-left transition-[translate,box-shadow] duration-300 hover:-translate-y-[3px] motion-reduce:hover:translate-y-0",
          EASE,
          LIFT,
          LIFT_HI,
        )}
      >
        <span className="relative block h-[150px] overflow-hidden outline-1 -outline-offset-1 outline-black/10 md:h-[170px]">
          <motion.span aria-hidden style={{ transform: photoTransform }} className="absolute inset-x-0 -top-[30%] -bottom-[30%] block">
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="(min-width: 1280px) 560px, (min-width: 1024px) 60vw, 100vw"
              className={cn("object-cover transition-[scale] duration-700 group-hover:scale-[1.03] motion-reduce:transition-none", EASE)}
            />
          </motion.span>
          {urgent && <span className="absolute top-4 left-4 rounded-full bg-brick px-3 py-1.5 text-[11.5px] font-bold text-white">{tl("urgent")}</span>}
          <span className="absolute right-3.5 bottom-2.5 text-[10px] text-white/85 [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">
            {t("photo", { credit: photo.credit })}
          </span>
        </span>
        <span className="block px-5 pt-4 pb-5">
          <span className="flex items-center gap-2 text-[0.82rem] font-semibold text-muted-foreground">
            <BodyIcon kind={b.kind} id={b.id} className="size-6 rounded-full" />
            {b.short}
          </span>
          <span className="mt-2 line-clamp-3 text-[1.05rem] leading-[1.25] font-bold tracking-[-0.02em] md:text-[1.15rem]">{u.title}</span>
          <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8rem] font-semibold text-muted-foreground">
            <Clock aria-hidden className="size-3.5" strokeWidth={2.25} />
            {relDay(u.date)}, {fmtTime(u.date)}
            {closes && (
              <>
                <span aria-hidden>·</span>
                <span className={urgent ? "text-brick" : undefined}>{t("signupCloses", { when: `${relDayLower(closes)} ${fmtTime(closes)}` })}</span>
              </>
            )}
          </span>
          {urgent && (
            <span className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[0.8rem] font-semibold text-muted-foreground/80">
                {t("outlets", { count: outlets })}
                {u.aiWritten && ` · ${t("aiShort")}`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[0.82rem] font-bold text-white transition-[scale] duration-150 ease-out group-active:scale-[0.96]">
                {closes ? tb("readRespond") : tb("readMore")}
                <ArrowRight aria-hidden className="size-4 transition-[translate] duration-150 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </span>
            </span>
          )}
        </span>
      </button>
    </motion.div>
  )
}

function DecidedRow({ u, b, onOpen }: { u: Update; b: Body; onOpen: () => void }) {
  const tl = useTranslations("AppLabels")
  return (
    <Reveal>
      <button
        onClick={onOpen}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border border-line px-5 py-4 text-left transition-[background-color] duration-150 hover:bg-white"
      >
        <BodyIcon kind={b.kind} id={b.id} className="size-10 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug">{u.title}</span>
          <span className="mt-0.5 block text-[0.8rem] font-semibold text-muted-foreground">
            {b.short} · {fmtDate(u.date)}
          </span>
        </span>
        {(u.vote || u.outcomePending) && (
          <span className="basis-full pl-14 sm:basis-auto sm:pl-0">
            {u.vote && <span className="inline-block rounded-full bg-sage-soft px-3 py-1.5 text-xs font-bold text-sage">{u.vote}</span>}
            {u.outcomePending && <span className="inline-block rounded-full bg-sand px-3 py-1.5 text-xs font-bold text-sand-deep">{tl("outcomePending")}</span>}
          </span>
        )}
      </button>
    </Reveal>
  )
}

/** Loads the next batch when the reader nears the end, with a short visible "loading" beat. */
function LoadMore({ hasMore, onMore }: { hasMore: boolean; onMore: () => void }) {
  const t = useTranslations("AppTimeline")
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !timer) timer = setTimeout(onMore, 400)
      },
      { rootMargin: "0px 0px 200px 0px" },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [hasMore, onMore])
  return (
    <div ref={ref} className="pt-8 pb-2 text-center text-sm font-semibold text-muted-foreground" role="status">
      {hasMore ? (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-muted-foreground/50 motion-safe:animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </span>
          {t("loading")}
        </span>
      ) : (
        t("caughtUp")
      )}
    </div>
  )
}

/** Counts up from 0 on first view; shows the final number at once with reduced motion. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const animate = () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [n, setN] = React.useState(() => (animate() ? 0 : value))
  React.useEffect(() => {
    if (!animate() || value === 0) return
    let frame = 0
    const start = performance.now()
    const tick = (time: number) => {
      const p = Math.min((time - start) / 700, 1)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return (
    <span className={className} aria-label={String(value)}>
      {n}
    </span>
  )
}

function Countdown({ u }: { u: Update | undefined }) {
  const t = useTranslations("AppTimeline")
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!u?.comment) {
    return (
      <div className={cn("rounded-[22px] bg-ink p-5 text-white", LIFT)}>
        <p className="text-sm font-semibold text-white/60">{t("nextDeadline")}</p>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-white/80">{t("noDeadline")}</p>
      </div>
    )
  }
  const left = Math.max(0, +new Date(u.comment.deadline) - now)
  const d = Math.floor(left / 86_400_000)
  const h = Math.floor((left % 86_400_000) / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  const unit = "mr-1.5 ml-0.5 text-[1.15rem] font-semibold text-white/40"
  return (
    <div className={cn("rounded-[22px] bg-ink p-5 text-white", LIFT)}>
      <p className="text-sm font-semibold text-white/60">{t("nextDeadline")}</p>
      <p className="mt-2 text-[2.2rem] leading-none font-bold tracking-[-0.05em] tabular-nums" aria-live="off">
        {d > 0 && (
          <>
            {d}
            <span className={unit}>d</span>
          </>
        )}
        {h}
        <span className={unit}>h</span>
        {String(m).padStart(2, "0")}
        <span className={unit}>m</span>
        {d === 0 && (
          <>
            {String(s).padStart(2, "0")}
            <span className={unit}>s</span>
          </>
        )}
      </p>
      <p className="mt-2.5 line-clamp-2 text-[0.82rem] leading-snug text-white/75">{t("untilClose", { title: u.title })}</p>
      <Link
        href={`/app/speak?item=${u.id}`}
        className="mt-4 flex justify-center rounded-full bg-white py-2.5 text-[0.84rem] font-bold text-ink transition-[scale] duration-150 ease-out active:scale-[0.96]"
      >
        {t("signUp")}
      </Link>
    </div>
  )
}

function QuickActions({
  u,
  bodies,
  muted,
  onMute,
}: {
  u: Update | undefined
  bodies: Body[]
  muted: string[]
  onMute: (id: string, on: boolean) => void
}) {
  const t = useTranslations("AppTimeline")
  const [open, setOpen] = React.useState(false)
  const row = "flex items-center justify-between gap-3 border-t border-line py-3 text-[0.84rem] font-semibold first:border-t-0"
  const arrow = <ArrowRight aria-hidden className="size-4 text-muted-foreground transition-[translate,color] duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
  return (
    <div className={cn("rounded-[22px] bg-white px-5 pt-3.5 pb-1.5", LIFT)}>
      <h2 className="pb-1 text-[0.95rem] font-bold">{t("quick")}</h2>
      <div>
        {u && (
          <Link href={`/app/speak?item=${u.id}`} className={cn(row, "group")}>
            {t("qDraft")}
            {arrow}
          </Link>
        )}
        <Link href="/app/alerts" className={cn(row, "group")}>
          {t("qAlerts")}
          {arrow}
        </Link>
        <button aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cn(row, "group w-full text-left")}>
          {t("qGovs")}
          <ChevronDown aria-hidden className={cn("size-4 text-muted-foreground transition-[rotate] duration-300", EASE, open && "rotate-180")} />
        </button>
        <div className={cn("grid transition-[grid-template-rows] duration-300", EASE, open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden" inert={!open}>
            <ul className="space-y-1 pb-3">
              {bodies.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-1.5">
                  <BodyIcon kind={b.kind} id={b.id} className="size-8 rounded-full" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{b.short}</span>
                  <Switch checked={!muted.includes(b.id)} onCheckedChange={(on) => onMute(b.id, on)} aria-label={t("show", { name: b.short })} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
