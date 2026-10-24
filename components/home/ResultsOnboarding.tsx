"use client"

import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"

const STEPS = ["dashboard", "weekly", "alerts", "taxes"] as const
type Step = (typeof STEPS)[number]
type Rect = { top: number; right: number; bottom: number; left: number; radius: number }
type TourState = { step: number; token: string }
const STORAGE_KEY = "showup.results-onboarding.v1"

export function ResultsOnboarding() {
  const t = useTranslations("ResultsOnboarding")
  const pathname = usePathname()
  const router = useRouter()
  const [tour, setTour] = React.useState<TourState | null>(null)
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 })
  const [targetRect, setTargetRect] = React.useState<Rect | null>(null)
  const continueRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    let saved: TourState | null = null
    try {
      const value = window.sessionStorage.getItem(STORAGE_KEY)
      if (value) saved = JSON.parse(value) as TourState
    } catch {
      saved = null
    }

    const startFromResults = () => {
      const dashboard = document.querySelector<HTMLAnchorElement>('[data-onboarding="dashboard"]')
      const token = dashboard ? new URL(dashboard.href).searchParams.get("t") : null
      if (!dashboard || !token) return false
      saved = { step: 0, token }
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      } catch {
        // The guide still works during client-side navigation if storage is unavailable.
      }
      setTour(saved)
      return true
    }
    if (pathname === "/results" && !startFromResults()) {
      const observer = new MutationObserver(() => {
        if (startFromResults()) observer.disconnect()
      })
      observer.observe(document.body, { childList: true, subtree: true })
      return () => observer.disconnect()
    }
    if (pathname !== "/results") setTour(saved)
  }, [pathname])

  React.useEffect(() => {
    if (!tour) {
      setTargetRect(null)
      return
    }
    const target = document.querySelector<HTMLElement>(`[data-onboarding="${STEPS[tour.step]}"]`)
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      const current = document.querySelector<HTMLElement>(`[data-onboarding="${STEPS[tour.step]}"]`)
      if (!current) return setTargetRect(null)
      const r = current.getBoundingClientRect()
      const radiusValue = getComputedStyle(current).borderTopLeftRadius
      const parsedRadius = Number.parseFloat(radiusValue) || 0
      const radius = radiusValue.endsWith("%")
        ? Math.min(r.width, r.height) * parsedRadius / 100
        : parsedRadius
      setTargetRect({ top: r.top, right: r.right, bottom: r.bottom, left: r.left, radius })
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
  }, [pathname, tour])

  React.useEffect(() => {
    if (tour) continueRef.current?.focus({ preventScroll: true })
  }, [tour])

  if (!tour) return null

  const saveTour = (nextTour: TourState | null) => {
    try {
      if (nextTour) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextTour))
      else window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Keep the guide usable when session storage is unavailable.
    }
    setTour(nextTour)
  }
  const routeFor = (step: number) => {
    const query = `?t=${encodeURIComponent(tour.token)}`
    if (step === 0) return `/app/use${query}`
    if (step === 1) return `/weekly${query}`
    if (step === 2) return `/alerts${query}`
    return `/tax-receipt${query}`
  }
  const goToStep = (step: number) => {
    saveTour({ ...tour, step })
    router.push(routeFor(step))
  }
  const next = () => {
    if (tour.step === 0 && pathname === "/results") {
      saveTour(tour)
      window.location.assign(routeFor(0))
      return
    }
    if (tour.step === STEPS.length - 1) {
      saveTour(null)
      router.push("/?tour=complete")
      return
    }
    goToStep(tour.step + 1)
  }
  const clickHighlight = () => {
    if (tour.step === 0 && pathname === "/results") {
      const target = document.querySelector<HTMLAnchorElement>('[data-onboarding="dashboard"]')
      if (target) {
        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tour))
        } catch {
          // The dashboard route still receives the tour on client-side navigation.
        }
        window.location.assign(target.href)
        return
      }
    }
    next()
  }
  const left = Math.max(0, targetRect?.left ?? 0)
  const top = Math.max(0, targetRect?.top ?? 0)
  const right = Math.min(viewport.width, targetRect?.right ?? 0)
  const bottom = Math.min(viewport.height, targetRect?.bottom ?? 0)
  const stepName = STEPS[tour.step] as Step
  const spotlightRadius = Math.min(targetRect?.radius ?? 0, (bottom - top) / 2, (right - left) / 2)

  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[80] size-full backdrop-blur-[1px]"
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask
            id="results-onboarding-spotlight-mask"
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
          >
            <rect width={viewport.width} height={viewport.height} fill="white" />
            {targetRect && (
              <rect
                x={left}
                y={top}
                width={right - left}
                height={bottom - top}
                rx={spotlightRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width={viewport.width}
          height={viewport.height}
          fill="var(--ink)"
          fillOpacity="0.6"
          mask="url(#results-onboarding-spotlight-mask)"
        />
      </svg>
      {targetRect && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[81] rounded-full border-2 border-white shadow-[0_0_0_2px_#405f83,0_0_28px_rgb(255_255_255/0.5)]"
            style={{ top, left, width: right - left, height: bottom - top, borderRadius: spotlightRadius }}
          />
          <button
            type="button"
            aria-label={t("continueOn", { title: t(`${stepName}.title`) })}
            onClick={clickHighlight}
            className="fixed z-[82] cursor-pointer bg-transparent focus-visible:outline-4 focus-visible:outline-white"
            style={{ top, left, width: right - left, height: bottom - top, borderRadius: spotlightRadius }}
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
          {t("stepCount", { current: tour.step + 1, total: STEPS.length })}
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
                aria-current={index === tour.step ? "step" : undefined}
                onClick={() => goToStep(index)}
                className={cn(
                  "h-2.5 rounded-full transition-[width,background-color] duration-200",
                  index === tour.step ? "w-8 bg-denim" : "w-2.5 bg-denim/20 hover:bg-denim/40",
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
              {t("next")}
              <ArrowRight aria-hidden className="size-4" />
            </button>
            {tour.step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => saveTour(null)}
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
