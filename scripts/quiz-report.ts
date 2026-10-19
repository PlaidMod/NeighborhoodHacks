// Prints the classmate "Who governs you?" results for the pitch.
// Usage: npx tsx scripts/quiz-report.ts --since 2026-10-21T23:00:00Z --until 2026-10-22T17:00:00Z
// Set the window to when the survey ran, so the team's own test runs are left out.
import { config } from 'dotenv'
import { db } from '../lib/db'
import { filterByWindow, formatQuizLine, summarizeQuiz, type QuizRow } from '../lib/quizReport'

config({ path: '.env.local' })

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

const { data, error } = await db()
  .from('quiz_responses')
  .select('selected_types, actual_types, created_at')
  .order('created_at')
  .limit(5000)
if (error) throw error

const rows = filterByWindow(data as QuizRow[], arg('since'), arg('until'))
console.log(`Results from ${rows.length} people who used our app`)
for (const summary of summarizeQuiz(rows)) {
  // The label is the type key until P1's display names are available.
  console.log(formatQuizLine(summary, summary.type))
}
