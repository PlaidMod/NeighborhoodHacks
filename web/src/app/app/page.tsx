"use client"

import { ArrowRight, Clock, Mic, Newspaper, Vote } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { ArrowCircle, BodyIcon, Chip, KIND_STYLE, Panel, SectionTitle } from "@/components/civic"
import { useStory } from "@/components/story-sheet"
import { Button } from "@/components/ui/button"
import type { Update } from "@/lib/data/types"
import { ELECTION, relevance, whyFor } from "@/lib/data/updates"
import { daysFromNow, fmtTime, money, monthDay, relDayLower } from "@/lib/format"
import { useNow, useProfile } from "@/lib/profile"
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
  const decided = mine
    .filter((u) => u.type === "decision" && daysFromNow(u.date) >= -21)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const nextComment = upcoming
    .filter((u) => u.comment && +new Date(u.comment.deadline) > now)
    .sort((a, b) => +new Date(a.comment!.deadline) - +new Date(b.comment!.deadline))[0]
  const mud = bodies.find((b) => b.kind === "mud")
  const taxTotal = bodies.reduce((s, b) => s + (b.taxRate ?? 0), 0) * 3000
  const daysToElection = daysFromNow(ELECTION.day)
  const isHomeowner = profile.personas.includes("homeowner")

  return (
    <div className="space-y-5">
      {/* Heading row */}
      <div className="flex flex-col gap-5 pt-4 md:flex-row md:items-end md:justify-between">
        <div className="rise">
          <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em] md:text-[2.6rem]">
            {greeting()}, {profile.name}
          </h1>
          <p className="mt-1 text-[0.95rem] text-muted-foreground">
            {thisWeek.length} things coming up near {jurisdiction.area} this week.{" "}
            {daysFromNow(ELECTION.earlyStart) > 0
              ? `Early voting starts ${relDayLower(ELECTION.earlyStart)}.`
              : daysToElection >= 0
                ? `Election Day is in ${daysToElection} days.`
                : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/app/speak">
              <Mic data-icon="inline-start" /> Draft a comment
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/brief">This week's brief</Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard
          href="/app/districts"
          hero
          label="Governments over you"
          value={bodies.length}
          note={mud ? `Including ${mud.short}, a utility district` : `${bodies.filter((b) => b.lastTurnout).length} hold elections`}
        />
        <StatCard
          href="/app/timeline"
          label="Coming up"
          value={upcoming.length}
          note={`${thisWeek.length} in the next 7 days`}
        />
        <StatCard
          href="/app/timeline"
          label="Need your attention"
          value={urgent.length}
          note={urgent[0] ? urgent[0].title.split(" ").slice(0, 5).join(" ") + "…" : "Nothing urgent"}
          tone="brick"
        />
        {isHomeowner ? (
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

      {/* Row 2 */}
      <div className="grid gap-4 xl:grid-cols-4">
        <StackCard className="xl:col-span-2" />
        <Countdown u={nextComment} />
        <Panel>
          <SectionTitle
            action={
              <Button asChild variant="outline" size="xs">
                <Link href="/app/timeline">See all</Link>
              </Button>
            }
          >
            Coming up
          </SectionTitle>
          <ul className="-mx-2 space-y-0.5">
            {upcoming.slice(0, 4).map((u) => {
              const { month, day } = monthDay(u.date)
              const b = bodies.find((x) => x.id === u.bodyId)!
              return (
                <li key={u.id}>
                  <button
                    onClick={() => openStory(u)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-muted"
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
                      <span className="line-clamp-2 text-[0.85rem] leading-snug font-bold">{u.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {b.short} · {fmtTime(u.date)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      {/* Row 3 */}
      <div className="grid gap-4 xl:grid-cols-4">
        <Panel className="xl:col-span-2">
          <SectionTitle>Recently decided</SectionTitle>
          <ul className="divide-y divide-line">
            {decided.slice(0, 3).map((u) => {
              const b = bodies.find((x) => x.id === u.bodyId)!
              return (
                <li key={u.id}>
                  <button
                    onClick={() => openStory(u)}
                    className="group flex w-full items-start gap-4 py-3.5 text-left first:pt-0"
                  >
                    <BodyIcon kind={b.kind} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold group-hover:text-denim">{u.title}</span>
                      <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {whyFor(u, profile.personas)}
                      </span>
                    </span>
                    {u.vote && <Chip tone="sage" className="hidden sm:inline-flex">{u.vote}</Chip>}
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
        <PersonaCard className="xl:col-span-2" />
      </div>
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
        "group rise relative flex min-h-[156px] flex-col justify-between overflow-hidden rounded-[24px] bg-white p-5 transition-transform hover:-translate-y-0.5",
        hero && "bg-denim text-white",
      )}
    >
      {hero && (
        <>
          <span className="absolute -right-8 -bottom-16 size-40 rounded-full border-[22px] border-white/[0.06]" />
          <span className="absolute -right-2 -bottom-24 size-56 rounded-full border-[22px] border-white/[0.04]" />
        </>
      )}
      <div className="relative flex items-start justify-between gap-2">
        <p className={cn("text-[0.9rem] font-bold", hero ? "text-white" : "text-ink")}>{label}</p>
        <ArrowCircle className={hero ? "bg-white text-denim" : "text-ink"} />
      </div>
      <div className="relative">
        <p
          className={cn(
            "text-[2.6rem] leading-none font-extrabold tracking-tight tabular",
            tone === "brick" && "text-brick",
          )}
        >
          {value}
        </p>
        <p className={cn("mt-2 truncate text-xs font-medium", hero ? "text-white/75" : "text-muted-foreground")}>
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
    <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-[24px] bg-ink p-6 text-white">
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
          <p className="mt-3 line-clamp-2 text-sm font-semibold">{u.title}</p>
          <p className="text-xs text-white/60">{b?.short}</p>
        </div>
      ) : (
        <p className="relative text-lg font-bold">No open comment windows right now.</p>
      )}
      {u && (
        <Button asChild variant="brick" className="relative mt-4 w-full">
          <Link href={`/app/speak?item=${u.id}`}>
            <Mic data-icon="inline-start" /> Prep my {u.comment?.minutes} minutes
          </Link>
        </Button>
      )}
    </div>
  )
}

function StackCard({ className }: { className?: string }) {
  const { bodies } = useProfile()
  const [value, setValue] = React.useState(300_000)
  const taxed = bodies.filter((b) => b.taxRate)
  const total = taxed.reduce((s, b) => s + b.taxRate!, 0)

  return (
    <Panel className={className}>
      <SectionTitle
        action={
          <Link href="/app/districts" className="text-xs font-bold text-denim hover:underline">
            Explore your stack
          </Link>
        }
      >
        Who takes a slice of your tax bill
      </SectionTitle>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Estimated yearly total</p>
          <p className="text-3xl font-extrabold tracking-tight tabular">{money((total * value) / 100)}</p>
        </div>
        <label className="w-48 text-right">
          <span className="text-xs font-semibold text-muted-foreground">
            Home value <b className="text-ink tabular">{money(value)}</b>
          </span>
          <input
            type="range"
            min={100_000}
            max={900_000}
            step={10_000}
            value={value}
            onChange={(e) => setValue(+e.target.value)}
            className="mt-1 w-full accent-denim"
          />
        </label>
      </div>
      <div className="mt-4 flex h-4 overflow-hidden rounded-full">
        {taxed.map((b) => (
          <div
            key={b.id}
            title={`${b.short}: ${money((b.taxRate! * value) / 100)}`}
            style={{ width: `${(b.taxRate! / total) * 100}%` }}
            className={cn("h-full border-r-2 border-white last:border-r-0", KIND_STYLE[b.kind].dot)}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {taxed
          .sort((a, b) => b.taxRate! - a.taxRate!)
          .map((b) => (
            <li key={b.id} className="flex items-center gap-2 text-sm">
              <span className={cn("size-2.5 shrink-0 rounded-full", KIND_STYLE[b.kind].dot)} />
              <span className="truncate font-medium">{b.short}</span>
              <span className="ml-auto font-bold tabular">{money((b.taxRate! * value) / 100)}</span>
            </li>
          ))}
      </ul>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Approximate rates before homestead exemptions. Renters pay these indirectly through rent.
      </p>
    </Panel>
  )
}

function PersonaCard({ className }: { className?: string }) {
  const { profile, bodies, updates } = useProfile()
  const openStory = useStory()
  const mud = bodies.find((b) => b.kind === "mud")
  const age = profile.age ?? 0
  const isStudent = profile.personas.includes("student")

  if (isStudent && age >= 17 && age < 19) {
    return (
      <div className={cn("relative overflow-hidden rounded-[24px] bg-brick p-6 text-white md:p-8", className)}>
        <Vote className="absolute -right-6 -bottom-8 size-48 text-white/10" strokeWidth={1.2} />
        <Chip className="bg-white/15 text-white">For {age}-year-olds</Chip>
        <p className="mt-5 max-w-sm text-[1.7rem] leading-tight font-extrabold tracking-tight">
          You can register at 17 years and 10 months if you'll be 18 by Election Day.
        </p>
        <p className="mt-2 max-w-sm text-sm text-white/75">
          Check if you're registered and find out when you'll be eligible. It takes about 30 seconds.
        </p>
        <Button asChild variant="white" className="mt-6">
          <Link href="/app/vote">
            Check my eligibility <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    )
  }

  if (mud) {
    const bond = updates.find((u) => u.id === `${mud.id}-bond`)
    const t = mud.lastTurnout!
    return (
      <div className={cn("relative overflow-hidden rounded-[24px] bg-ink p-6 text-white md:p-8", className)}>
        <Chip className="bg-white/10 text-white">Your utility district</Chip>
        <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-[1.7rem] leading-tight font-extrabold tracking-tight">
              {t.votes} people decided the last {mud.short} election.
            </p>
            <p className="mt-2 text-sm text-white/70">
              {mud.short} adds {money(mud.taxRate! * 3000)} a year to a $300K home, and there's a $38.5M bond on
              your Nov 3 ballot.
            </p>
          </div>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={cn("h-16 w-2.5 rounded-full", i === 0 ? "bg-brick" : "bg-white/10")}
              />
            ))}
          </div>
        </div>
        {bond && (
          <Button variant="white" className="mt-6" onClick={() => openStory(bond)}>
            What's on the ballot <ArrowRight data-icon="inline-end" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[24px] bg-sand p-6 md:p-8", className)}>
      <Newspaper className="absolute -right-4 -bottom-6 size-44 text-sand-deep/10" strokeWidth={1.2} />
      <Chip className="bg-white/60 text-sand-deep">Every Sunday</Chip>
      <p className="mt-5 max-w-sm text-[1.7rem] leading-tight font-extrabold tracking-tight">
        Everything decided near you this week, in about four minutes.
      </p>
      <Button asChild className="mt-6">
        <Link href="/app/brief">
          Read this week's brief <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  )
}

