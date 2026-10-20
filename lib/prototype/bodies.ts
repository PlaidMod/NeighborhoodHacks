import type { Body, Jurisdiction } from "./types"

const ELECTED_ISD = "7 trustees, elected by voters in the district to 4-year terms"
const ISD_CONTROLS = [
  "School calendar, start times, and bell schedules",
  "Which campuses open, close, or merge",
  "Cell phone, dress code, and discipline policies",
  "Teacher pay and the district budget",
  "The school property tax rate (within state limits)",
]

function isd(
  id: string,
  name: string,
  short: string,
  taxRate: number,
  website: string,
  extra: Partial<Body> = {},
): Body {
  return {
    id,
    name,
    short,
    kind: "school",
    tagline: `Runs the public schools in ${short}: campuses, calendar, policies, and budget.`,
    controls: ISD_CONTROLS,
    selection: ELECTED_ISD,
    seats: "7 trustees",
    meets: "Monthly regular meeting, usually the second or third Thursday, 6 PM",
    location: "District administration building",
    commentRules:
      "Sign up online or in person before the meeting starts. Speakers usually get 2–3 minutes. Agenda items are heard before general topics.",
    taxRate,
    lastTurnout: { year: 2025, votes: 11_400, eligible: 162_000 },
    website,
    ...extra,
  }
}

