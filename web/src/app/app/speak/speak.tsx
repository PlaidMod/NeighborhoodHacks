"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCopy,
  Clock,
  Lightbulb,
  Mail,
  Pause,
  Play,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { BodyIcon, Chip } from "@/components/civic"
import { Button } from "@/components/ui/button"
import type { Update } from "@/lib/data/types"
import { whyFor } from "@/lib/data/updates"
import { fmtDateTime, relDayLower } from "@/lib/format"
import { useMarkDone, useNow, useProfile } from "@/lib/profile"
import { cn } from "@/lib/utils"

type Stance = "support" | "oppose" | "change" | "delay"

const STANCES: { id: Stance; label: string; icon: LucideIcon; line: string; ask: string }[] = [
  { id: "support", label: "Support it", icon: ThumbsUp, line: "I'm here to support this proposal.", ask: "Vote yes and fund it fully" },
  { id: "oppose", label: "Oppose it", icon: ThumbsDown, line: "I'm asking you to vote no.", ask: "Vote no on this item" },
  { id: "change", label: "Ask for changes", icon: Wrench, line: "I'm asking you to change this proposal before you vote.", ask: "Add a student seat on the planning committee" },
  { id: "delay", label: "Ask for a delay", icon: Clock, line: "I'm asking you to delay this vote.", ask: "Wait until families have had a public meeting on it" },
]

const STEPS = ["Understand it", "Your take", "Your draft", "Practice"]
const WPM = 140

