"use client"

import { ArrowRight, ChevronRight, Clock, MapPin, Mic } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { ArrowCircle, Panel, SectionTitle } from "@/components/prototype/civic"
import { useStory } from "@/components/prototype/story-sheet"
import { Button } from "@/components/ui/button"
import type { Update } from "@/lib/prototype/types"
import { ELECTION, relevance } from "@/lib/prototype/updates"
import { daysFromNow, fmtTime, money, monthDay } from "@/lib/prototype/format"
import { useNow, useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

export default function Home() {
  const { profile, jurisdiction, bodies, updates } = useProfile()
  const openStory = useStory()
  const now = useNow()

  const mine = updates.filter((u) => relevance(u, profile.personas) > 0)
  const upcoming = mine
    .filter((u) => +new Date(u.date) >= now && u.type !== "decision")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const thisWeek = upcoming.filter((u) => daysFromNow(u.date) <= 7)
  const urgent = upcoming.filter((u) => u.tier === "urgent")
  const nextComment = upcoming
    .filter((u) => u.comment && +new Date(u.comment.deadline) > now)
    .sort((a, b) => +new Date(a.comment!.deadline) - +new Date(b.comment!.deadline))[0]
  // The MUD facts below are demo numbers: only the demo utility district carries them.
  const mud = bodies.find((b) => b.kind === "mud" && b.lastTurnout)
  const taxTotal = bodies.reduce((s, b) => s + (b.taxRate ?? 0), 0) * 3000
  const daysToElection = daysFromNow(ELECTION.day)
  const isHomeowner = profile.personas.includes("homeowner")

  return (
    <div className="space-y-6">
      {/* Heading row */}
      <div className="flex flex-col gap-5 pt-6 pb-1 md:flex-row md:items-end md:justify-between">
        <div className="rise">
          {jurisdiction.zip && <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><MapPin className="size-3.5" aria-hidden /> {jurisdiction.area}, Houston</p>}
          <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em] md:text-[2.6rem]">
            {greeting()}{profile.name && `, ${profile.name}`}
          </h1>
          <p className="mt-1 text-[0.95rem] text-muted-foreground">
            Your neighborhood at a glance. {thisWeek.length} things coming up this week.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/speak">
            <Mic data-icon="inline-start" /> Prepare to speak
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        <StatCard
          href="/app/districts"
          hero
          label="Your local governments"
          value={bodies.length}
          note={mud ? `Including ${mud.short}, a utility district` : "See what each one controls"}
        />
        <StatCard
          href="/app/timeline"
          label="Worth your attention"
          value={urgent.length}
          note={urgent.length ? "Urgent votes and deadlines" : "Nothing urgent"}
          tone="brick"
        />
        {isHomeowner && taxTotal > 0 ? (
          <StatCard
            href="/app/districts"
            label="Local taxes, $300K home"
            value={money(taxTotal)}
            note={mud ? `${money(mud.taxRate! * 3000)} of it is ${mud.short}` : "Before exemptions"}
          />
        ) : (
          <StatCard
            href="/app/vote"
            label="Days to Election Day"
            value={Math.max(daysToElection, 0)}
            note="Tuesday, Nov 3"
          />
        )}
      </div>

      {/* Coming up + countdown */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionTitle
            action={
              <Link href="/app/timeline" className="text-sm font-semibold text-denim hover:underline">
                See all
              </Link>
            }
          >
            Coming up
          </SectionTitle>
          <ul className="-mx-1 divide-y divide-line">
            {upcoming.slice(0, 4).map((u) => {
              const { month, day } = monthDay(u.date)
              const b = bodies.find((x) => x.id === u.bodyId)!
              return (
                <li key={u.id}>
                  <button
                    onClick={() => openStory(u)}
                    className="group flex w-full items-center gap-4 rounded-2xl px-1 py-4 text-left transition-colors duration-150 hover:bg-muted"
                  >
                    <span
                      className={cn(
                        "grid size-12 shrink-0 place-content-center rounded-2xl text-center leading-none",
                        u.tier === "urgent" ? "bg-brick-soft text-brick-deep" : "bg-muted text-ink",
                      )}
                    >
                      <span className="text-[10px] font-bold tracking-wider">{month}</span>
                      <span className="text-lg font-extrabold">{day}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.95rem] leading-snug font-semibold">{u.title}</span>
                      <span className="mt-1.5 block text-xs text-muted-foreground">
                        {b.short} · {fmtTime(u.date)}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
        <Countdown u={nextComment} />
      </div>

      <PersonaCard />
    </div>
  )
}

function StatCard({
  label,
  value,
  note,
  href,
  hero,
  tone,
}: {
  label: string
  value: React.ReactNode
  note: string
  href: string
  hero?: boolean
  tone?: "brick"
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group rise relative flex min-h-[144px] flex-col justify-between gap-4 overflow-hidden rounded-[24px] bg-white p-5 transition-transform motion-safe:hover:-translate-y-0.5 md:min-h-[168px] md:p-6",
        hero && "col-span-2 bg-denim text-white sm:col-span-1",
      )}
    >
      {hero && (
        <>
          <span className="absolute -right-8 -bottom-16 size-40 rounded-full border-[22px] border-white/[0.06]" />
          <span className="absolute -right-2 -bottom-24 size-56 rounded-full border-[22px] border-white/[0.04]" />
        </>
      )}
      <div className="relative flex items-start justify-between gap-2">
        <p className={cn("text-sm font-semibold", hero ? "text-white" : "text-muted-foreground")}>{label}</p>
        <ArrowCircle className={hero ? "bg-white text-denim" : "hidden text-ink sm:grid"} />
      </div>
      <div className="relative">
        <p
          className={cn(
            "text-[2.6rem] leading-none font-bold tracking-tight tabular",
            tone === "brick" && "text-brick",
          )}
        >
          {value}
        </p>
        <p className={cn("mt-2 min-h-10 text-xs leading-relaxed sm:min-h-0", hero ? "text-white/80" : "text-muted-foreground")}>
          {note}
        </p>
      </div>
    </Link>
  )
}

function useCountdown(target?: string) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!target) return null
  const ms = Math.max(0, +new Date(target) - now)
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms / 3_600_000) % 24)
  const m = Math.floor((ms / 60_000) % 60)
  const s = Math.floor((ms / 1000) % 60)
  return { d, h, m, s }
}

