import { central } from "./format"
import type { Lang, Story, StoryFacts } from "./types"

/**
 * Code fact-check for AI-written stories (plan §9). Every number, currency amount,
 * date and time in the story must match a value in the input facts, and the
 * headline and dek must avoid loaded words. Anything that fails is rejected; the
 * caller regenerates once, then falls back to the template.
 */

export const BANNED_WORDS: Record<Lang, string[]> = {
  en: [
    "slams",
    "slam",
    "blasts",
    "outrageous",
    "finally",
    "controversial",
    "massive",
    "shocking",
    "stunning",
    "huge",
    "radical",
    "scandal",
    "disaster",
    "chaos",
    "sneaks",
    "sneaky",
    "secret",
    "betray",
    "betrays",
    "win",
    "wins",
    "loses",
    "victory",
    "defeat",
  ],
  es: [
    "polémico",
    "polémica",
    "controversial",
    "escandaloso",
    "escándalo",
    "masivo",
    "masiva",
    "enorme",
    "finalmente",
    "indignante",
    "arremete",
    "caos",
    "desastre",
    "secreto",
    "traición",
    "victoria",
    "derrota",
  ],
}

type Allowed = {
  money: number[]
  rates: number[]
  percents: number[]
  times: string[] // "HH:MM" in 24h Central
  dates: string[] // "M-D"
  numbers: Set<number>
}

const EN_MONTHS: [RegExp, number][] = [
  [/^jan/i, 1],
  [/^feb/i, 2],
  [/^mar/i, 3],
  [/^apr/i, 4],
  [/^may/i, 5],
  [/^jun/i, 6],
  [/^jul/i, 7],
  [/^aug/i, 8],
  [/^sep/i, 9],
  [/^oct/i, 10],
  [/^nov/i, 11],
  [/^dec/i, 12],
]
const ES_MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

function numbersIn(text: string) {
  return [...text.matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => Number(m[0].replace(/,/g, "")))
}

export function turnoutPercent(f: StoryFacts) {
  const e = f.last_election
  if (!e?.registered_voters) return null
  return (e.votes_cast / e.registered_voters) * 100
}

export function allowedValues(f: StoryFacts): Allowed {
  const isoDates = [
    f.meeting_date,
    f.registration?.opens_at,
    f.registration?.closes_at,
    f.last_election?.date,
  ].filter((d): d is string => !!d)

  const money = f.amounts.filter((a) => a.kind !== "rate").map((a) => a.value)
  const rates = [
    ...f.amounts.filter((a) => a.kind === "rate").map((a) => a.value),
    ...[f.tax_rates?.adopted_rate, f.tax_rates?.no_new_revenue_rate, f.tax_rates?.voter_approval_rate].filter(
      (r): r is number => typeof r === "number",
    ),
  ]
  const pct = turnoutPercent(f)
  const percents = pct == null ? [] : [Math.round(pct), Number(pct.toFixed(1)), Number(pct.toFixed(2))]

  const numbers = new Set<number>()
  const add = (n: number | undefined | null) => {
    if (typeof n === "number" && Number.isFinite(n)) numbers.add(n)
  }
  for (const iso of isoDates) {
    const d = central(iso)
    add(d.year)
    add(d.day)
    add(d.month)
  }
  for (const n of numbersIn([f.body_name, f.body_short ?? "", f.title, f.description ?? "", f.agenda_number ?? "", f.outcome?.action ?? ""].join(" "))) add(n)
  for (const a of f.amounts) for (const n of numbersIn(a.text)) add(n)
  add(f.registration?.minutes_per_speaker)
  add(f.last_election?.votes_cast)
  add(f.last_election?.registered_voters)
  for (const p of percents) add(p)
  for (const m of money) add(m)
  // "per $100" appears with every tax rate.
  if (rates.length) add(100)

  return {
    money,
    rates,
    percents,
    times: isoDates.map((iso) => central(iso).toFormat("HH:mm")),
    dates: isoDates.map((iso) => {
      const d = central(iso)
      return `${d.month}-${d.day}`
    }),
    numbers,
  }
}

