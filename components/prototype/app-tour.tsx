"use client"

import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"

const TOUR_STEPS = [
  { route: "/app", targets: ["home-overview"], title: "homeTitle", body: "homeBody" },
  { route: "/app/brief", targets: ["brief-articles"], title: "briefTitle", body: "briefBody" },
  { route: "/app/timeline", targets: ["timeline-topics"], title: "timelineTitle", body: "timelineBody" },
  { route: "/app/speak", targets: ["speak-items", "speak-heading"], title: "speakTitle", body: "speakBody" },
] as const

type Spotlight = { top: number; right: number; bottom: number; left: number }

function tourUrl(index: number) {
  return `${TOUR_STEPS[index]!.route}?tour=1&tourStep=${index}`
}

export function AppTour() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const t = useTranslations("AppTour")
  const dialog = React.useRef<HTMLElement>(null)
  const nextButton = React.useRef<HTMLButtonElement>(null)
  const requestedStep = Number(params.get("tourStep"))
  const stepIndex = Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep < TOUR_STEPS.length ? requestedStep : 0
  const step = TOUR_STEPS[stepIndex]!
  const active = params.get("tour") === "1"
  const onStepRoute = pathname === step.route
  const remainingParams = new URLSearchParams(params.toString())
  remainingParams.delete("tour")
  remainingParams.delete("tourStep")
  const remainingQuery = remainingParams.toString()
  const exitUrl = `${pathname}${remainingQuery ? `?${remainingQuery}` : ""}`
  const [spotlight, setSpotlight] = React.useState<Spotlight | null>(null)
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 })

  React.useEffect(() => {
    if (!active || !onStepRoute) {
      setSpotlight(null)
      return
    }

    const findTarget = () => step.targets
      .map((name) => document.querySelector<HTMLElement>(`[data-tour="${name}"]`))
      .find((element): element is HTMLElement => !!element)

    let target = findTarget()
    let observer: ResizeObserver | undefined
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      target = findTarget()
      if (!target) {
        setSpotlight(null)
        return
      }
      const rect = target.getBoundingClientRect()
      setSpotlight({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left })
    }

    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center", inline: "nearest" })
    const frame = window.requestAnimationFrame(measure)
    const later = window.setTimeout(measure, 300)
    if (typeof ResizeObserver !== "undefined" && target) {
      observer = new ResizeObserver(measure)
      observer.observe(target)
    }
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    const mutations = new MutationObserver(measure)
    mutations.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(later)
      observer?.disconnect()
      mutations.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [active, onStepRoute, step])

  React.useEffect(() => {
    if (!active) return
    nextButton.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(exitUrl, { scroll: false })
      if (event.key === "Tab") {
        const focusable = dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled])")
        if (!focusable?.length) return
        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [active, exitUrl, router, stepIndex])

  if (!active) return null

  const viewportWidth = viewport.width
  const viewportHeight = viewport.height
  const x1 = Math.max(0, (spotlight?.left ?? 0) - 8)
  const y1 = Math.max(0, (spotlight?.top ?? 0) - 8)
  const x2 = Math.min(viewportWidth, (spotlight?.right ?? 0) + 8)
  const y2 = Math.min(viewportHeight, (spotlight?.bottom ?? 0) + 8)
  const panes = spotlight
    ? [
        { left: 0, top: 0, width: viewportWidth, height: y1 },
        { left: 0, top: y2, width: viewportWidth, height: Math.max(0, viewportHeight - y2) },
        { left: 0, top: y1, width: x1, height: Math.max(0, y2 - y1) },
        { left: x2, top: y1, width: Math.max(0, viewportWidth - x2), height: Math.max(0, y2 - y1) },
      ]
    : [{ left: 0, top: 0, width: viewportWidth, height: viewportHeight }]

  function leaveTour() {
    router.replace(exitUrl, { scroll: false })
  }

  function goTo(index: number) {
    router.push(tourUrl(index), { scroll: false })
  }

  function next() {
    if (stepIndex === TOUR_STEPS.length - 1) leaveTour()
    else goTo(stepIndex + 1)
  }

  return (
    <>
      {panes.map((pane, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="fixed z-[80] bg-ink/55 backdrop-blur-[1px]"
          style={pane}
        />
      ))}
      {spotlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[81] rounded-[24px] border-2 border-white shadow-[0_0_0_2px_#405f83,0_0_28px_rgb(255_255_255/0.5)]"
          style={{ top: y1, left: x1, width: x2 - x1, height: y2 - y1 }}
        />
      )}

      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-tour-title"
        className="fixed right-4 bottom-4 z-[90] w-[min(500px,calc(100vw-2rem))] rounded-[28px] bg-white p-5 text-ink shadow-[0_24px_80px_rgb(9_19_37/0.3)] ring-1 ring-black/10 sm:right-6 sm:bottom-6 sm:p-6"
      >
        <p className="text-xs font-extrabold tracking-[0.14em] text-denim uppercase">
          {t("stepCount", { current: stepIndex + 1, total: TOUR_STEPS.length })}
        </p>
        <h2 id="app-tour-title" className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          {t(step.title)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t(step.body)}
        </p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <nav aria-label={t("progressLabel")} className="flex items-center gap-1.5">
            {TOUR_STEPS.map((tourStep, index) => (
              <button
                key={tourStep.route}
                type="button"
                aria-label={t("goToStep", { step: index + 1 })}
                aria-current={index === stepIndex ? "step" : undefined}
                onClick={() => goTo(index)}
                className={cn(
                  "h-2.5 rounded-full transition-[width,background-color] duration-200",
                  index === stepIndex ? "w-8 bg-denim" : "w-2.5 bg-denim/20 hover:bg-denim/40",
                )}
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={next}
              ref={nextButton}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-denim px-5 text-sm font-bold text-white transition-[transform,background-color] hover:bg-denim-deep active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"
            >
              {stepIndex === TOUR_STEPS.length - 1 ? t("done") : t("next")}
              {stepIndex === TOUR_STEPS.length - 1 ? null : <ArrowRight aria-hidden className="size-4" />}
            </button>
            {stepIndex < TOUR_STEPS.length - 1 && (
              <button
                type="button"
                onClick={leaveTour}
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
