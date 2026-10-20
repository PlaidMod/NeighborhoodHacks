/**
 * P3 rule engine (Technical_Implementation_Plan.md §8, scraper spec §5.3 and §12.3).
 *
 * A pure function: no AI, no I/O. It decides what kind of item this is and how
 * loudly it reaches people: `sms` (a text), `weekly` (the weekly news page), or
 * `timeline` (everything else).
 *
 * The input types below are the subset of P2's `Item` (scraper spec §5.1) that
 * classification reads. P2's full `Item` satisfies them structurally, so ingest
 * can pass its items straight in.
 */

export type Tier = "sms" | "weekly" | "timeline"

export type RuleKey =
  | "tax_rate_increase"
  | "bond"
  | "board_election"
  | "school_change"
  | "leader_hire"
  | "meeting_moved"

export type ItemType =
  | "tax"
  | "bond"
  | "election"
  | "school"
  | "leader"
  | "budget"
  | "zoning"
  | "property"
  | "transit"
  | "water_rate"
  | "personnel"
  | "other"

export type ClassifyAmount = { value: number; text: string; kind?: "money" | "rate" }

export type ClassifyItem = {
  title: string
  description?: string
  section?: string
  matter_type?: string
  status: "upcoming" | "awaiting_result" | "decided"
  amounts?: ClassifyAmount[]
  contains_private_person?: boolean
}

export type ClassifyBody = {
  id: string
  sms_eligible: boolean
  /** A `BodyType` slug from lib/contracts/bodyTypes.ts, e.g. "school_board", "mud", "metro". */
  type: string
}

/** The body's current Truth-in-Taxation rates, per $100 of value. Hand-entered by P1 (`tax_rates`). */
export type TaxRates = {
  adopted_rate?: number | null
  no_new_revenue_rate?: number | null
  voter_approval_rate?: number | null
} | null

