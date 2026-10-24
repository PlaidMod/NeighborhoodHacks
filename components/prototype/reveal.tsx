"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Fades content in the first time it scrolls into view (or on load, with `delay` for a stagger).
// Motion values from the project's UI rules: opacity, 4px blur and 12px rise over 300ms, ease-out.
// With reduced motion it's an opacity fade only. Nothing is hidden if IntersectionObserver is missing.

export function Reveal({
  children,
  className,
  delay = 0,
  dataOnboarding,
  as: Tag = "div",
}: {
  children: React.ReactNode
  className?: string
  dataOnboarding?: string
  /** Milliseconds; use multiples of 100 for a staged entrance. */
  delay?: number
  as?: "div" | "section" | "li" | "aside"
}) {
  const ref = React.useRef<HTMLElement>(null)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no observer: show at once
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-shown={shown || undefined}
      data-onboarding={dataOnboarding}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={cn(
        "opacity-0 transition-[opacity,translate,filter] duration-300 ease-out data-shown:opacity-100",
        "motion-safe:translate-y-3 motion-safe:blur-[4px] motion-safe:data-shown:translate-y-0 motion-safe:data-shown:blur-none",
        className,
      )}
    >
      {children}
    </Tag>
  )
}
