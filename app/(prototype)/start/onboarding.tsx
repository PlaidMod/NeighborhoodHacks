"use client"

import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Check,
  GraduationCap,
  Home,
  KeyRound,
  Lock,
  MapPin,
  Vote,
  type LucideIcon,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { AddressForm } from "@/components/prototype/address-form"
import { BodyIcon, Logo } from "@/components/prototype/civic"
import { Button } from "@/components/ui/button"
import { KIND_LABEL, bodiesFor } from "@/lib/prototype/bodies"
import type { Persona } from "@/lib/prototype/types"
import { findJurisdiction } from "@/lib/prototype/zips"
import { PERSONAS } from "@/lib/prototype/format"
import { useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

const PERSONA_ICON: Record<Persona, LucideIcon> = {
  student: GraduationCap,
  parent: Baby,
  renter: KeyRound,
  homeowner: Home,
  voter: Vote,
}

const STEPS = ["Your address", "About you", "Your stack"]

export function Onboarding() {
  const params = useSearchParams()
  const router = useRouter()
  const { save } = useProfile()
  const initial = params.get("a") ?? ""
  const [address, setAddress] = React.useState(initial)
  const [step, setStep] = React.useState(initial && findJurisdiction(initial) ? 1 : 0)
  const [personas, setPersonas] = React.useState<Persona[]>([])
  const [age, setAge] = React.useState<number | undefined>()
  const [name, setName] = React.useState("")
  const [touched, setTouched] = React.useState(false)

  const j = address ? findJurisdiction(address) : null
  const bodies = j ? bodiesFor(j) : []
  const needsAge = personas.includes("student") || personas.includes("voter")

  function toggle(p: Persona) {
    setPersonas((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))
  }

  function finish() {
    if (!j) return
    save({
      name: name.trim() || "Neighbor",
      address,
      zip: j.zip,
      personas,
      age,
    })
    router.push("/app")
  }

  return (
    <div className="min-h-screen bg-canvas p-3 md:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1200px] overflow-hidden rounded-[32px] bg-surface lg:grid-cols-[380px_1fr]">
        {/* Progress rail */}
        <aside className="relative flex flex-col justify-between bg-ink p-7 text-white md:p-9">
          <Logo light />
          <ol className="my-10 space-y-1 lg:my-0">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors",
                  i === step ? "bg-white/10 text-white" : "text-white/50",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-bold",
                    i < step ? "bg-brick text-white" : i === step ? "bg-white text-ink" : "bg-white/10",
                  )}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <div className="hidden rounded-2xl bg-white/5 p-4 text-xs leading-relaxed text-white/70 lg:block">
            <Lock className="mb-2 size-4 text-white/80" />
            We match your address to districts, then keep only the districts. No account, no email, and no
            tracking.
          </div>
        </aside>

        {/* Step content */}
        <main id="main-content" className="flex flex-col p-6 md:p-12">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
          )}

          {step === 0 && (
            <div key="s0" className="rise my-auto max-w-xl">
              <p className="text-sm font-bold text-brick">Step 1 of 3</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Where do you live?</h1>
              <p className="mt-3 text-muted-foreground">
                Your street address decides your school district, council district, county precinct, and
                whether you're in a utility district.
              </p>
              <div className="mt-8">
                <AddressForm
                  initial={address}
                  onResolved={(a) => {
                    setAddress(a)
                    setStep(1)
                  }}
                />
              </div>
            </div>
          )}

          {step === 1 && j && (
            <div key="s1" className="rise max-w-2xl">
              <p className="text-sm font-bold text-brick">Step 2 of 3</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">What describes you?</h1>
              <p className="mt-3 text-muted-foreground">
                Pick all that apply. We'll explain each decision in terms of how it affects you.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-border">
                <MapPin className="size-3.5 text-brick" />
                {j.area} · {j.zip}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PERSONAS.map((p) => {
                  const Icon = PERSONA_ICON[p.id]
                  const on = personas.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      aria-pressed={on}
                      className={cn(
                        "group relative flex flex-col items-start gap-6 rounded-3xl bg-white p-5 text-left ring-1 ring-border transition-[transform,box-shadow,background-color,color] motion-safe:hover:-translate-y-0.5 hover:ring-denim/40",
                        on && "bg-denim text-white ring-denim hover:ring-denim",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-11 place-items-center rounded-2xl bg-denim-soft text-denim transition-colors",
                          on && "bg-white/15 text-white",
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span>
                        <span className="block font-bold">{p.label}</span>
                        <span className={cn("block text-xs text-muted-foreground", on && "text-white/70")}>
                          {p.blurb}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "absolute top-4 right-4 grid size-6 place-items-center rounded-full ring-1 ring-border",
                          on && "bg-white text-denim ring-white",
                        )}
                      >
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  )
                })}
              </div>

              {needsAge && (
                <div className="rise mt-8">
                  <p className="text-sm font-bold">How old are you?</p>
                  <p className="text-xs text-muted-foreground">
                    Texas lets you register at 17 years 10 months if you'll be 18 by Election Day.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[14, 15, 16, 17, 18, 19, 20].map((a) => (
                      <button
                        key={a}
                        onClick={() => setAge(a)}
                        className={cn(
                          "h-10 min-w-12 rounded-full bg-white px-4 text-sm font-bold ring-1 ring-border transition-colors hover:ring-denim/40",
                          age === a && "bg-ink text-white ring-ink",
                        )}
                      >
                        {a === 20 ? "20+" : a}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 max-w-sm">
                <label htmlFor="name" className="text-sm font-bold">
                  First name <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maya"
                  className="mt-2 h-11 w-full rounded-full bg-white px-5 text-sm font-medium ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
                />
              </div>

              <div className="mt-10 flex items-center gap-4">
                <Button
                  size="lg"
                  onClick={() => {
                    setTouched(true)
                    if (personas.length && (!needsAge || age)) setStep(2)
                  }}
                >
                  Show my stack <ArrowRight data-icon="inline-end" />
                </Button>
                {touched && !personas.length && (
                  <p className="text-sm font-medium text-brick">Pick at least one.</p>
                )}
                {touched && personas.length > 0 && needsAge && !age && (
                  <p className="text-sm font-medium text-brick">Choose your age.</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && j && (
            <div key="s2" className="rise max-w-3xl">
              <p className="text-sm font-bold text-brick">Step 3 of 3</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
                {bodies.length} bodies make decisions for {j.area}.
              </h1>
              <p className="mt-3 text-muted-foreground">
                Ordered from closest to home outward. Most people can name one or two.
              </p>
              <ul className="mt-8 grid gap-2.5">
                {bodies.map((b, i) => (
                  <li
                    key={b.id}
                    className="rise flex items-start gap-4 rounded-3xl bg-white p-4 ring-1 ring-border"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <BodyIcon kind={b.kind} id={b.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <p className="font-bold">{b.name}</p>
                        {b.yourSeat && (
                          <span className="text-xs font-semibold text-denim">{b.yourSeat}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{b.tagline}</p>
                    </div>
                    <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground sm:block">
                      {KIND_LABEL[b.kind]}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="sticky bottom-4 mt-8">
                <Button size="lg" onClick={finish} className="shadow-lg">
                  Open my dashboard <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
