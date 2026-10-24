"use client"

import { ArrowUpRight, CalendarCheck2, CircleCheck, Flag, MapPinned, Vote } from "lucide-react"
import * as React from "react"
import { BodyIcon, Chip, Panel, SectionTitle } from "@/components/prototype/civic"
import { useStory } from "@/components/prototype/story-sheet"
import { Button } from "@/components/ui/button"
import { ELECTION } from "@/lib/prototype/updates"
import { daysFromNow, fmtDate } from "@/lib/prototype/format"
import { useMarkDone, useProfile } from "@/lib/prototype/profile"
import { localBallotUpdates } from "@/lib/prototype/vote"
import { cn } from "@/lib/utils"

/** The next uniform election after November: first Saturday in May. */
const MAY = { name: "May 1, 2027 local elections", day: "2027-05-01T07:00:00", registerBy: "2027-04-01T23:59:00" }

function addMonths(d: Date, months: number) {
  const t = new Date(d)
  t.setMonth(t.getMonth() + months)
  return t
}

type Result =
  | { kind: "vote-now"; eighteen: Date }
  | { kind: "register-now"; eighteen: Date; canRegister: Date }
  | { kind: "wait"; eighteen: Date; canRegister: Date }

function check(birth: Date): Result {
  const now = new Date()
  const eighteen = addMonths(birth, 18 * 12)
  const canRegister = addMonths(birth, 17 * 12 + 10)
  if (eighteen <= new Date(ELECTION.day)) return { kind: "vote-now", eighteen }
  if (canRegister <= now) return { kind: "register-now", eighteen, canRegister }
  return { kind: "wait", eighteen, canRegister }
}

const fmtLong = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

