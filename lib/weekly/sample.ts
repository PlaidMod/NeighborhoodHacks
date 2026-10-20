import { DateTime } from 'luxon'
import { classify, type ClassifyBody } from '@/lib/rules/classify'
import { templateStory } from '@/lib/stories/template'
import type { StoryFacts } from '@/lib/stories/types'
import type { WeeklyItem } from './build'

// Sample data for the weekly page, item pages and timeline, shown (with a visible
// "Sample data" label) only while the database isn't connected. These are not real
// decisions. Dates are relative to today so the page never goes stale, and every
// item goes through the real classify() and template story code.

const ZONE = 'America/Chicago'

export type SampleBody = { id: string; name: string; short: string; type: string; sms_eligible: boolean }

export const SAMPLE_BODIES: SampleBody[] = [
  { id: 'hisd_board', name: 'HISD Board of Managers', short: 'HISD board', type: 'school_board', sms_eligible: true },
  { id: 'houston_city_council', name: 'Houston City Council', short: 'City Council', type: 'city_council', sms_eligible: true },
  {
    id: 'commissioners_court',
    name: 'Harris County Commissioners Court',
    short: 'Commissioners Court',
    type: 'commissioners_court',
    sms_eligible: true,
  },
  { id: 'flood_control', name: 'Harris County Flood Control District', short: 'Flood Control', type: 'flood_control', sms_eligible: true },
  { id: 'hcc_board', name: 'Houston Community College Board', short: 'HCC board', type: 'college_board', sms_eligible: true },
]

type Seed = {
  id: string
  body: string
  /** Days from today, and the local Chicago clock time. */
  day: number
  time: string
  title: string
  status?: StoryFacts['status']
  outcome?: StoryFacts['outcome']
  amounts?: StoryFacts['amounts']
  taxRates?: StoryFacts['tax_rates']
  closes?: { day: number; time: string }
  opens?: { day: number; time: string }
  channels?: string[]
  minutes?: number
  cancelled?: boolean
  agenda?: string
}

const SEEDS: Seed[] = [
  {
    id: 'sample-hisd-consolidation',
    body: 'hisd_board',
    day: 3,
    time: '17:00',
    agenda: '7.1',
    title: 'Approve the consolidation of 9 under-enrolled campuses beginning in the 2027-2028 school year',
    opens: { day: -3, time: '08:00' },
    closes: { day: 2, time: '12:00' },
    channels: ['online_form'],
    minutes: 2,
  },
  {
    id: 'sample-hisd-buses',
    body: 'hisd_board',
    day: 3,
    time: '17:00',
    agenda: '9.4',
    title: 'Approve a budget amendment of $2,100,000 for student transportation contracts',
    amounts: [{ value: 2_100_000, text: '$2,100,000', kind: 'money' }],
    closes: { day: 2, time: '12:00' },
    channels: ['online_form'],
    minutes: 2,
  },
  {
    id: 'sample-council-water',
    body: 'houston_city_council',
    day: 1,
    time: '14:00',
    title: 'Public hearing on an ordinance amending water and sewer rates by 5%',
    closes: { day: 0, time: '15:00' },
    channels: ['online_form', 'phone'],
    minutes: 2,
  },
  {
    id: 'sample-council-drainage',
    body: 'houston_city_council',
    day: 8,
    time: '09:00',
    title: 'Approve $48,000,000 from the drainage fund budget for street reconstruction in District D',
    amounts: [{ value: 48_000_000, text: '$48,000,000', kind: 'money' }],
    closes: { day: 7, time: '15:00' },
    channels: ['online_form', 'phone'],
    minutes: 2,
  },
  {
    id: 'sample-county-tax-rate',
    body: 'commissioners_court',
    day: 9,
    time: '10:00',
    title: 'Consider and adopt the 2026 tax rate of $0.3950 per $100 valuation',
    amounts: [{ value: 0.395, text: '$0.3950', kind: 'rate' }],
    taxRates: { no_new_revenue_rate: 0.3891, voter_approval_rate: 0.4012 },
    closes: { day: 8, time: '17:00' },
    channels: ['online_form'],
    minutes: 3,
  },
  {
    id: 'sample-flood-bonds',
    body: 'flood_control',
    day: 9,
    time: '10:00',
    title: 'Authorize the issuance of $250,000,000 in flood control bonds for Brays Bayou projects',
    amounts: [{ value: 250_000_000, text: '$250,000,000', kind: 'money' }],
    closes: { day: 8, time: '17:00' },
    channels: ['online_form'],
    minutes: 3,
  },
  {
    id: 'sample-county-parks',
    body: 'commissioners_court',
    day: 5,
    time: '10:00',
    title: 'Consider acquisition of real property for a Precinct 1 park',
    cancelled: true,
  },
  {
    id: 'sample-council-sidewalks',
    body: 'houston_city_council',
    day: -5,
    time: '09:00',
    title: 'Approve $15,000,000 from the budget for sidewalk repairs within one mile of schools',
    amounts: [{ value: 15_000_000, text: '$15,000,000', kind: 'money' }],
    status: 'decided',
    outcome: { action: 'Approved 15-2', vote_result: 'passed' },
  },
  {
    id: 'sample-hcc-budget',
    body: 'hcc_board',
    day: -2,
    time: '16:00',
    title: 'Adopt the fiscal year 2027 budget',
    status: 'awaiting_result',
  },
  {
    id: 'sample-county-minutes',
    body: 'commissioners_court',
    day: -3,
    time: '10:00',
    title: 'Approve the minutes of the previous regular meeting',
    status: 'decided',
    outcome: { action: 'Approved', vote_result: 'passed' },
  },
]