export function Speak() {
  const params = useSearchParams()
  const router = useRouter()
  const { updates, bodies, profile, jurisdiction } = useProfile()
  const markDone = useMarkDone()
  const now = useNow()
  const items = updates
    .filter((u) => u.comment && +new Date(u.comment.deadline) > now)
    .sort((a, b) => +new Date(a.comment!.deadline) - +new Date(b.comment!.deadline))
  const itemId = params.get("item")
  const item = items.find((u) => u.id === itemId) ?? items[0]

  const [step, setStep] = React.useState(0)
  const [stance, setStance] = React.useState<Stance | null>(null)
  const isStudent = profile.personas.includes("student")
  const [who, setWho] = React.useState(
    isStudent ? `a high school student` : profile.personas.includes("parent") ? "a parent" : "a resident",
  )
  const [affect, setAffect] = React.useState("")
  const [ask, setAsk] = React.useState("")
  const [draft, setDraft] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  // Start over when a different agenda item is picked
  const [shownId, setShownId] = React.useState(item?.id)
  if (item?.id !== shownId) {
    setShownId(item?.id)
    setStep(0)
    setStance(null)
    setAffect("")
    setAsk("")
  }

  if (!item) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <p className="text-xl font-bold">No open comment windows right now</p>
          <p className="mt-1 text-muted-foreground">We'll text you when a new agenda opens for comment.</p>
        </div>
      </div>
    )
  }
  const body = bodies.find((b) => b.id === item.bodyId)!
  const minutes = item.comment!.minutes

  function compose() {
    const s = STANCES.find((x) => x.id === stance)!
    const name = profile.name && profile.name !== "Neighbor" ? profile.name : "[your name]"
    return [
      `Good evening. My name is ${name}, and I'm ${who} in ${jurisdiction.area}.`,
      `I'm speaking on the agenda item “${item.title}.” ${s.line}`,
      affect.trim(),
      ask.trim() ? `My ask is simple: ${ask.trim().replace(/\.$/, "")}.` : "",
      "Thank you for listening, and for considering the people this decision affects most.",
    ]
      .filter(Boolean)
      .join("\n\n")
  }

  function next() {
    setError(null)
    if (step === 1) {
      if (!stance) return setError("Pick where you stand.")
      if (affect.trim().length < 20) return setError("Add a sentence or two about how this affects you.")
      setDraft(compose())
      markDone("comment")
    }
    setStep((s) => Math.min(s + 1, 3))
  }

  return (
    <div className="grid gap-6 pt-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      {/* Item picker */}
      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <div>
          <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em]">Speak up</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn what you think into a clear {minutes}-minute public comment.
          </p>
        </div>
        <div className="rounded-[24px] bg-white p-3">
          <p className="px-2 pt-1 pb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Open for comment
          </p>
          <ul className="space-y-1">
            {items.map((u) => {
              const b = bodies.find((x) => x.id === u.bodyId)!
              const on = u.id === item.id
              return (
                <li key={u.id}>
                  <button
                    onClick={() => router.replace(`/app/speak?item=${u.id}`, { scroll: false })}
                    className={cn(
                      "flex w-full gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-muted",
                      on && "bg-denim text-white hover:bg-denim",
                    )}
                  >
                    <BodyIcon kind={b.kind} className={cn("size-9 rounded-xl", on && "bg-white/15 text-white")} />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-bold">{u.title}</span>
                      <span className={cn("text-xs", on ? "text-white/70" : "text-muted-foreground")}>
                        {b.short} · sign up by {relDayLower(u.comment!.deadline)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      {/* Workspace */}
      <section className="min-w-0 rounded-[28px] bg-white">
        {/* Stepper */}
        <div className="flex gap-1 overflow-x-auto border-b border-line p-3">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => i <= step && setStep(i)}
              disabled={i > step}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors",
                i === step && "bg-ink text-white",
                i < step && "hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[11px] font-bold ring-1 ring-current/30",
                  i < step && "bg-denim text-white ring-denim",
                )}
              >
                {i < step ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-10">
          {step === 0 && <Understand u={item} />}

          {step === 1 && (
            <div className="rise max-w-2xl space-y-8">
              <div>
                <p className="text-sm font-bold">Where do you stand?</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {STANCES.map((s) => (
                    <button
                      key={s.id}
                      aria-pressed={stance === s.id}
                      onClick={() => {
                        setStance(s.id)
                        setError(null)
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl p-4 text-left font-semibold ring-1 ring-border transition-[box-shadow,background-color,color] hover:ring-denim/40",
                        stance === s.id && "bg-denim-soft ring-2 ring-denim",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 place-items-center rounded-xl bg-muted",
                          stance === s.id && "bg-denim text-white",
                        )}
                      >
                        <s.icon className="size-4" />
                      </span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Who are you?" hint="Board members listen for who's affected. Keep it short.">
                <input
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  className="h-12 w-full rounded-2xl bg-surface px-4 font-medium ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
                />
              </Field>

              <Field
                label="How does this affect you?"
                hint="One real example beats three statistics. What would change in your day?"
              >
                <textarea
                  value={affect}
                  onChange={(e) => {
                    setAffect(e.target.value)
                    setError(null)
                  }}
                  rows={4}
                  placeholder={
                    isStudent
                      ? "My school is one of the nine on the list. I walk there in 10 minutes. If it closes, I'd need two buses and would miss my first-period AP class..."
                      : "Our street floods every time it rains more than two inches..."
                  }
                  className="w-full resize-none rounded-2xl bg-surface p-4 leading-relaxed ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
                />
              </Field>

              <Field label="What do you want them to do?" hint="One specific ask. Make it something they can vote on.">
                <input
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  placeholder={STANCES.find((s) => s.id === stance)?.ask ?? "Vote no on this item"}
                  className="h-12 w-full rounded-2xl bg-surface px-4 font-medium ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
                />
              </Field>
            </div>
          )}

          {step === 2 && <Draft draft={draft} setDraft={setDraft} minutes={minutes} />}

          {step === 3 && <Practice draft={draft} u={item} minutes={minutes} bodyName={body.name} />}

          {/* Nav */}
          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft data-icon="inline-start" /> Back
              </Button>
            )}
            {step < 3 && (
              <Button onClick={next}>
                {step === 0 ? "I get it, next" : step === 1 ? "Write my draft" : "Practice it"}
                <ArrowRight data-icon="inline-end" />
              </Button>
            )}
            {error && <p className="text-sm font-semibold text-brick">{error}</p>}
            <p className="ml-auto text-xs text-muted-foreground">
              Sign-up closes {fmtDateTime(item.comment!.deadline)}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <span className="mt-0.5 mb-3 block text-xs text-muted-foreground">{hint}</span>
      {children}
    </label>
  )
}

function Understand({ u }: { u: Update }) {
  const { bodies, profile } = useProfile()
  const b = bodies.find((x) => x.id === u.bodyId)!
  return (
    <div className="rise">
      <div className="flex items-center gap-3">
        <BodyIcon kind={b.kind} />
        <div>
          <p className="text-sm font-bold">{b.name}</p>
          <p className="text-xs text-muted-foreground">{fmtDateTime(u.date)}</p>
        </div>
      </div>
      <h2 className="mt-6 max-w-3xl text-[2rem] leading-[1.1] font-extrabold tracking-tight">{u.title}</h2>
      <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-muted-foreground">{u.summary}</p>

      {u.numbers && (
        <div className="mt-6 grid max-w-2xl grid-cols-3 gap-3">
          {u.numbers.map((n) => (
            <div key={n.label} className="rounded-2xl bg-surface p-4">
              <p className="text-2xl font-extrabold tracking-tight">{n.value}</p>
              <p className="text-xs text-muted-foreground">{n.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid max-w-3xl gap-3 md:grid-cols-2">
        <div className="rounded-3xl bg-denim p-5 text-white">
          <p className="text-xs font-bold tracking-wider text-white/60 uppercase">For you</p>
          <p className="mt-2 font-bold">{whyFor(u, profile.personas)}</p>
        </div>
        <div className="rounded-3xl bg-sand p-5">
          <p className="text-xs font-bold tracking-wider text-sand-deep uppercase">Good to know</p>
          <p className="mt-2 text-sm leading-relaxed">
            Board members can't respond during public comment, but your comment goes into the official record.
            {b.id === "hisd" && " HISD's board is appointed, so comment is one of the few direct ways to be heard."}
          </p>
        </div>
      </div>
      {u.detail && (
        <div className="mt-6 max-w-2xl space-y-3 text-[0.95rem] leading-relaxed">
          {u.detail.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function Draft({
  draft,
  setDraft,
  minutes,
}: {
  draft: string
  setDraft: (s: string) => void
  minutes: number
}) {
  const words = draft.trim().split(/\s+/).filter(Boolean).length
  const secs = Math.round((words / WPM) * 60)
  const limit = minutes * 60
  const pct = Math.min(100, (secs / limit) * 100)
  const over = secs > limit

  return (
    <div className="rise grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <p className="text-sm font-bold">Your comment</p>
        <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
          It's yours. Edit it until it sounds like you.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={14}
          className="w-full resize-none rounded-3xl bg-surface p-6 text-[1.02rem] leading-[1.75] ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
        />
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={cn(over ? "text-brick" : "text-muted-foreground")}>
              {words} words · about {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")} spoken
            </span>
            <span className="text-muted-foreground">{minutes}:00 limit</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-[width,background-color]", over ? "bg-brick" : "bg-denim")}
              style={{ width: `${pct}%` }}
            />
          </div>
          {over && <p className="mt-2 text-xs font-semibold text-brick">Trim it down. They'll cut your mic at {minutes}:00.</p>}
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-3xl bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Lightbulb className="size-4 text-brick" /> What works
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Say your name and neighborhood first",
              "Tell one specific story",
              "Make one clear ask they can vote on",
              "Stay calm and respectful, even if you're upset",
              "Bring a printed copy to hand to the clerk",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-denim" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            navigator.clipboard?.writeText(draft)
            toast.success("Comment copied")
          }}
        >
          <ClipboardCopy data-icon="inline-start" /> Copy text
        </Button>
      </div>
    </div>
  )
}

function Practice({ draft, u, minutes, bodyName }: { draft: string; u: Update; minutes: number; bodyName: string }) {
  const limit = minutes * 60
  const [left, setLeft] = React.useState(limit)
  const [running, setRunning] = React.useState(false)
  const markDone = useMarkDone()

  const active = running && left > 0

  React.useEffect(() => {
    if (!active) return
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => clearInterval(t)
  }, [active])

  const r = 88
  const c = 2 * Math.PI * r
  const frac = left / limit
  const warn = left <= 20

  return (
    <div className="rise grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col items-center rounded-[28px] bg-ink p-6 text-white">
        <p className="flex items-center gap-2 text-sm font-bold text-white/70">
          <Timer className="size-4" /> Practice timer
        </p>
        <div className="relative mt-4 size-[200px]">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90">
            <circle cx="100" cy="100" r={r} fill="none" stroke="white" strokeOpacity=".1" strokeWidth="12" />
            <circle
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={warn ? "var(--brick)" : "var(--mist)"}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - frac)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <p className="absolute inset-0 grid place-items-center text-5xl font-extrabold tracking-tight tabular">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              if (left === 0) setLeft(limit)
              setRunning(!active)
              markDone("practice")
            }}
            className="grid size-14 place-items-center rounded-full bg-white text-ink transition-transform motion-safe:hover:scale-105"
            aria-label={active ? "Pause" : "Start"}
          >
            {active ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
          </button>
          <button
            onClick={() => {
              setRunning(false)
              setLeft(limit)
            }}
            className="grid size-14 place-items-center rounded-full bg-brick text-white transition-transform motion-safe:hover:scale-105"
            aria-label="Reset"
          >
            <RotateCcw className="size-5" />
          </button>
        </div>
        {left === 0 && <p className="mt-4 text-sm font-semibold text-brick-soft">Time. That's where they'd stop you.</p>}
      </div>

      <div>
        <div className="max-h-[300px] overflow-y-auto rounded-3xl bg-surface p-6 text-[1.15rem] leading-[1.8] font-medium whitespace-pre-wrap">
          {draft}
        </div>
        <div className="mt-4 rounded-3xl bg-denim-soft p-5">
          <p className="font-bold text-denim-deep">Sign up to speak at {bodyName}</p>
          <p className="mt-1 text-sm text-denim-deep/80">{u.comment!.howTo}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="ink">Deadline {fmtDateTime(u.comment!.deadline)}</Chip>
            <Chip tone="outline">Meeting {fmtDateTime(u.date)}</Chip>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <a href={u.source} target="_blank" rel="noreferrer">
                Go to sign-up page <ArrowRight data-icon="inline-end" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`mailto:?subject=${encodeURIComponent(`Public comment: ${u.title}`)}&body=${encodeURIComponent(draft)}`}>
                <Mail data-icon="inline-start" /> Send as written comment
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