function Countdown({ u }: { u?: Update }) {
  const t = useCountdown(u?.comment?.deadline)
  const { bodies } = useProfile()
  const b = u && bodies.find((x) => x.id === u.bodyId)
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[24px] bg-ink p-6 text-white md:p-7">
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <circle key={i} cx="105%" cy="110%" r={40 + i * 28} fill="none" stroke="white" strokeWidth="1" />
        ))}
      </svg>
      <div className="relative">
        <p className="flex items-center gap-2 text-sm font-bold text-white/80">
          <Clock className="size-4" /> Speaker sign-up closes in
        </p>
      </div>
      {u && t ? (
        <div className="relative">
          <p className="text-[2.6rem] leading-none font-extrabold tracking-tight whitespace-nowrap tabular">
            {t.d > 0 ? (
              <>
                {t.d}
                <span className="text-white/40">d </span>
                {t.h}
                <span className="text-white/40">h </span>
                {pad(t.m)}
                <span className="text-white/40">m</span>
              </>
            ) : (
              <>
                {pad(t.h)}:{pad(t.m)}
                <span className="text-white/40">:{pad(t.s)}</span>
              </>
            )}
          </p>
          <p className="mt-4 text-sm leading-relaxed font-semibold">{u.title}</p>
          <p className="mt-1.5 text-xs text-white/75">{b?.short}</p>
        </div>
      ) : (
        <p className="relative text-lg font-bold">No open comment windows right now.</p>
      )}
      {u && (
        <Button asChild variant="brick" className="relative mt-4 w-full">
          <Link href={`/app/speak?item=${u.id}`}>
            <Mic data-icon="inline-start" /> {u.comment?.minutes ? `Prep my ${u.comment.minutes} minutes` : "Prepare my comment"}
          </Link>
        </Button>
      )}
    </div>
  )
}

/** One persona-specific nudge, as a single slim banner. */
function PersonaCard() {
  const { profile, bodies, updates } = useProfile()
  const openStory = useStory()
  // The MUD facts below are demo numbers: only the demo utility district carries them.
  const mud = bodies.find((b) => b.kind === "mud" && b.lastTurnout)
  const age = profile.age ?? 0
  const isStudent = profile.personas.includes("student")

  let tone = "bg-sand text-ink"
  let text = "Everything decided near you this week, in about four minutes."
  let action: React.ReactNode = (
    <Button asChild>
      <Link href="/app/brief">
        Read the brief <ArrowRight data-icon="inline-end" />
      </Link>
    </Button>
  )

  if (isStudent && age >= 17 && age < 19) {
    tone = "bg-denim-soft text-denim-deep"
    text = "You can register to vote at 17 years and 10 months if you'll be 18 by Election Day."
    action = (
      <Button asChild variant="outline">
        <Link href="/app/vote">
          Check my eligibility <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    )
  } else if (mud) {
    const bond = updates.find((u) => u.id === `${mud.id}-bond`)
    tone = "bg-ink text-white"
    text = `${mud.lastTurnout!.votes} people decided the last ${mud.short} election. Now a $38.5M bond is on your ballot.`
    action = bond && (
      <Button variant="white" onClick={() => openStory(bond)}>
        What's on the ballot <ArrowRight data-icon="inline-end" />
      </Button>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4 rounded-[24px] p-6 md:flex-row md:items-center md:justify-between md:px-8", tone)}>
      <p className="max-w-2xl text-[0.95rem] leading-relaxed font-semibold">{text}</p>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
