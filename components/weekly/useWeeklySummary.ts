"use client"

import * as React from "react"

// The AI-written "This week, in short", fetched after the page shows (/api/weekly/summary), so the
// page itself never waits for the model. One request per reader and language for the whole visit:
// moving between pages reuses it. A failed or empty answer isn't kept, so a later page tries again.

const requests = new Map<string, Promise<string[] | null>>()

function request(lang: "en" | "es", token: string | undefined, key: string) {
  const id = `${lang}|${token ?? ""}|${key}`
  const running = requests.get(id)
  if (running) return running
  const query = new URLSearchParams({ lang })
  if (token) query.set("t", token)
  const job = fetch(`/api/weekly/summary?${query}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((body: { points?: unknown } | null) =>
      Array.isArray(body?.points) && body.points.every((p) => typeof p === "string") ? (body.points as string[]) : null,
    )
    .catch(() => null)
    .then((points) => {
      if (!points?.length) requests.delete(id)
      return points
    })
  requests.set(id, job)
  return job
}

/**
 * The summary's sentences once they arrive; null until then, and null if none could be written.
 * `key` names the reader's governments, so a new address gets a new summary.
 */
export function useWeeklySummary({ enabled, lang, token, key = "" }: { enabled: boolean; lang: "en" | "es"; token?: string; key?: string }) {
  const [result, setResult] = React.useState<{ id: string; points: string[] | null } | null>(null)
  const id = `${lang}|${token ?? ""}|${key}`
  React.useEffect(() => {
    if (!enabled) return
    let current = true
    void request(lang, token, key).then((points) => {
      if (current) setResult({ id, points })
    })
    return () => {
      current = false
    }
  }, [enabled, lang, token, key, id])
  return enabled && result?.id === id ? result.points : null
}