export const STATIC_BODIES: Record<string, Body> = {
  hisd: isd("hisd", "Houston ISD Board of Managers", "HISD", 0.8683, "https://www.houstonisd.org", {
    tagline:
      "Runs Houston's largest school district. Since 2023 it's led by a state-appointed board, not elected trustees.",
    selection:
      "9 managers appointed by the Texas Education Commissioner. The elected trustees remain but have no vote, so public comment is one of the main ways to be heard.",
    seats: "9 appointed managers",
    meets: "Monthly, usually the second Thursday, 5 PM",
    location: "Hattie Mae White Educational Support Center, 4400 W 18th St",
    commentRules:
      "Register to speak online by noon the day before the meeting. Each speaker gets up to 2 minutes. Written comments are accepted by email.",
    lastTurnout: undefined,
  }),
  cyfair: isd("cyfair", "Cypress-Fairbanks ISD Board of Trustees", "Cy-Fair ISD", 0.9947, "https://www.cfisd.net"),
  katy: isd("katy", "Katy ISD Board of Trustees", "Katy ISD", 1.0371, "https://www.katyisd.org"),
  sbisd: isd("sbisd", "Spring Branch ISD Board of Trustees", "Spring Branch ISD", 0.9686, "https://www.springbranchisd.com"),
  alief: isd("alief", "Alief ISD Board of Trustees", "Alief ISD", 0.9575, "https://www.aliefisd.net"),
  aldine: isd("aldine", "Aldine ISD Board of Trustees", "Aldine ISD", 0.9921, "https://www.aldineisd.org"),
  spring: isd("spring", "Spring ISD Board of Trustees", "Spring ISD", 1.0567, "https://www.springisd.org"),
  klein: isd("klein", "Klein ISD Board of Trustees", "Klein ISD", 1.0632, "https://www.kleinisd.net"),
  humble: isd("humble", "Humble ISD Board of Trustees", "Humble ISD", 1.0412, "https://www.humbleisd.net"),
  pasadena: isd("pasadena", "Pasadena ISD Board of Trustees", "Pasadena ISD", 1.0458, "https://www.pasadenaisd.org"),
  clearcreek: isd("clearcreek", "Clear Creek ISD Board of Trustees", "Clear Creek ISD", 0.9919, "https://www.ccisd.net"),
  galenapark: isd("galenapark", "Galena Park ISD Board of Trustees", "Galena Park ISD", 1.0369, "https://www.galenaparkisd.com"),
  sheldon: isd("sheldon", "Sheldon ISD Board of Trustees", "Sheldon ISD", 1.0952, "https://www.sheldonisd.com"),

  "houston-council": {
    id: "houston-council",
    name: "Houston City Council",
    short: "City Council",
    kind: "city",
    tagline: "Makes the city's laws and budget: streets, police, trash pickup, water bills, and parks.",
    controls: [
      "Street and sidewalk repair, drainage projects",
      "Police and fire budgets",
      "Trash and recycling pickup",
      "Water and sewer rates",
      "Parks, libraries, and permits",
    ],
    selection:
      "The mayor plus 16 members: 11 elected by district and 5 elected citywide (at-large). 4-year terms.",
    seats: "Mayor + 11 district + 5 at-large",
    meets: "Wednesdays at 9 AM. Public comment session Tuesdays at 2 PM.",
    location: "City Hall Council Chamber, 901 Bagby St",
    commentRules:
      "Sign up with the City Secretary by 3 PM the Monday before Tuesday's public session. Speakers get 1–3 minutes depending on the number signed up.",
    taxRate: 0.5193,
    lastTurnout: { year: 2023, votes: 395_000, eligible: 1_150_000 },
    website: "https://www.houstontx.gov/citysec",
  },
  "harris-court": {
    id: "harris-court",
    name: "Harris County Commissioners Court",
    short: "Commissioners Court",
    kind: "county",
    tagline: "The county's governing board: roads outside the city, jails, courts, elections, and flood control.",
    controls: [
      "County roads, especially in unincorporated areas",
      "The jail, county courts, and sheriff's budget",
      "How elections are run and where polls are",
      "Flood control projects and bonds",
      "The county property tax rate",
    ],
    selection: "A county judge elected countywide and 4 commissioners elected by precinct. 4-year terms.",
    seats: "County judge + 4 commissioners",
    meets: "Regular sessions about every other Tuesday or Thursday, 10 AM",
    location: "Commissioners Court Courtroom, 1001 Preston St, 9th floor",
    commentRules:
      "Register online before the meeting to speak in person or virtually. Speakers usually get 1–3 minutes.",
    taxRate: 0.3854,
    lastTurnout: { year: 2024, votes: 1_560_000, eligible: 2_600_000 },
    website: "https://www.harriscountytx.gov",
  },
  "fortbend-court": {
    id: "fortbend-court",
    name: "Fort Bend County Commissioners Court",
    short: "Commissioners Court",
    kind: "county",
    tagline: "Fort Bend's governing board: county roads, courts, jail, elections, and drainage.",
    controls: [
      "County roads and drainage",
      "The jail, county courts, and sheriff's budget",
      "Polling places and election administration",
      "The county property tax rate",
    ],
    selection: "A county judge elected countywide and 4 commissioners elected by precinct.",
    seats: "County judge + 4 commissioners",
    meets: "Tuesdays, about twice a month, 1 PM",
    location: "William B. Travis Building, 309 S 4th St, Richmond",
    commentRules: "Fill out a speaker card before the meeting begins. Speakers get up to 3 minutes.",
    taxRate: 0.4135,
    lastTurnout: { year: 2024, votes: 420_000, eligible: 590_000 },
    website: "https://www.fortbendcountytx.gov",
  },
  hcfcd: {
    id: "hcfcd",
    name: "Harris County Flood Control District",
    short: "Flood Control",
    kind: "flood",
    tagline: "Builds and maintains bayous, channels, and detention basins to reduce flooding.",
    controls: [
      "Bayou widening and channel repairs",
      "Detention basins that hold stormwater",
      "Home buyouts in high-risk areas",
      "Which flood bond projects get built first",
    ],
    selection: "Governed by Harris County Commissioners Court. There's no separate board to elect.",
    seats: "Commissioners Court",
    meets: "Decisions happen at Commissioners Court. Community engagement meetings are held by watershed.",
    location: "9900 Northwest Fwy",
    commentRules: "Comment at Commissioners Court, or at watershed engagement meetings and online surveys.",
    taxRate: 0.0489,
    website: "https://www.hcfcd.org",
  },
  "harris-health": {
    id: "harris-health",
    name: "Harris Health System",
    short: "Harris Health",
    kind: "health",
    tagline: "The county's public hospital district: Ben Taub, LBJ, and community clinics.",
    controls: [
      "Public hospitals and clinics",
      "Care for uninsured residents",
      "Its own property tax rate",
    ],
    selection: "A board of managers appointed by Commissioners Court.",
    seats: "9 appointed managers",
    meets: "Monthly, usually the last Thursday, 9 AM",
    location: "4800 Fournace Pl, Bellaire",
    commentRules: "Sign up before the meeting begins. Speakers get up to 3 minutes.",
    taxRate: 0.1631,
    website: "https://www.harrishealth.org",
  },
  hcc: {
    id: "hcc",
    name: "Houston Community College Board of Trustees",
    short: "HCC",
    kind: "college",
    tagline: "Runs HCC campuses: tuition, dual-credit classes for high schoolers, and job programs.",
    controls: [
      "Tuition and fees",
      "Dual-credit courses offered at high schools",
      "Workforce and certificate programs",
      "HCC's property tax rate and bonds",
    ],
    selection: "9 trustees, each elected from a single-member district to a 6-year term.",
    seats: "9 trustees",
    meets: "Monthly, usually the third Thursday, 4 PM",
    location: "HCC Administration Building, 3100 Main St",
    commentRules: "Register by noon on the meeting day. Speakers get up to 3 minutes.",
    taxRate: 0.1067,
    lastTurnout: { year: 2023, votes: 41_000, eligible: 520_000 },
    website: "https://www.hccs.edu",
  },
  lonestar: {
    id: "lonestar",
    name: "Lone Star College Board of Trustees",
    short: "Lone Star College",
    kind: "college",
    tagline: "Runs Lone Star College campuses across north and northwest Harris County.",
    controls: ["Tuition and fees", "Dual-credit courses", "Workforce programs", "Its property tax rate and bonds"],
    selection: "9 trustees elected by district to 6-year terms.",
    seats: "9 trustees",
    meets: "Monthly, usually the first Thursday, 6 PM",
    location: "LSC System Office, 5000 Research Forest Dr",
    commentRules: "Sign up before the meeting. Speakers get up to 3 minutes.",
    taxRate: 0.1076,
    lastTurnout: { year: 2025, votes: 23_000, eligible: 1_100_000 },
    website: "https://www.lonestar.edu",
  },
  sanjac: {
    id: "sanjac",
    name: "San Jacinto College Board of Trustees",
    short: "San Jac",
    kind: "college",
    tagline: "Runs San Jacinto College campuses in east and southeast Harris County.",
    controls: ["Tuition and fees", "Dual-credit courses", "Maritime and industrial training", "Its property tax rate"],
    selection: "7 trustees elected by district to 6-year terms.",
    seats: "7 trustees",
    meets: "Monthly, usually the first Monday, 6 PM",
    location: "District Office, 4624 Fairmont Pkwy, Pasadena",
    commentRules: "Sign up before the meeting begins. Speakers get up to 3 minutes.",
    taxRate: 0.1716,
    website: "https://www.sanjac.edu",
  },
}