const MONEY_RE = /\$\s?(\d[\d,]*(?:\.\d+)?)(\s*(?:mil millones|millones|millón|million|billion|M\b|B\b))?/gi
const PERCENT_RE = /(\d+(?:[.,]\d+)?)\s?(%|percent|por ciento)/gi
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s?(a\.?\s?m\.?|p\.?\s?m\.?)(?=\W|$)/gi
const EN_DATE_RE =
  /\b(Jan(?:uary|\.)?|Feb(?:ruary|\.)?|March|Mar\.|April|Apr\.|May|June|Jun\.|July|Jul\.|Aug(?:ust|\.)?|Sept?(?:ember|\.)?|Oct(?:ober|\.)?|Nov(?:ember|\.)?|Dec(?:ember|\.)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi
const ES_DATE_RE = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${ES_MONTHS.join("|")})\\b`, "gi")

function close(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-9)
}

function moneyMatches(text: string, unit: string | undefined, allowed: Allowed) {
  const n = Number(text.replace(/,/g, ""))
  const u = (unit ?? "").trim().toLowerCase()
  const scale = /^(billion|b|mil millones)$/.test(u) ? 1e9 : /^(million|millones|millón|m)$/.test(u) ? 1e6 : 1
  if (scale > 1) {
    // "$38.5 million" matches 38,500,000; allow rounding to the decimals written.
    const decimals = (text.split(".")[1] ?? "").length
    return allowed.money.some((v) => Number((v / scale).toFixed(decimals)) === n)
  }
  if (allowed.money.some((v) => close(v, n) || Math.round(v) === n)) return true
  // Tax rates: "$0.3950 per $100" or "$0.395".
  const decimals = (text.split(".")[1] ?? "").length
  if (allowed.rates.some((r) => Number(r.toFixed(decimals)) === n)) return true
  return allowed.numbers.has(n) && n === 100
}

/** Returns the problems found; an empty list means the story passes. */
export function factCheck(story: Story, facts: StoryFacts, lang: Lang): string[] {
  const allowed = allowedValues(facts)
  const problems: string[] = []
  const all = [story.headline, story.dek, ...story.body_paragraphs, story.renter_line].join("\n")
  let rest = all

  const blank = (m: RegExpMatchArray) => {
    rest = rest.replace(m[0], " ".repeat(m[0].length))
  }

  for (const m of all.matchAll(MONEY_RE)) {
    if (!moneyMatches(m[1]!, m[2], allowed)) problems.push(`amount not in facts: ${m[0].trim()}`)
    blank(m)
  }
  for (const m of all.matchAll(PERCENT_RE)) {
    const n = Number(m[1]!.replace(",", "."))
    if (!allowed.percents.some((p) => close(p, n))) problems.push(`percent not in facts: ${m[0]}`)
    blank(m)
  }
  for (const m of all.matchAll(TIME_RE)) {
    let h = Number(m[1])
    const min = Number(m[2] ?? 0)
    const pm = /p/i.test(m[3]!)
    if (h === 12) h = pm ? 12 : 0
    else if (pm) h += 12
    const key = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
    if (!allowed.times.includes(key)) problems.push(`time not in facts: ${m[0]}`)
    blank(m)
  }
  for (const m of all.matchAll(EN_DATE_RE)) {
    const month = EN_MONTHS.find(([re]) => re.test(m[1]!))?.[1]
    if (!allowed.dates.includes(`${month}-${Number(m[2])}`)) problems.push(`date not in facts: ${m[0]}`)
    blank(m)
  }
  for (const m of all.matchAll(ES_DATE_RE)) {
    const month = ES_MONTHS.indexOf(m[2]!.toLowerCase()) + 1
    if (!allowed.dates.includes(`${month}-${Number(m[1])}`)) problems.push(`date not in facts: ${m[0]}`)
    blank(m)
  }
  for (const m of rest.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const n = Number(m[0].replace(/,/g, ""))
    if (!allowed.numbers.has(n)) problems.push(`number not in facts: ${m[0]}`)
  }

  const head = `${story.headline} ${story.dek}`
  for (const w of BANNED_WORDS[lang]) {
    if (new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "iu").test(head)) problems.push(`loaded word in headline or dek: ${w}`)
  }
  return problems
}