/** P2's `Classifier` passes tax rates as `unknown`; read only the field the rules need. */
function noNewRevenueRate(taxRates: unknown): number | null {
  if (!taxRates || typeof taxRates !== "object") return null
  const v = (taxRates as Record<string, unknown>).no_new_revenue_rate
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

/** Optional meeting context. `previous_date` is set by ingest when a meeting's date changes (scraper spec §5.5). */
export type ClassifyMeeting = { date: string; previous_date?: string | null }

export type Classification = { item_type: ItemType; tier: Tier; rule_fired?: RuleKey }

/** Item types that belong in the weekly news page even when no SMS rule fires. */
export const WEEKLY_TYPES: ReadonlySet<ItemType> = new Set([
  "tax",
  "bond",
  "budget",
  "school",
  "zoning",
  "property",
  "transit",
  "water_rate",
])

const CLOSED_SESSION = /closed session|executive session|hearing items|personnel/i
const PERSONNEL_MATTER = /hearing|grievance|personnel|termination|nonrenewal|appeal/i

const SCHOOL_BODY = /school/i

function textOf(item: ClassifyItem) {
  return [item.title, item.description ?? ""].join(" \n ")
}

/** Personnel and closed-session items: they get a story, never a text (scraper spec §5.3). */
export function isPrivateOrClosed(item: ClassifyItem) {
  return (
    item.contains_private_person === true ||
    CLOSED_SESSION.test(item.section ?? "") ||
    PERSONNEL_MATTER.test(item.matter_type ?? "")
  )
}

// ---------------------------------------------------------------------------
// Rules. Each returns true when the item matches. They read text and amounts
// only; whether the item may be texted is decided afterwards.
// ---------------------------------------------------------------------------

const TAX_RATE = /\b(tax rate|ad valorem|maintenance and operations rate|m&o rate|debt service rate|i&s rate|tasa de impuesto)/i
const NOT_A_RATE_DECISION = /\b(exemption|abatement|refund|collection|delinquen|appraisal roll|certified roll)/i

function proposedRate(item: ClassifyItem): number | null {
  const rates = (item.amounts ?? []).filter((a) => a.kind === "rate")
  if (!rates.length) return null
  // A total rate is the largest rate on the item (M&O + I&S line items are smaller).
  return Math.max(...rates.map((r) => r.value))
}

function taxRateIncrease(item: ClassifyItem, taxRates: unknown) {
  const text = textOf(item)
  if (!TAX_RATE.test(text) || NOT_A_RATE_DECISION.test(text)) return false
  const rate = proposedRate(item)
  const nnr = noNewRevenueRate(taxRates)
  if (rate == null || nnr == null) return false
  // Above the no-new-revenue rate. Exactly equal is not an increase.
  return rate - nnr > 1e-9
}

const BOND = /\bbonds?\b/i
const BOND_DECISION = /\b(election|issu|sale|sell|sold|authoriz|order|refund|series|bond resolution|approve the bond)/i
const NOT_A_FINANCING_BOND = /\b(performance|payment|surety|bid|bail|maintenance)\s+bonds?\b|\bbond counsel\b(?!.*\b(issu|sale|election))/i

function bond(item: ClassifyItem) {
  const text = textOf(item)
  return BOND.test(text) && BOND_DECISION.test(text) && !NOT_A_FINANCING_BOND.test(text)
}

const ELECTION = /\belection\b/i
const SEAT = /\b(director|directors|trustee|trustees|board member|council member|position|place|seat|single-member district)\b/i
const ELECTION_ACTION = /\b(order|ordering|call|calling)\b/i
const NOT_A_SEAT_ELECTION = /\b(canvass|polling place|early voting location|election judge|election clerk|joint election agreement)\b/i

function boardElection(item: ClassifyItem) {
  const text = textOf(item)
  return (
    ELECTION.test(text) &&
    SEAT.test(text) &&
    ELECTION_ACTION.test(text) &&
    !BOND.test(text) &&
    !NOT_A_SEAT_ELECTION.test(text)
  )
}

const SCHOOL_CHANGE =
  /\b(clos(e|ing|ure)|consolidat\w*|rezon\w*|attendance (zone|boundar\w*)|boundary change|boundar(y|ies) adjust\w*|repurpos\w*)\b/i
const SCHOOL_CHANGE_SUBJECT = /\b(school|campus|campuses|attendance|boundar)/i

function schoolChange(item: ClassifyItem, body: ClassifyBody) {
  const text = textOf(item)
  return SCHOOL_BODY.test(body.type) && SCHOOL_CHANGE.test(text) && SCHOOL_CHANGE_SUBJECT.test(text)
}

const LEADER = /\b(superintendent|chancellor)\b/i
// "employment contract", never a bare "contract" (plan §8).
const LEADER_ACTION =
  /\b(employment contract|employment agreement|hir(e|ing)|appoint\w*|terminat\w*|lone finalist|name\w* .{0,20}finalist|select\w* .{0,30}(superintendent|chancellor)|dismiss\w*|buyout|resign\w*)\b/i

function leaderHire(item: ClassifyItem) {
  const text = textOf(item)
  return LEADER.test(text) && LEADER_ACTION.test(text)
}

function meetingMoved(meeting?: ClassifyMeeting) {
  if (!meeting?.previous_date) return false
  return new Date(meeting.previous_date).getTime() !== new Date(meeting.date).getTime()
}

// ---------------------------------------------------------------------------
// Item types (for the weekly page and for items no rule fires on)
// ---------------------------------------------------------------------------

const TYPE_PATTERNS: [ItemType, RegExp][] = [
  ["water_rate", /\b(water|sewer|wastewater|utility)\b.{0,30}\b(rate|rates|fee|fees)\b/i],
  ["tax", /\b(tax rate|ad valorem|truth[- ]in[- ]taxation|no-new-revenue|voter-approval rate)\b/i],
  ["budget", /\bbudget\b/i],
  ["zoning", /\b(zoning|rezon\w*|plat|variance|land use|replat)\b/i],
  ["property", /\b(acquisition of (real )?property|real property|real estate|easement|right[- ]of[- ]way|purchase of land|sale of (land|property))\b/i],
  ["transit", /\b(transit|bus route|light rail|metro)\b/i],
  ["election", /\belection\b/i],
]

function itemType(item: ClassifyItem, body: ClassifyBody, rule?: RuleKey): ItemType {
  if (isPrivateOrClosed(item)) return "personnel"
  switch (rule) {
    case "tax_rate_increase":
      return "tax"
    case "bond":
      return "bond"
    case "board_election":
      return "election"
    case "school_change":
      return "school"
    case "leader_hire":
      return "leader"
  }
  const text = textOf(item)
  if (bond(item)) return "bond"
  if (SCHOOL_BODY.test(body.type) && SCHOOL_CHANGE.test(text) && SCHOOL_CHANGE_SUBJECT.test(text)) return "school"
  for (const [type, re] of TYPE_PATTERNS) if (re.test(text)) return type
  if (body.type === "metro") return "transit"
  return "other"
}

/**
 * Classify one agenda item. Assignable to P2's `Classifier` (item, body, taxRates)
 * in lib/adapters/types.ts; the optional fourth argument carries the meeting's
 * date change for the `meeting_moved` rule.
 */
export function classify(
  item: ClassifyItem,
  body: ClassifyBody,
  taxRates: TaxRates | unknown = null,
  meeting?: ClassifyMeeting,
): Classification {
  const privateOrClosed = isPrivateOrClosed(item)

  let rule: RuleKey | undefined
  if (!privateOrClosed) {
    if (taxRateIncrease(item, taxRates)) rule = "tax_rate_increase"
    else if (bond(item)) rule = "bond"
    else if (boardElection(item)) rule = "board_election"
    else if (schoolChange(item, body)) rule = "school_change"
    else if (leaderHire(item)) rule = "leader_hire"
  }

  // A date change to a meeting with an alert-worthy item re-alerts under its own key.
  if (rule && meetingMoved(meeting)) rule = "meeting_moved"

  const type = itemType(item, body, rule === "meeting_moved" ? undefined : rule)

  if (rule && body.sms_eligible && item.status === "upcoming" && !privateOrClosed) {
    return { item_type: type, tier: "sms", rule_fired: rule }
  }
  // A rule that fires on a non-texting body (METRO, Port, water authority) or on a
  // decided item still matters: it goes to the weekly page.
  if (rule || WEEKLY_TYPES.has(type)) {
    return rule ? { item_type: type, tier: "weekly", rule_fired: rule } : { item_type: type, tier: "weekly" }
  }
  return { item_type: type, tier: "timeline" }
}
