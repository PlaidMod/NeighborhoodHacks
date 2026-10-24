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
import { useTranslations } from "next-intl"
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

export function Onboarding() {
  const params = useSearchParams()
  const router = useRouter()
  const t = useTranslations("Onboarding")
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
  const steps = [t("steps.address"), t("steps.aboutYou"), t("steps.ageAndName"), t("steps.stack")]

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

  function skip() {
    router.push("/app")
  }

  function advance() {
    if (step === 1) {
      setTouched(true)
      if (personas.length) {
        setTouched(false)
        setStep(2)
      }
      return
    }
    if (step === 2) {
      setTouched(true)
      if (!needsAge || age) {
        setTouched(false)
        setStep(3)
      }
    }
  }

  return (
    <div className="min-h-screen bg-canvas p-3 md:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1200px] overflow-hidden rounded-[32px] bg-surface lg:grid-cols-[380px_1fr]">
        {/* Keep the setup context short so the current step stays the focus. */}
        <aside className="relative flex flex-col justify-between bg-ink p-7 text-white md:p-9">
          <Logo light />
          <div className="my-10 lg:my-0">
            <p className="text-xs font-extrabold tracking-[0.14em] text-white/60 uppercase">ShowUp HTX</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">{t("sidebarTitle")}</h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/75">
              {t("sidebarBody")}
            </p>
          </div>
          <div className="hidden rounded-2xl bg-white/5 p-4 text-xs leading-relaxed text-white/70 lg:block">
            <Lock className="mb-2 size-4 text-white/80" />
            {t("privacy")}
          </div>
        </aside>

        {/* Step content */}
        <main id="main-content" className="flex min-h-[640px] flex-col p-6 md:p-12">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink"
            >
              <ArrowLeft className="size-4" /> {t("back")}
            </button>
          )}

          {step === 0 && (
            <div key="s0" className="rise my-auto max-w-xl">
              <p className="text-sm font-bold text-brick">{t("step", { current: 1, total: steps.length })}</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">{t("addressTitle")}</h1>
              <p className="mt-3 text-muted-foreground">{t("addressBody")}</p>
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
              <p className="text-sm font-bold text-brick">{t("step", { current: 2, total: steps.length })}</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">{t("aboutTitle")}</h1>
              <p className="mt-3 text-muted-foreground">{t("aboutBody")}</p>
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
                        <span className="block font-bold">{t(`personas.${p.id}.label`)}</span>
                        <span className={cn("block text-xs text-muted-foreground", on && "text-white/70")}>
                          {t(`personas.${p.id}.blurb`)}
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

              {touched && !personas.length && (
                <p role="alert" className="mt-5 text-sm font-medium text-brick">{t("pickPersona")}</p>
              )}
            </div>
          )}

          {step === 2 && j && (
            <div key="s2" className="rise my-auto max-w-xl">
              <p className="text-sm font-bold text-brick">{t("step", { current: 3, total: steps.length })}</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">{t("detailsTitle")}</h1>
              <p className="mt-3 text-muted-foreground">{t("detailsBody")}</p>

              {needsAge && (
                <div className="mt-8 rounded-3xl bg-white p-5 ring-1 ring-border">
                  <p className="text-sm font-bold">{t("ageTitle")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("ageBody")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[14, 15, 16, 17, 18, 19, 20].map((a) => (
                      <button
                        key={a}
                        type="button"
                        aria-pressed={age === a}
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
                  {touched && !age && <p role="alert" className="mt-3 text-sm font-medium text-brick">{t("pickAge")}</p>}
                </div>
              )}

              <div className="mt-6 max-w-sm">
                <label htmlFor="name" className="text-sm font-bold">
                  {t("nameLabel")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="mt-2 h-11 w-full rounded-full bg-white px-5 text-sm font-medium ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
                />
              </div>
            </div>
          )}

          {step === 3 && j && (
            <div key="s2" className="rise max-w-3xl">
              <p className="text-sm font-bold text-brick">{t("step", { current: 4, total: steps.length })}</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
                {t("stackTitle", { count: bodies.length, area: j.area })}
              </h1>
              <p className="mt-3 text-muted-foreground">{t("stackBody")}</p>
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
            </div>
          )}

          <div className="mt-auto pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <nav aria-label={t("stepNavLabel")} className="flex flex-wrap items-center gap-2">
                {steps.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={t("stepLabel", { step: index + 1, label })}
                    aria-current={index === step ? "step" : undefined}
                    disabled={index >= step}
                    onClick={() => setStep(index)}
                    className={cn(
                      "h-2.5 rounded-full transition-[width,background-color] duration-200 disabled:cursor-default",
                      index === step ? "w-8 bg-denim" : index < step ? "w-2.5 bg-denim/45 hover:bg-denim" : "w-2.5 bg-denim/15",
                    )}
                  />
                ))}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">{t("step", { current: step + 1, total: steps.length })}</span>
              </nav>

              <div className="ml-auto flex items-center gap-2">
                {step > 0 && step < 3 && (
                  <Button variant="outline" onClick={advance}>
                    {t("continue")} <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
                {step === 3 && (
                  <Button onClick={finish}>
                    {t("done")} <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
                {step < 3 && (
                  <button
                    type="button"
                    onClick={skip}
                    className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"
                  >
                    {t("skip")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
