import { bodiesFor } from "./bodies"
import type { Body, Jurisdiction, Persona, Update } from "./types"

export const ELECTION = {
  name: "November 3 general election",
  day: "2026-11-03T07:00:00",
  earlyStart: "2026-10-19T07:00:00",
  earlyEnd: "2026-10-30T19:00:00",
  mailApplyBy: "2026-10-23T17:00:00",
  registerBy: "2026-10-05T23:59:00",
}

/** ISO timestamp `days` from today at a local wall-clock time. */
export function at(days: number, hour = 9, minute = 0) {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/** Next weekday (0=Sun) on or after `minDays` from today. */
function nextDow(dow: number, minDays = 1) {
  const d = new Date()
  for (let i = minDays; i < minDays + 7; i++) {
    const t = new Date(d)
    t.setDate(d.getDate() + i)
    if (t.getDay() === dow) return i
  }
  return minDays
}

type Make = (b: Body, j: Jurisdiction) => Update[]

const school: Make = (b) => {
  const meet = nextDow(4, 3) // Thursday
  const isHisd = b.id === "hisd"
  const list: Update[] = [
    {
      id: `${b.id}-calendar`,
      bodyId: b.id,
      type: "agenda",
      tier: "digest",
      topic: "schools",
      date: at(meet, isHisd ? 17 : 18),
      posted: at(-1, 16),
      title: "Board votes on the 2027–28 school calendar",
      summary:
        "The proposed calendar starts school Aug 4, shortens winter break to 12 days, and moves spring finals before Memorial Day.",
      detail: [
        "District staff surveyed families in September and offered two calendar options. The board will vote on Option B, which starts a week earlier than this year.",
        "Supporters say an earlier start lets fall semester finals happen before winter break. Opponents point to August heat and summer jobs.",
      ],
      why: {
        default: "Sets when the school year starts and ends for every student in the district.",
        student: "Decides when your summer ends, and whether finals land before or after winter break.",
        parent: "Changes childcare plans for early August and the length of winter break.",
      },
      audiences: ["student", "parent"],
      comment: {
        deadline: at(meet - 1, 12),
        howTo: b.commentRules,
        minutes: 2,
      },
      numbers: [
        { label: "First day", value: "Aug 4, 2027" },
        { label: "Instructional days", value: "175" },
        { label: "Winter break", value: "12 days" },
      ],
      source: b.website,
    },
    {
      id: `${b.id}-phones`,
      bodyId: b.id,
      type: "decision",
      tier: "digest",
      topic: "schools",
      date: at(-6, 20),
      posted: at(-5, 10),
      title: "Phones must stay put away all day at high schools",
      summary:
        "Starting in January, high school students must keep phones in lockers or pouches from first bell to last, including lunch.",
      why: {
        default: "Changes daily rules at every high school in the district.",
        student: "From January, no phone at lunch or between classes. Violations mean a confiscated phone and a parent pickup.",
        parent: "You'll need to reach your student through the front office during the school day.",
      },
      audiences: ["student", "parent"],
      vote: isHisd ? "Approved 8–1" : "Approved 6–1",
      source: b.website,
    },
    {
      id: `${b.id}-buses`,
      bodyId: b.id,
      type: "agenda",
      tier: "timeline",
      topic: "budget",
      date: at(meet, 18),
      posted: at(-1, 16),
      title: "Budget amendment: $2.1M more for bus contractors",
      summary: "Covers a driver shortage that has left some routes running 30+ minutes late since August.",
      why: {
        default: "Moves money from the reserve fund to bus contracts for the rest of the year.",
        student: "Could fix the late buses on some routes.",
        parent: "Targets the late-bus routes. Ask whether yours is on the list.",
      },
      audiences: ["student", "parent"],
      source: b.website,
    },
    {
      id: `${b.id}-literacy`,
      bodyId: b.id,
      type: "meeting",
      tier: "timeline",
      topic: "schools",
      date: at(-3, 17),
      posted: at(-3, 21),
      title: "Workshop: reading scores rose 4 points at elementary schools",
      summary: "Staff presented mid-year reading data. No vote was taken.",
      why: { default: "Background for next spring's budget decisions on reading programs." },
      audiences: ["parent"],
      source: b.website,
    },
    {
      id: `${b.id}-rate`,
      bodyId: b.id,
      type: "decision",
      tier: "digest",
      topic: "taxes",
      date: at(-26, 18),
      posted: at(-25, 9),
      title: `School tax rate set at $${b.taxRate?.toFixed(4)} per $100`,
      summary: "The board adopted this year's rate. It's usually the largest single line on a Houston-area tax bill.",
      why: {
        default: "The biggest share of most local property tax bills.",
        homeowner: "This is usually the largest single line on your property tax bill.",
        renter: "Landlords factor property taxes into rent. This is the biggest piece.",
      },
      audiences: ["homeowner", "renter"],
      vote: "Approved 6–1",
      source: b.website,
    },
  ]

  if (isHisd) {
    list.unshift({
      id: "hisd-consolidation",
      bodyId: b.id,
      type: "hearing",
      tier: "urgent",
      topic: "schools",
      date: at(meet, 17),
      posted: at(-2, 15),
      title: "Board to vote on closing or merging 9 under-enrolled campuses",
      summary:
        "The plan would consolidate 9 schools running under 60% capacity starting fall 2027. Affected families would be reassigned to nearby campuses.",
      detail: [
        "District staff say the 9 campuses together are about 4,800 seats under capacity. Merging them would save an estimated $18M a year in building costs.",
        "Several of the schools are in Third Ward, Sunnyside, and Kashmere Gardens. Community groups have asked for a delay until after a full facilities study.",
        "Because HISD's board is appointed, public comment at this meeting is one of the only formal ways for students and families to weigh in before the vote.",
      ],
      why: {
        default: "Could change which school thousands of students attend next year.",
        student: "If your campus is on the list, you could be moved to a different school for 2027–28.",
        parent: "Could change your child's school, bus route, and start time next fall.",
        homeowner: "School closures often affect nearby home values and neighborhood traffic.",
      },
      audiences: ["student", "parent"],
      comment: {
        deadline: at(meet - 1, 12),
        howTo: b.commentRules,
        minutes: 2,
      },
      numbers: [
        { label: "Campuses", value: "9" },
        { label: "Students affected", value: "~5,200" },
        { label: "Est. savings", value: "$18M/yr" },
      ],
      source: b.website,
    })
  }
  return list
}

const city: Make = (b, j) => {
  const wed = nextDow(3, 7)
  const tue = nextDow(2, 1)
  const d = j.councilDistrict
  return [
    {
      id: `${b.id}-water-rates`,
      bodyId: b.id,
      type: "hearing",
      tier: "urgent",
      topic: "housing",
      date: at(tue, 14),
      posted: at(-3, 11),
      title: "Public hearing on a 5% water and sewer rate increase",
      summary:
        "The proposal adds about $4.10 a month to a typical household bill starting in April, to fund pipe repairs under a federal consent decree.",
      why: {
        default: "Raises the monthly water bill for every Houston household.",
        renter: "If water is billed to you or passed through by your landlord, expect about $4 more a month.",
        homeowner: "About $49 more a year on a typical household water bill.",
        student: "Your household's water bill would go up about $4 a month.",
      },
      audiences: ["renter", "homeowner"],
      comment: {
        deadline: at(tue - 1, 15),
        howTo: b.commentRules,
        minutes: 2,
      },
      numbers: [
        { label: "Increase", value: "5%" },
        { label: "Typical bill", value: "+$4.10/mo" },
        { label: "Starts", value: "April 2027" },
      ],
      source: b.website,
    },
    {
      id: `${b.id}-drainage`,
      bodyId: b.id,
      type: "agenda",
      tier: "digest",
      topic: "flooding",
      date: at(wed, 9),
      posted: at(0, 8),
      title: `$48M drainage and street rebuild contract for District ${d}`,
      summary: `Rebuilds 3.2 miles of streets with larger storm sewers in the ${j.area} area. Construction would start next summer and take about 2 years.`,
      why: {
        default: `Big construction and better drainage coming to ${j.area}.`,
        homeowner: "Could reduce street flooding near you, with 2 years of construction detours.",
        renter: "Expect lane closures nearby, and less street flooding once it's done.",
        student: "Could change your route to school during construction.",
      },
      audiences: [],
      comment: {
        deadline: at(wed - 2, 15),
        howTo: b.commentRules,
        minutes: 2,
      },
      numbers: [
        { label: "Contract", value: "$48M" },
        { label: "Street miles", value: "3.2" },
      ],
      source: b.website,
    },
    {
      id: `${b.id}-sidewalks`,
      bodyId: b.id,
      type: "decision",
      tier: "digest",
      topic: "streets",
      date: at(-4, 9),
      posted: at(-4, 15),
      title: "$15M approved for sidewalks within a mile of schools",
      summary: "Fills sidewalk gaps near 60 campuses, prioritizing routes with recent pedestrian crashes.",
      why: {
        default: "Safer walking routes to school across the city.",
        student: "If you walk to school, your route may get new sidewalks by next fall.",
        parent: "Targets walking routes near schools with recent crashes.",
      },
      audiences: ["student", "parent"],
      vote: "Approved 15–2",
      source: b.website,
    },
    {
      id: `${b.id}-townhall`,
      bodyId: b.id,
      type: "meeting",
      tier: "timeline",
      topic: "safety",
      date: at(8, 18, 30),
      posted: at(-1, 12),
      title: `District ${d} town hall with your council member`,
      summary: "Open Q&A on illegal dumping, street lights, and the new drainage project.",
      why: { default: "An informal chance to ask your council member questions in person." },
      audiences: [],
      source: b.website,
    },
    {
      id: `${b.id}-trucks`,
      bodyId: b.id,
      type: "agenda",
      tier: "timeline",
      topic: "budget",
      date: at(wed, 9),
      posted: at(0, 8),
      title: "Contract renewal for 40 new trash trucks",
      summary: "Replaces trucks older than 12 years to cut missed pickups.",
      why: { default: "Aims to cut missed trash pickups." },
      audiences: [],
      source: b.website,
    },
  ]
}

const county: Make = (b, j) => {
  const harris = b.id === "harris-court"
  const tue = nextDow(2, 6)
  return [
    {
      id: `${b.id}-flood-bond`,
      bodyId: b.id,
      type: "hearing",
      tier: "digest",
      topic: "flooding",
      date: at(tue, 10),
      posted: at(-2, 14),
      title: harris ? "Hearing on which flood bond projects get built next" : "Hearing on the 2027 drainage project list",
      summary: `Staff will present a ranked list of 41 projects. ${j.watershed} projects are ranked in the top 15.`,
      why: {
        default: `Decides the order flood projects get built, including in the ${j.watershed} area.`,
        homeowner: `Projects in the ${j.watershed} watershed could lower your flood risk and insurance costs.`,
        renter: "Determines how soon flood fixes reach your area.",
      },
      audiences: ["homeowner", "renter"],
      comment: {
        deadline: at(tue - 1, 17),
        howTo: b.commentRules,
        minutes: 2,
      },
      source: b.website,
    },
    {
      id: `${b.id}-budget`,
      bodyId: b.id,
      type: "decision",
      tier: "digest",
      topic: "taxes",
      date: at(-20, 10),
      posted: at(-20, 16),
      title: `County budget adopted with a rate of $${b.taxRate?.toFixed(4)} per $100`,
      summary: "The rate is slightly lower than last year, but rising home values mean many bills still go up.",
      why: {
        default: "Sets the county's share of your property tax bill.",
        homeowner: "Your county line will likely still rise because appraised values went up.",
        renter: "Part of the property taxes that shape your rent.",
      },
      audiences: ["homeowner", "renter"],
      vote: "Approved 4–1",
      source: b.website,
    },
    {
      id: `${b.id}-polls`,
      bodyId: b.id,
      type: "agenda",
      tier: "timeline",
      topic: "elections",
      date: at(-9, 10),
      posted: at(-9, 16),
      title: "Early voting locations finalized, including 4 college campuses",
      summary: "Adds polling sites at community college campuses and extends hours on the final 3 days.",
      why: {
        default: "Where and when you can vote early.",
        student: "There's an early voting site on a college campus. Check if one's near you.",
        voter: "Early voting sites are set, with longer hours on the last 3 days.",
      },
      audiences: ["voter", "student"],
      source: b.website,
    },
    {
      id: `${b.id}-roads`,
      bodyId: b.id,
      type: "agenda",
      tier: "timeline",
      topic: "streets",
      date: at(tue, 10),
      posted: at(-2, 14),
      title: `Precinct ${j.precinct} road resurfacing package: 22 streets`,
      summary: "Mill-and-overlay work on 22 county-maintained streets, mostly in unincorporated neighborhoods.",
      why: { default: "Repaves county-maintained streets in your precinct." },
      audiences: [],
      source: b.website,
    },
  ]
}

const flood: Make = (b, j) => [
  {
    id: `${b.id}-basin`,
    bodyId: b.id,
    type: "decision",
    tier: "digest",
    topic: "flooding",
    date: at(-2, 10),
    posted: at(-2, 13),
    title: `Construction starts on a new ${j.watershed} detention basin`,
    summary: "The 80-acre basin will hold about 600 million gallons of stormwater. Expect truck traffic for about 18 months.",
    why: {
      default: `Adds flood storage upstream of ${j.area}.`,
      homeowner: "Reduces flood risk downstream. Heavy truck traffic nearby until 2028.",
    },
    audiences: ["homeowner"],
    numbers: [
      { label: "Storage", value: "600M gal" },
      { label: "Timeline", value: "18 months" },
    ],
    source: b.website,
  },
  {
    id: `${b.id}-engagement`,
    bodyId: b.id,
    type: "meeting",
    tier: "timeline",
    topic: "flooding",
    date: at(14, 18, 30),
    posted: at(-1, 9),
    title: `${j.watershed} community engagement meeting`,
    summary: "Engineers will show channel improvement options and take questions. An online survey is also open.",
    why: { default: "A chance to tell engineers where water collects on your street." },
    audiences: ["homeowner", "renter"],
    source: b.website,
  },
]

const health: Make = (b) => [
  {
    id: `${b.id}-budget`,
    bodyId: b.id,
    type: "decision",
    tier: "timeline",
    topic: "budget",
    date: at(-18, 9),
    posted: at(-18, 14),
    title: "Harris Health budget funds 2 new community clinics",
    summary: "Adds clinics in north and east Harris County and keeps the tax rate flat.",
    why: { default: "Expands low-cost care for uninsured residents." },
    audiences: [],
    vote: "Approved 9–0",
    source: b.website,
  },
]

const college: Make = (b) => [
  {
    id: `${b.id}-tuition`,
    bodyId: b.id,
    type: "agenda",
    tier: "digest",
    topic: "schools",
    date: at(9, 16),
    posted: at(0, 10),
    title: "Trustees weigh a $3-per-credit-hour tuition increase",
    summary: "Would take effect fall 2027. Dual-credit classes for high school students would stay free.",
    why: {
      default: "Changes what community college costs next year.",
      student: "Dual credit stays free. Full-time tuition after graduation would rise about $90 a year.",
      parent: "Dual credit stays free for high schoolers.",
    },
    audiences: ["student", "parent"],
    comment: { deadline: at(9, 12), howTo: b.commentRules, minutes: 3 },
    source: b.website,
  },
]

const mud: Make = (b) => {
  const t = b.lastTurnout!
  return [
    {
      id: `${b.id}-bond`,
      bodyId: b.id,
      type: "election",
      tier: "urgent",
      topic: "taxes",
      date: ELECTION.day,
      posted: at(-10, 9),
      title: `${b.short} asks voters to approve $38.5M in bonds`,
      summary: `The bonds would pay for a new water plant and sewer lines. Last time, only ${t.votes} people voted in a ${b.short} election.`,
      detail: [
        "If approved, the district can borrow up to $38.5M over the next decade. The debt is repaid through the district's property tax, so your MUD rate could rise to repay it.",
        `Only ${t.votes} of about ${t.eligible.toLocaleString()} eligible voters cast ballots in the district's last election, so a few dozen votes can decide it.`,
      ],
      why: {
        default: `A handful of votes will decide whether ${b.short} borrows $38.5M.`,
        homeowner: `Could raise the MUD line on your tax bill. Only ${t.votes} people voted last time.`,
        renter: "You can vote on this if you're registered at this address, even though you rent.",
        voter: `It's on your ballot. Only ${t.votes} people voted in the last ${b.short} election.`,
      },
      audiences: ["homeowner", "renter", "voter"],
      numbers: [
        { label: "Bonds", value: "$38.5M" },
        { label: "Votes last time", value: String(t.votes) },
        { label: "Eligible voters", value: t.eligible.toLocaleString() },
      ],
      source: b.website,
    },
    {
      id: `${b.id}-meeting`,
      bodyId: b.id,
      type: "meeting",
      tier: "timeline",
      topic: "taxes",
      date: at(4, 13, 30),
      posted: at(-2, 9),
      title: `${b.short} monthly board meeting, held 14 miles away`,
      summary: "Agenda: operator report, bond election update, and an engineering contract. It meets at a law firm on Post Oak Blvd at 1:30 PM on a weekday.",
      why: {
        default: "Most residents don't know this board exists or that it meets.",
        homeowner: "This board sets part of your tax bill and meets during work hours, outside the district.",
      },
      audiences: ["homeowner"],
      source: b.website,
    },
    {
      id: `${b.id}-rate`,
      bodyId: b.id,
      type: "decision",
      tier: "digest",
      topic: "taxes",
      date: at(-31, 13, 30),
      posted: at(-30, 9),
      title: `${b.short} set its rate at $${b.taxRate?.toFixed(4)} per $100`,
      summary: "The board adopted the rate with no public comments. Three of five directors attended.",
      why: {
        default: "One of the largest lines on your tax bill. Most residents never hear about it.",
        homeowner: `On a $300,000 home that's about $${Math.round((b.taxRate! * 3000)).toLocaleString()} a year.`,
        renter: "Built into your rent through your landlord's tax bill.",
      },
      audiences: ["homeowner", "renter"],
      vote: "Approved 3–0",
      source: b.website,
    },
    {
      id: `${b.id}-operator`,
      bodyId: b.id,
      type: "agenda",
      tier: "timeline",
      topic: "flooding",
      date: at(-12, 13, 30),
      posted: at(-12, 18),
      title: "Operator report: 3 water main breaks repaired",
      summary: "Water loss is 11%, above the state's 10% target.",
      why: { default: "A routine check on how well your water system is running." },
      audiences: [],
      source: b.website,
    },
  ]
}

const ELECTION_UPDATES = (j: Jurisdiction): Update[] => {
  const boardId = j.county === "harris" ? "harris-court" : "fortbend-court"
  return [
    {
      id: "early-voting",
      bodyId: boardId,
      type: "election",
      tier: "urgent",
      topic: "elections",
      date: ELECTION.earlyStart,
      posted: at(-1, 9),
      title: "Early voting runs Oct 19–30 for the Nov 3 election",
      summary: "You can vote at any early voting site in the county. Bring a photo ID.",
      why: {
        default: "You can vote at any site in the county during early voting.",
        voter: "Your first election? Any early voting site in the county works. Bring a photo ID.",
        student: "If you're 18 by Nov 3 and registered, you can vote at any site.",
      },
      audiences: ["voter", "student"],
      source: j.county === "harris" ? "https://www.harrisvotes.com" : "https://www.fortbendcountytx.gov/elections",
    },
    {
      id: "mail-deadline",
      bodyId: boardId,
      type: "deadline",
      tier: "timeline",
      topic: "elections",
      date: ELECTION.mailApplyBy,
      posted: at(-6, 9),
      title: "Last day for mail ballot applications to arrive",
      summary: "Voting by mail in Texas is limited to people 65+, sick or disabled, out of the county, or in jail but eligible.",
      why: {
        default: "If you qualify to vote by mail, your application must arrive by this date.",
        student: "Away at college out of county? You can vote by mail, but apply now.",
      },
      audiences: ["voter", "student"],
      source: "https://www.votetexas.gov",
    },
  ]
}

const MAKERS: Record<Body["kind"], Make> = { school, city, county, flood, health, college, mud }

export function updatesFor(j: Jurisdiction): Update[] {
  const bodies = bodiesFor(j)
  const all = bodies.flatMap((b) => MAKERS[b.kind](b, j)).concat(ELECTION_UPDATES(j))
  return all.sort((a, b) => +new Date(b.posted) - +new Date(a.posted))
}

export function relevance(u: Update, personas: Persona[]) {
  if (u.audiences.length === 0) return 1
  return u.audiences.some((a) => personas.includes(a)) ? 2 : 0
}

export function whyFor(u: Update, personas: Persona[]) {
  for (const p of personas) if (u.why[p]) return u.why[p]!
  return u.why.default
}