/** Deterministic pseudo-data for a MUD, derived from its id. */
export function mudBody(id: string): Body {
  const n = parseInt(id.split("-").pop() ?? "0", 10)
  const fortBend = id.startsWith("fbc")
  const county = fortBend ? "Fort Bend County" : "Harris County"
  const rate = Math.round((0.38 + ((n * 37) % 55) / 100) * 10000) / 10000
  const votes = 9 + ((n * 13) % 48)
  const eligible = 2400 + ((n * 97) % 5200)
  return {
    id,
    name: `${county} MUD No. ${n}`,
    short: `MUD ${n}`,
    kind: "mud",
    tagline:
      "A small special district that provides your water, sewer, and drainage, and sets its own property tax rate.",
    controls: [
      "Water, sewer, and drainage for your neighborhood",
      "Its own property tax rate, which is added to your bill",
      "Bond elections to borrow for new pipes and plants",
      "Sometimes parks, trails, and street lights",
    ],
    selection:
      "5 directors elected by residents of the district to 4-year terms. Elections often draw fewer than 50 voters.",
    seats: "5 directors",
    meets: "Monthly, often on a weekday afternoon",
    location: "The district's law firm office, 1300 Post Oak Blvd (outside the district)",
    commentRules:
      "Public comment is usually allowed at the start of each meeting. No sign-up deadline, so show up a few minutes early.",
    taxRate: rate,
    lastTurnout: { year: 2024, votes, eligible },
    website: "https://www14.tceq.texas.gov/iwud/",
  }
}

export function getBody(id: string): Body | undefined {
  if (id.includes("-mud-")) return mudBody(id)
  return STATIC_BODIES[id]
}

/** Every body that governs a place, from closest-to-home outward. */
export function bodiesFor(j: Jurisdiction): Body[] {
  const list: Body[] = []
  if (j.mud) list.push(mudBody(j.mud))
  const school = STATIC_BODIES[j.isd]
  if (school) list.push(school)
  if (j.city === "houston") {
    list.push({ ...STATIC_BODIES["houston-council"], yourSeat: `District ${j.councilDistrict}` })
  }
  if (j.county === "harris") {
    list.push({ ...STATIC_BODIES["harris-court"], yourSeat: `Precinct ${j.precinct}` })
    list.push({ ...STATIC_BODIES.hcfcd, yourSeat: `${j.watershed} watershed` })
    list.push(STATIC_BODIES["harris-health"])
  } else {
    list.push({ ...STATIC_BODIES["fortbend-court"], yourSeat: `Precinct ${j.precinct}` })
  }
  const college = STATIC_BODIES[j.college]
  if (college) list.push(college)
  return list
}

export const KIND_LABEL: Record<Body["kind"], string> = {
  mud: "Utility district",
  school: "School board",
  city: "City",
  county: "County",
  flood: "Flood control",
  health: "Hospital district",
  college: "Community college",
}
