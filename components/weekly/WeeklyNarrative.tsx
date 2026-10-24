"use client"

import type { ReactNode } from "react"
import { useWeeklySummary } from "./useWeeklySummary"

/**
 * The AI summary at the top of /weekly. The page shows its fact lines (children) right away and
 * swaps in the summary when /api/weekly/summary answers; if none could be written, the facts stay.
 */
export function WeeklyNarrative({ token, lang, aiLabel, children }: { token?: string; lang: "en" | "es"; aiLabel: string; children: ReactNode }) {
  const points = useWeeklySummary({ enabled: true, lang, token })
  if (!points?.length) return <>{children}</>
  return (
    <>
      <div className="mt-4 space-y-3 font-sans text-[1.05rem] leading-relaxed md:text-lg">
        {points.map((point, i) => (
          <p key={i}>{point}</p>
        ))}
      </div>
      <p className="mt-4 font-sans text-xs text-muted-foreground">{aiLabel}</p>
    </>
  )
}