export default function VotePage() {
  const { profile, patch, updates, bodies, jurisdiction } = useProfile()
  const markDone = useMarkDone()
  const openStory = useStory()
  const [birth, setBirth] = React.useState(profile.birthdate ?? "")
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<Result | null>(() =>
    profile.birthdate ? check(new Date(profile.birthdate + "T12:00:00")) : null,
  )

  const ballot = localBallotUpdates(updates, bodies)
  const harris = jurisdiction.county === "harris"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!birth) return setError("Enter your date of birth.")
    const d = new Date(birth + "T12:00:00")
    if (isNaN(+d) || d > new Date()) return setError("That date doesn't look right.")
    setError(null)
    setResult(check(d))
    patch({ birthdate: birth })
    markDone("registration")
  }

  return (
    <div className="pt-4">
      <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em]">Vote</h1>
      <p className="mt-1 text-[0.95rem] text-muted-foreground">
        When you can register, what's on your ballot, and where to go.
      </p>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Eligibility */}
        <section data-onboarding="voteMain" className="relative overflow-hidden rounded-[28px] bg-brick p-5 text-white md:p-9">
          <Flag className="absolute -right-8 -bottom-10 size-64 text-white/[0.07]" strokeWidth={1} />
          <Chip className="relative bg-white/15 text-white">Eligibility check</Chip>
          <h2 className="relative mt-4 max-w-lg text-[1.9rem] leading-[1.1] font-extrabold tracking-tight">
            In Texas you can register at 17 years and 10 months.
          </h2>
          <p className="relative mt-2 max-w-lg text-sm text-white/75">
            You need to be 18 by Election Day to vote. Your birthday stays on this device.
          </p>
          <form onSubmit={submit} className="relative mt-6 flex max-w-md flex-wrap gap-2">
            <input
              type="date"
              value={birth}
              onChange={(e) => {
                setBirth(e.target.value)
                setError(null)
              }}
              aria-label="Date of birth"
              className="h-12 min-w-0 flex-1 rounded-full bg-white px-5 font-semibold text-ink outline-none focus:ring-2 focus:ring-white/60"
            />
            <Button type="submit" variant="ink" size="lg">
              Check
            </Button>
          </form>
          {error && <p className="relative mt-2 text-sm font-semibold text-white">{error}</p>}

          {result && <ResultView r={result} />}
        </section>

        {/* Election card */}
        <section className="flex flex-col gap-4">
          <div className="rounded-[28px] bg-ink p-5 text-white">
            <p className="text-sm font-bold text-white/60">Next election</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">Tuesday, November 3</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {[
                { l: "Early voting", v: `${fmtDate(ELECTION.earlyStart)}–${new Date(ELECTION.earlyEnd).getDate()}` },
                { l: "Mail apps due", v: fmtDate(ELECTION.mailApplyBy) },
                { l: "Days left", v: String(Math.max(0, daysFromNow(ELECTION.day))) },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl bg-white/10 p-3">
                  <p className="text-lg font-extrabold">{x.v}</p>
                  <p className="text-[11px] text-white/60">{x.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="white">
                <a href={harris ? "https://www.harrisvotes.com" : "https://www.fortbendcountytx.gov/elections"} target="_blank" rel="noreferrer">
                  <MapPinned data-icon="inline-start" /> Find a polling place
                </a>
              </Button>
              <Button asChild variant="ink" className="bg-white/10 hover:bg-white/15">
                <a href="https://teamrv-mvp.sos.texas.gov/MVP/mvp.do" target="_blank" rel="noreferrer">
                  Am I registered? <ArrowUpRight data-icon="inline-end" />
                </a>
              </Button>
            </div>
          </div>
          <p className="px-1 text-sm text-muted-foreground">
            Bring a Texas driver's license, passport, or state ID (student IDs don't count). Texas high schools must
            also offer registration forms twice a year.
          </p>
        </section>
      </div>

      {/* Ballot */}
      <Panel className="mt-4">
        <SectionTitle>Local items on your ballot</SectionTitle>
        {ballot.length === 0 && (
          <p className="rounded-3xl bg-surface p-5 text-sm text-muted-foreground">
            No verified local ballot items are listed yet. Check your full ballot on the county elections site.
          </p>
        )}
        <ul className="grid gap-3 md:grid-cols-2">
          {ballot.map((u) => {
            const b = bodies.find((x) => x.id === u.bodyId)!
            return (
              <li key={u.id}>
                <button
                  onClick={() => openStory(u)}
                  className="group flex w-full items-start gap-4 rounded-3xl bg-surface p-5 text-left transition-colors hover:bg-muted"
                >
                  <BodyIcon kind={b.kind} id={b.id} />
                  <span className="min-w-0">
                    <span className="block font-bold group-hover:text-denim">{u.title}</span>
                    <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{u.summary}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Your full ballot also includes state and federal races. Preview it on your county elections site.
        </p>
      </Panel>
    </div>
  )
}

function ResultView({ r }: { r: Result }) {
  const today = new Date()
  const target = r.kind === "vote-now" ? new Date(ELECTION.day) : new Date(MAY.day)
  const marks: { d: Date; label: string; icon: React.ElementType }[] =
    r.kind === "vote-now"
      ? [
          { d: today, label: "Today", icon: CircleCheck },
          { d: new Date(ELECTION.earlyStart), label: "Early voting", icon: CalendarCheck2 },
          { d: target, label: "Election Day", icon: Vote },
        ]
      : [
          { d: today, label: "Today", icon: CircleCheck },
          ...(r.kind === "wait" ? [{ d: r.canRegister, label: "Can register", icon: CalendarCheck2 }] : []),
          { d: r.eighteen, label: "Turn 18", icon: Flag },
          { d: new Date(MAY.day), label: "May election", icon: Vote },
        ]
  const sorted = marks.sort((a, b) => +a.d - +b.d)
  const span = +sorted[sorted.length - 1].d - +sorted[0].d || 1

  const headline =
    r.kind === "vote-now"
      ? "You're old enough to vote on November 3."
      : r.kind === "register-now"
        ? "You can register today."
        : `You can register on ${fmtLong(r.canRegister)}.`
  const body =
    r.kind === "vote-now"
      ? `Registration for this election closed ${fmtLong(ELECTION.registerBy)}. If you registered, you're set. If not, register now for May.`
      : r.kind === "register-now"
        ? `You'll be 18 on ${fmtLong(r.eighteen)}, after Nov 3. Register now and you're ready for the ${MAY.name} (register by ${fmtDate(MAY.registerBy)}).`
        : `You'll turn 18 on ${fmtLong(r.eighteen)}. We'll text you when your registration window opens if you turn on alerts.`

  return (
    <div className="rise relative mt-6 rounded-3xl bg-white p-6 text-ink">
      <p className="text-xl font-extrabold tracking-tight">{headline}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <div className="relative mt-8 mb-2 h-1.5 rounded-full bg-muted">
        {sorted.map((m, i) => {
          const left = ((+m.d - +sorted[0].d) / span) * 100
          const Icon = m.icon
          return (
            <div
              key={m.label}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%` }}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full ring-4 ring-white",
                  i === 0 ? "bg-ink text-white" : "bg-brick text-white",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span
                className={cn(
                  "absolute top-10 w-24 text-center text-[11px] leading-tight font-bold",
                  i === 0 ? "left-0 -translate-x-[12px] text-left" : i === sorted.length - 1 ? "right-0 translate-x-[12px] text-right" : "left-1/2 -translate-x-1/2",
                )}
              >
                {m.label}
                <span className="block font-medium text-muted-foreground">{fmtDate(m.d.toISOString())}</span>
              </span>
            </div>
          )
        })}
      </div>
      <div className="h-12" />
      {r.kind !== "wait" && (
        <Button asChild className="mt-2">
          <a href="https://www.votetexas.gov/register-to-vote/" target="_blank" rel="noreferrer">
            How to register <ArrowUpRight data-icon="inline-end" />
          </a>
        </Button>
      )}
    </div>
  )
}
