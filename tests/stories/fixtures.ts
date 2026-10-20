import type { StoryFacts } from "@/lib/stories/types"

/**
 * Golden facts for the story fact-check (plan §9, §20). These are test fixtures
 * shaped like real agenda items, not real decisions, and must never be shown to
 * users.
 */

export const mudBond: StoryFacts = {
  item_id: "fx-mud-bond",
  body_name: "Harris County MUD No. 489",
  body_short: "MUD 489",
  meeting_date: "2026-10-28T11:00:00-05:00",
  meeting_type: "regular",
  agenda_number: "7",
  title: "Order an election for the issuance of $38,500,000 unlimited tax bonds for water, sewer and drainage",
  status: "upcoming",
  amounts: [{ value: 38_500_000, text: "$38,500,000", kind: "money" }],
  registration: { channels: ["card_at_meeting", "written"], closes_at: "2026-10-28T11:00:00-05:00" },
  last_election: { date: "2024-11-05T07:00:00-06:00", votes_cast: 37, registered_voters: 5116 },
  contains_private_person: false,
  source_url: "https://example.org/fixtures/mud-489-agenda.pdf",
}

export const countyTaxRate: StoryFacts = {
  item_id: "fx-county-rate",
  body_name: "Harris County Commissioners Court",
  body_short: "Commissioners Court",
  meeting_date: "2026-10-29T10:00:00-05:00",
  meeting_type: "regular",
  title: "Consider and adopt the 2026 tax rate of $0.3950 per $100 valuation",
  status: "upcoming",
  amounts: [{ value: 0.395, text: "$0.3950", kind: "rate" }],
  tax_rates: { no_new_revenue_rate: 0.3891, voter_approval_rate: 0.4012 },
  registration: { channels: ["online_form"], closes_at: "2026-10-28T17:00:00-05:00", minutes_per_speaker: 3 },
  contains_private_person: false,
  source_url: "https://example.org/fixtures/cc-agenda.pdf",
}

export const hisdConsolidation: StoryFacts = {
  item_id: "fx-hisd-consolidation",
  body_name: "HISD Board of Managers",
  body_short: "HISD board",
  meeting_date: "2026-10-22T17:00:00-05:00",
  meeting_type: "regular",
  title: "Approve the consolidation of 9 under-enrolled campuses beginning in the 2027-2028 school year",
  status: "upcoming",
  amounts: [],
  registration: { channels: ["online_form"], opens_at: "2026-10-16T08:00:00-05:00", closes_at: "2026-10-21T12:00:00-05:00", minutes_per_speaker: 2 },
  contains_private_person: false,
  source_url: "https://example.org/fixtures/hisd-agenda.pdf",
}

export const councilDecided: StoryFacts = {
  item_id: "fx-council-sidewalks",
  body_name: "Houston City Council",
  body_short: "City Council",
  meeting_date: "2026-10-14T09:00:00-05:00",
  meeting_type: "regular",
  title: "Approve $15,000,000 for sidewalk repairs within one mile of schools",
  status: "decided",
  outcome: { action: "Approved 15-2", vote_result: "passed" },
  amounts: [{ value: 15_000_000, text: "$15,000,000", kind: "money" }],
  contains_private_person: false,
  source_url: "https://example.org/fixtures/council-minutes.pdf",
}

export const hisdPersonnel: StoryFacts = {
  item_id: "fx-hisd-hearing",
  body_name: "HISD Board of Managers",
  body_short: "HISD board",
  meeting_date: "2026-10-08T17:00:00-05:00",
  meeting_type: "regular",
  title: "An employee, Consideration of the proposed termination of employment",
  status: "awaiting_result",
  amounts: [],
  contains_private_person: true,
  source_url: "https://example.org/fixtures/hisd-hearings.pdf",
}

export const ALL_FIXTURES = [mudBond, countyTaxRate, hisdConsolidation, councilDecided, hisdPersonnel]
