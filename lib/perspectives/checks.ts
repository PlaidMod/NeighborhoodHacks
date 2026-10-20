import { normalizeSpace } from '@/lib/ingest/normalize'
import { BANNED_WORDS } from '@/lib/stories/factCheck'
import type { Extraction, Group, LinkedArticle, PerspectiveItem } from './types'

// Code checks on the extraction (perspectives spec §6.3). Each failing argument is
// dropped, never edited: an edited quote would no longer be exact.

export const MAX_QUOTE_WORDS = 25
export const MAX_SUMMARY_WORDS = 30
export const MAX_LABEL_WORDS = 6

/** Labels must say who people are, never which side they're on (§6.3, check 5). */
export const BANNED_LABELS = [
  'opponents',
  'supporters',
  'critics',
  'proponents',
  'detractors',
  'backers',
  'foes',
  'naysayers',
  'champions',
  'the other side',
]

const ROLE_WORDS = [
  'commissioner',
  'judge',
  'mayor',
  'council member',
  'councilmember',
  'trustee',
  'superintendent',
  'director',
  'chair',
  'chairman',
  'chairwoman',
  'president',
  'spokesperson',
  'spokesman',
  'spokeswoman',
  'ceo',
  'manager',
]

/** Words that mark a capitalized phrase as a place or organization, not a person. */
const ORG_WORDS = new Set(
  (
    'houston harris county texas city council board court commissioners district isd hisd cfisd mud municipal utility ' +
    'flood control port authority metro school schools elementary middle high college university community department ' +
    'office agency association bayou creek street avenue road park parks lake river water public media news landing ' +
    'chronicle impact khou kprc abc fox click2houston state federal united states america national service services ' +
    'center centre hospital health system plant fund committee commission corporation inc llc company group coalition ' +
    'alliance foundation chamber league union church north south east west ward heights downtown midtown greater'
  ).split(' '),
)

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean)
const norm = (s: string) => normalizeSpace(s).toLowerCase()

function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, '')))
}

/** Capitalized multi-word phrases that could be a person's name. */
export function possibleNames(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/\b[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’.-]+)+/g)) {
    const tokens = m[0].split(/\s+/)
    if (tokens.some((t) => ORG_WORDS.has(t.toLowerCase().replace(/[^a-z0-9]/g, '')))) continue
    out.push(m[0])
  }
  return out
}

/** A name is allowed only if the article puts it within 6 words of an official role (§6.3, check 7). */
export function nameIsOfficial(name: string, articleText: string): boolean {
  const tokens = articleText.split(/\s+/)
  const lowered = tokens.map((t) => t.toLowerCase().replace(/[^a-z]/g, ''))
  const first = name.split(/\s+/)[0]!.toLowerCase().replace(/[^a-z]/g, '')
  for (let i = 0; i < tokens.length; i++) {
    if (lowered[i] !== first) continue
    const window = lowered.slice(Math.max(0, i - 6), i + 6 + name.split(/\s+/).length).join(' ')
    if (ROLE_WORDS.some((r) => window.includes(r.replace(/\s+/g, ' ')))) return true
  }
  return false
}

function hasWord(text: string, list: string[]) {
  const t = text.toLowerCase()
  return list.find((w) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'iu').test(t))
}

export type CheckResult = { groups: Group[]; dropped: number; reasons: string[] }

/** Runs every code check and returns only the arguments that pass, with their source details attached. */
export function checkExtraction(extraction: Extraction, articles: LinkedArticle[], item: PerspectiveItem): CheckResult {
  const byId = new Map(articles.map((a) => [a.article_id, a]))
  const itemNumbers = new Set(numbersIn([item.title, item.description ?? '', item.body_name].join(' ')))
  const d = new Date(item.meeting_date)
  for (const n of [d.getUTCFullYear(), d.getUTCDate(), d.getUTCMonth() + 1]) itemNumbers.add(n)

  const reasons: string[] = []
  let dropped = 0
  let total = 0
  const groups: Group[] = []

  for (const group of extraction.groups) {
    const label = group.label.trim()
    const labelProblem =
      words(label).length > MAX_LABEL_WORDS
        ? 'label too long'
        : hasWord(label, BANNED_LABELS)
          ? `stance label: ${hasWord(label, BANNED_LABELS)}`
          : hasWord(label, BANNED_WORDS.en)
            ? `loaded word in label: ${hasWord(label, BANNED_WORDS.en)}`
            : null

    const kept: Group['arguments'] = []
    for (const arg of group.arguments) {
      total++
      const article = byId.get(arg.article_id)
      const fail = (why: string) => {
        dropped++
        reasons.push(why)
      }
      if (total > 8) {
        fail('more than 8 arguments')
        continue
      }
      if (labelProblem) {
        fail(labelProblem)
        continue
      }
      if (!article || article.status !== 'ok' || !article.text) {
        fail('unknown or unavailable article')
        continue
      }
      if (words(arg.quote).length > MAX_QUOTE_WORDS) {
        fail('quote too long')
        continue
      }
      if (!norm(article.text).includes(norm(arg.quote))) {
        fail('quote is not exact')
        continue
      }
      if (words(arg.summary).length > MAX_SUMMARY_WORDS) {
        fail('summary too long')
        continue
      }
      const articleNumbers = new Set(numbersIn(article.text))
      const badNumber = numbersIn(arg.summary).find((n) => !articleNumbers.has(n) && !itemNumbers.has(n))
      if (badNumber !== undefined) {
        fail(`number not in the article or item: ${badNumber}`)
        continue
      }
      const loaded = hasWord(arg.summary, BANNED_WORDS.en)
      if (loaded) {
        fail(`loaded word in summary: ${loaded}`)
        continue
      }
      const privateName = [label, arg.summary, arg.quote].flatMap(possibleNames).find((n) => !nameIsOfficial(n, article.text!))
      if (privateName) {
        fail('names a private individual')
        continue
      }
      kept.push({
        summary_en: arg.summary.trim(),
        quote: arg.quote.trim(),
        article_id: article.article_id,
        outlet: article.outlet,
        url: article.url,
        published_at: article.published_at,
      })
    }
    if (kept.length) groups.push({ label_en: label, arguments: kept })
  }
  return { groups, dropped, reasons }
}