function at(now: Date, day: number, time: string) {
  const [h, m] = time.split(':').map(Number)
  return DateTime.fromJSDate(now)
    .setZone(ZONE)
    .startOf('day')
    .plus({ days: day })
    .set({ hour: h, minute: m })
    .toISO()!
}

export function sampleBody(id: string) {
  return SAMPLE_BODIES.find((b) => b.id === id)
}

export function sampleFacts(seed: Seed, now: Date): StoryFacts {
  const body = sampleBody(seed.body)!
  return {
    item_id: seed.id,
    body_name: body.name,
    body_short: body.short,
    meeting_date: at(now, seed.day, seed.time),
    meeting_type: 'regular',
    meeting_status: seed.cancelled ? 'cancelled' : 'scheduled',
    agenda_number: seed.agenda,
    title: seed.title,
    status: seed.status ?? 'upcoming',
    outcome: seed.outcome,
    amounts: seed.amounts ?? [],
    tax_rates: seed.taxRates,
    registration: seed.closes
      ? {
          channels: seed.channels ?? [],
          closes_at: at(now, seed.closes.day, seed.closes.time),
          opens_at: seed.opens ? at(now, seed.opens.day, seed.opens.time) : undefined,
          minutes_per_speaker: seed.minutes,
        }
      : undefined,
    contains_private_person: false,
    source_url: 'https://example.org/sample-agenda',
  }
}

/** Every sample item, classified by the real rule engine and written by the real template. */
export function sampleItems(now: Date = new Date()): (WeeklyItem & { facts: StoryFacts })[] {
  return SEEDS.map((seed) => {
    const body = sampleBody(seed.body)!
    const facts = sampleFacts(seed, now)
    const c = classify(
      { title: seed.title, status: facts.status, amounts: facts.amounts },
      { id: body.id, sms_eligible: body.sms_eligible, type: body.type } satisfies ClassifyBody,
      seed.taxRates ?? null,
    )
    return {
      item_id: seed.id,
      body_id: body.id,
      body_name: body.short,
      body_type: body.type,
      title: seed.title,
      item_type: c.item_type,
      tier: c.tier,
      rule_fired: c.rule_fired,
      status: facts.status,
      outcome: seed.outcome,
      meeting_date: facts.meeting_date,
      meeting_status: facts.meeting_status,
      meeting_type: 'regular',
      agenda_number: seed.agenda ?? null,
      registration_closes_at: facts.registration?.closes_at ?? null,
      story_en: templateStory(facts, 'en'),
      story_es: templateStory(facts, 'es'),
      story_source: 'template',
      source_url: facts.source_url,
      first_seen_at: at(now, Math.min(seed.day, 0) - 2, '09:00'),
      is_sample: true,
      facts,
    }
  })
}
