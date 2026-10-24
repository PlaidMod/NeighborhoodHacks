"use client"

import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"
import { cn } from "@/lib/utils"

const STEPS = ["dashboard", "weekly", "alerts", "taxes"] as const
type Step = (typeof STEPS)[number]
type Rect = { top: number; right: number; bottom: number; left: number }

const STORAGE_KEY = "showup-results-onboarding-v1"

export function ResultsOnboarding() {
  const t = useTranslations("ResultsOnboarding")
  const [step, setStep] = React.useState<number | null>(null)
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 })
  const [targetRect, setTargetRect] = React.useState<Rect | null>(null)
  const continueRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setStep(0)
    } catch {
      setStep(0)
    }
  }, [])

  React.useEffect(() => {
    if (step === null) return
    const target = document.querySelector<HTMLElement>(`[data-onboarding="${STEPS[step]}"]`)
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      const current = document.querySelector<HTMLElement>(`[data-onboarding="${STEPS[step]}"]`)
      if (!current) return setTargetRect(null)
      const r = current.getBoundingClientRect()
      setTargetRect({ top: r.top, right: r.right, bottom: r.bottom, left: r.left })
    }
    target?.scrollIntoView({ behavior: "smooth", block: "center" })
    const frame = requestAnimationFrame(measure)
    const timer = window.setTimeout(measure, 250)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [step])

  React.useEffect(() => {
    if (step !== null) continueRef.current?.focus({ preventScroll: true })
  }, [step])

  if (step === null) return null

  const close = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "done")
    } catch {
      // The guide remains usable when storage is unavailable.
    }
    setStep(null)
  }
  const next = () => step === STEPS.length - 1 ? close() : setStep(step + 1)
  const left = Math.max(0, (targetRect?.left ?? 0) - 8)
  const top = Math.max(0, (targetRect?.top ?? 0) - 8)
  const right = Math.min(viewport.width, (targetRect?.right ?? 0) + 8)
  const bottom = Math.min(viewport.height, (targetRect?.bottom ?? 0) + 8)
  const panes = targetRect
    ? [
        { left: 0, top: 0, width: viewport.width, height: top },
        { left: 0, top: bottom, width: viewport.width, height: Math.max(0, viewport.height - bottom) },
        { left: 0, top, width: left, height: Math.max(0, bottom - top) },
        { left: right, top, width: Math.max(0, viewport.width - right), height: Math.max(0, bottom - top) },
      ]
    : [{ left: 0, top: 0, width: viewport.width, height: viewport.height }]
  const stepName = STEPS[step] as Step

  return (
    <>
      {panes.map((pane, i) => (
        <div key={i} aria-hidden="true" className="fixed z-[80] bg-ink/60 backdrop-blur-[1px]" style={pane} />
      ))}
      {targetRect && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[81] rounded-[24px] border-2 border-white shadow-[0_0_0_2px_#405f83,0_0_28px_rgb(255_255_255/0.5)]"
            style={{ top, left, width: right - left, height: bottom - top }}
          />
          <button
            type="button"
            aria-label={t("continueOn", { title: t(`${stepName}.title`) })}
            onClick={next}
            className="fixed z-[82] cursor-pointer rounded-[24px] bg-transparent focus-visible:outline-4 focus-visible:outline-white"
            style={{ top, left, width: right - left, height: bottom - top }}
          />
        </>
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="results-onboarding-title"
        className="fixed right-4 bottom-4 z-[90] w-[min(500px,calc(100vw-2rem))] rounded-[28px] bg-white p-5 text-ink shadow-[0_24px_80px_rgb(9_19_37/0.3)] ring-1 ring-black/10 sm:right-6 sm:bottom-6 sm:p-6"
      >
        <p className="text-xs font-extrabold tracking-[0.14em] text-denim uppercase">
          {t("stepCount", { current: step + 1, total: STEPS.length })}
        </p>
        <h2 id="results-onboarding-title" className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          {t(`${stepName}.title`)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{t(`${stepName}.body`)}</p>
        <p className="mt-2 text-xs font-semibold text-denim">{t("clickHighlighted")}</p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <nav aria-label={t("progressLabel")} className="flex items-center gap-1.5">
            {STEPS.map((item, index) => (
              <button
                key={item}
                type="button"
                aria-label={t("goToStep", { step: index + 1 })}
                aria-current={index === step ? "step" : undefined}
                onClick={() => setStep(index)}
                className={cn(
                  "h-2.5 rounded-full transition-[width,background-color] duration-200",
                  index === step ? "w-8 bg-denim" : "w-2.5 bg-denim/20 hover:bg-denim/40",
                )}
              />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              ref={continueRef}
              onClick={next}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-denim px-5 text-sm font-bold text-white hover:bg-denim-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"
            >
              {step === STEPS.length - 1 ? t("done") : t("next")}
              {step === STEPS.length - 1 ? null : <ArrowRight aria-hidden className="size-4" />}
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={close}
                className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"
              >
                {t("skip")}
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
