"use client"

import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"

// The walkthrough starts on the dashboard when a reader opens it from their results
// (/app/use?…&onboarding=1&step=1). Steps are numbered from 1, as the reader sees them.
const STEPS = [
  { target: "dashboardOverview", page: "/app", copy: "home" },
  { target: "timelineMain", page: "/app/timeline", copy: "timeline" },
  { target: "briefMain", page: "/app/brief", copy: "brief" },
  { target: "districtsMain", page: "/app/districts", copy: "districts" },
  { target: "speakMain", page: "/app/speak", copy: "speak" },
  { target: "voteMain", page: "/app/vote", copy: "vote" },
  { target: "alertsMain", page: "/app/alerts", copy: "alerts" },
] as const
const stepAt = (step: number) => STEPS[step - 1]!
const validStep = (step: unknown): step is number => Number.isInteger(step) && (step as number) >= 1 && (step as number) <= STEPS.length

type TourState = { step: number }
type Rect = { top: number; right: number; bottom: number; left: number; radius: number }
const STORAGE_KEY = "showup.app-onboarding-tour.v1"

export function AppOnboardingTour() {
  const t = useTranslations("AppOnboardingTour")
  const pathname = usePathname()
  const router = useRouter()
  const [tour, setTour] = React.useState<TourState | null>(null)
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 })
  const [targetRect, setTargetRect] = React.useState<Rect | null>(null)
  const nextRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("onboarding") === "1") {
      const requestedStep = Number(params.get("step"))
      const saved: TourState = { step: validStep(requestedStep) ? requestedStep : 1 }
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      } catch {
        // The tour can still run for this visit if session storage is unavailable.
      }
      setTour(saved)
      router.replace(pathname, { scroll: false })
      return
    }

    try {
      const value = window.sessionStorage.getItem(STORAGE_KEY)
      if (value) {
        const parsed = JSON.parse(value) as Partial<TourState>
        if (validStep(parsed.step)) {
          setTour({ step: parsed.step })
          return
        }
      }
    } catch {
      // Start a fresh tour when stored progress is unavailable or invalid.
    }
    setTour(null)
  }, [pathname, router])

  React.useEffect(() => {
    if (!tour) {
      setTargetRect(null)
      return
    }
    setTargetRect(null)
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      const target = document.querySelector<HTMLElement>(`[data-onboarding="${stepAt(tour.step).target}"]`)
      if (!target) {
        setTargetRect(null)
        return
      }
      const r = target.getBoundingClientRect()
      const radiusValue = getComputedStyle(target).borderTopLeftRadius
      const parsedRadius = Number.parseFloat(radiusValue) || 0
      const radius = radiusValue.endsWith("%")
        ? Math.min(r.width, r.height) * parsedRadius / 100
        : parsedRadius
      setTargetRect({ top: r.top, right: r.right, bottom: r.bottom, left: r.left, radius })
    }
    const target = document.querySelector<HTMLElement>(`[data-onboarding="${stepAt(tour.step).target}"]`)
    target?.scrollIntoView({ behavior: "smooth", block: "center" })
    const frame = requestAnimationFrame(measure)
    const timer = window.setTimeout(measure, 250)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    const main = document.querySelector("main#main-content, main#main")
    const observer = main ? new MutationObserver(measure) : null
    if (main) observer?.observe(main, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
      observer?.disconnect()
    }
  }, [pathname, tour])

  React.useEffect(() => {
    if (tour) nextRef.current?.focus({ preventScroll: true })
  }, [tour, pathname])

  if (!tour) return null

  const saveTour = (next: TourState | null) => {
    try {
      if (next) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Keep the tour usable when session storage is unavailable.
    }
    setTour(next)
  }
  const goToStep = (step: number) => {
    saveTour({ step })
    if (stepAt(step).page !== pathname) router.push(stepAt(step).page)
  }
  const last = tour.step === STEPS.length
  const next = () => {
    if (last) {
      saveTour(null)
      return
    }
    goToStep(tour.step + 1)
  }

  const left = Math.max(0, targetRect?.left ?? 0)
  const top = Math.max(0, targetRect?.top ?? 0)
  const right = Math.min(viewport.width, targetRect?.right ?? 0)
  const bottom = Math.min(viewport.height, targetRect?.bottom ?? 0)
  const stepName = stepAt(tour.step).copy
  const radius = Math.min(targetRect?.radius ?? 0, (bottom - top) / 2, (right - left) / 2)

  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[80] size-full"
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="app-onboarding-tour-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <rect width={viewport.width} height={viewport.height} fill="white" />
            {targetRect && <rect x={left} y={top} width={right - left} height={bottom - top} rx={radius} fill="black" />}
          </mask>
        </defs>
        <rect width={viewport.width} height={viewport.height} fill="var(--ink)" fillOpacity="0.6" mask="url(#app-onboarding-tour-mask)" />
      </svg>

      {targetRect && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[81] rounded-full border-2 border-white shadow-[0_0_0_2px_#405f83,0_0_28px_rgb(255_255_255/0.5)]"
            style={{ top, left, width: right - left, height: bottom - top, borderRadius: radius }}
          />
          <button
            type="button"
            aria-label={t("continueOn", { title: t(`${stepName}.title`) })}
            onClick={next}
            className="fixed z-[82] cursor-pointer bg-transparent focus-visible:outline-4 focus-visible:outline-white"
            style={{ top, left, width: right - left, height: bottom - top, borderRadius: radius }}
          />
        </>
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-onboarding-tour-title"
        className="fixed right-4 bottom-4 z-[90] w-[min(500px,calc(100vw-2rem))] rounded-[28px] bg-white p-5 text-ink shadow-[0_24px_80px_rgb(9_19_37/0.3)] ring-1 ring-black/10 sm:right-6 sm:bottom-6 sm:p-6"
      >
        <p className="text-xs font-extrabold tracking-[0.14em] text-denim uppercase">
          {t("stepCount", { current: tour.step, total: STEPS.length })}
        </p>
        <h2 id="app-onboarding-tour-title" className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          {t(`${stepName}.title`)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{t(`${stepName}.body`)}</p>
        <p className="mt-2 text-xs font-semibold text-denim">{t("clickHighlighted")}</p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <nav aria-label={t("progressLabel")} className="flex items-center gap-1.5">
            {STEPS.map((item, index) => {
              const step = index + 1
              const isCurrent = step === tour.step
              return (
              <button
                key={item.target}
                type="button"
                aria-label={t("goToStep", { step })}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => goToStep(step)}
                className={cn(
                  "h-2.5 rounded-full transition-[width,background-color] duration-200",
                  isCurrent ? "w-8 bg-denim" : "w-2.5 bg-denim/20 hover:bg-denim/40",
                )}
              />
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              ref={nextRef}
              onClick={next}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-denim px-5 text-sm font-bold text-white hover:bg-denim-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"
            >
              {last ? t("done") : t("next")}
              {!last && <ArrowRight aria-hidden className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => saveTour(null)}
              className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"
            >
              {t("skip")}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
