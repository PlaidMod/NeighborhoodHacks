// Turns "Who governs you?" answers into the evidence lines for the pitch
// (Project_Plan.md, Evidence plan item 2), for example:
// "14 of 18 (78%) didn't know they had a MUD".

export type QuizRow = { selected_types: string[]; actual_types: string[]; created_at: string }
export type QuizSummary = { type: string; had: number; missed: number }

/** Keeps rows with since <= created_at < until (ISO strings). Use it to leave out the team's own test runs. */
export function filterByWindow(rows: QuizRow[], since?: string, until?: string): QuizRow[] {
  const from = since ? Date.parse(since) : -Infinity
  const to = until ? Date.parse(until) : Infinity
  return rows.filter((row) => {
    const at = Date.parse(row.created_at)
    return at >= from && at < to
  })
}

/**
 * For each government type someone actually has: how many people had it, and how many of
 * them didn't pick it. Sorted by most missed, then by type.
 */
export function summarizeQuiz(rows: QuizRow[]): QuizSummary[] {
  const totals = new Map<string, QuizSummary>()
  for (const row of rows) {
    const picked = new Set(row.selected_types)
    for (const type of new Set(row.actual_types)) {
      const entry = totals.get(type) ?? { type, had: 0, missed: 0 }
      entry.had++
      if (!picked.has(type)) entry.missed++
      totals.set(type, entry)
    }
  }
  return [...totals.values()].sort((a, b) => b.missed - a.missed || a.type.localeCompare(b.type))
}

/** "14 of 18 (78%) didn't know they had a MUD". Raw counts first, percentage beside them. */
export function formatQuizLine(summary: { had: number; missed: number }, label: string): string {
  const pct = Math.round((100 * summary.missed) / summary.had)
  return `${summary.missed} of ${summary.had} (${pct}%) didn't know they had ${label}`
}
