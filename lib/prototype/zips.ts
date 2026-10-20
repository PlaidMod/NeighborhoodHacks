import type { Jurisdiction } from "./types"

/**
 * Demo lookup table: ZIP → the districts that cover most of that ZIP.
 * Real lookups would geocode the address and run point-in-polygon checks
 * against city, county, ISD, and TCEQ water-district boundaries (or read the
 * parcel's jurisdiction list from the appraisal district).
 */
type Row = [
  zip: string,
  area: string,
  council: string | null,
  precinct: string,
  isd: string,
  college: string,
  hasMud: boolean,
  watershed: string,
  county?: "harris" | "fortbend",
]

const ROWS: Row[] = [
  ["77002", "Downtown", "I", "1", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77003", "East Downtown", "I", "2", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77004", "Third Ward", "D", "1", "hisd", "hcc", false, "Brays Bayou"],
  ["77005", "Rice Village", "C", "1", "hisd", "hcc", false, "Brays Bayou"],
  ["77006", "Montrose", "C", "1", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77007", "Rice Military", "C", "1", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77008", "The Heights", "C", "1", "hisd", "hcc", false, "White Oak Bayou"],
  ["77009", "Near Northside", "H", "1", "hisd", "hcc", false, "Little White Oak Bayou"],
  ["77011", "Magnolia Park", "I", "2", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77012", "Harrisburg", "I", "2", "hisd", "hcc", false, "Brays Bayou"],
  ["77016", "Trinity Gardens", "B", "1", "hisd", "hcc", false, "Hunting Bayou"],
  ["77017", "Park Place", "I", "2", "hisd", "hcc", false, "Sims Bayou"],
  ["77018", "Oak Forest", "A", "1", "hisd", "hcc", false, "White Oak Bayou"],
  ["77019", "River Oaks", "G", "4", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77020", "Denver Harbor", "H", "2", "hisd", "hcc", false, "Hunting Bayou"],
  ["77021", "OST / South Union", "D", "1", "hisd", "hcc", false, "Brays Bayou"],
  ["77022", "Northside", "H", "1", "hisd", "hcc", false, "Little White Oak Bayou"],
  ["77023", "Eastwood", "I", "2", "hisd", "hcc", false, "Brays Bayou"],
  ["77024", "Memorial", "G", "4", "sbisd", "hcc", false, "Buffalo Bayou"],
  ["77025", "Braeswood", "K", "1", "hisd", "hcc", false, "Brays Bayou"],
  ["77026", "Kashmere Gardens", "B", "1", "hisd", "hcc", false, "Hunting Bayou"],
  ["77027", "Upper Kirby", "G", "4", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77028", "Settegast", "B", "1", "hisd", "hcc", false, "Hunting Bayou"],
  ["77029", "Clinton Park", "I", "2", "galenapark", "sanjac", false, "Hunting Bayou"],
  ["77030", "Texas Medical Center", "K", "1", "hisd", "hcc", false, "Brays Bayou"],
  ["77031", "Westwood", "K", "4", "alief", "hcc", false, "Brays Bayou"],
  ["77033", "South Park", "D", "1", "hisd", "hcc", false, "Sims Bayou"],
  ["77034", "Southeast Houston", "E", "2", "pasadena", "sanjac", false, "Armand Bayou"],
  ["77035", "Westbury", "K", "4", "hisd", "hcc", false, "Brays Bayou"],
  ["77036", "Gulfton / Sharpstown", "J", "4", "hisd", "hcc", false, "Brays Bayou"],
  ["77038", "North Houston", null, "1", "aldine", "lonestar", true, "Greens Bayou"],
  ["77040", "Fairbanks", "A", "3", "cyfair", "lonestar", false, "White Oak Bayou"],
  ["77041", "Carverdale", "A", "3", "cyfair", "lonestar", true, "White Oak Bayou"],
  ["77042", "Westchase", "F", "4", "hisd", "hcc", false, "Brays Bayou"],
  ["77043", "Spring Branch West", "A", "3", "sbisd", "hcc", false, "Buffalo Bayou"],
  ["77044", "Summerwood", "E", "2", "humble", "lonestar", true, "San Jacinto River"],
  ["77045", "Hiram Clarke", "K", "1", "hisd", "hcc", false, "Sims Bayou"],
  ["77047", "South Acres", "D", "1", "hisd", "hcc", false, "Sims Bayou"],
  ["77048", "Sunnyside", "D", "1", "hisd", "hcc", false, "Sims Bayou"],
  ["77049", "Sheldon", null, "2", "sheldon", "sanjac", true, "San Jacinto River"],
  ["77051", "South Union", "D", "1", "hisd", "hcc", false, "Sims Bayou"],
  ["77054", "Astrodome", "D", "1", "hisd", "hcc", false, "Brays Bayou"],
  ["77055", "Spring Branch", "A", "3", "sbisd", "hcc", false, "Brickhouse Gully"],
  ["77056", "Galleria", "G", "4", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77057", "Briar Grove", "G", "4", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77058", "Clear Lake", "E", "2", "clearcreek", "sanjac", false, "Armand Bayou"],
  ["77059", "Bay Oaks", "E", "2", "clearcreek", "sanjac", true, "Clear Creek"],
  ["77060", "Greenspoint", "B", "1", "aldine", "lonestar", false, "Greens Bayou"],
  ["77061", "Gulfgate", "I", "2", "hisd", "hcc", false, "Sims Bayou"],
  ["77062", "Clear Lake City", "E", "2", "clearcreek", "sanjac", false, "Armand Bayou"],
  ["77063", "Woodlake", "J", "4", "hisd", "hcc", false, "Brays Bayou"],
  ["77064", "Willowbrook", null, "3", "cyfair", "lonestar", true, "Cypress Creek"],
  ["77065", "Jersey Village", null, "3", "cyfair", "lonestar", true, "Cypress Creek"],
  ["77066", "Champions", null, "3", "klein", "lonestar", true, "Cypress Creek"],
  ["77067", "Greenspoint North", "B", "1", "aldine", "lonestar", false, "Greens Bayou"],
  ["77068", "Champions Forest", null, "3", "klein", "lonestar", true, "Cypress Creek"],
  ["77069", "Champions West", null, "3", "klein", "lonestar", true, "Cypress Creek"],
  ["77070", "Vintage Park", null, "3", "cyfair", "lonestar", true, "Cypress Creek"],
  ["77071", "Brays Oaks", "K", "4", "hisd", "hcc", false, "Brays Bayou"],
  ["77072", "Alief", "F", "4", "alief", "hcc", false, "Brays Bayou"],
  ["77073", "North Harris", null, "1", "aldine", "lonestar", true, "Greens Bayou"],
  ["77074", "Sharpstown", "J", "4", "hisd", "hcc", false, "Brays Bayou"],
  ["77075", "Hobby", "I", "2", "hisd", "hcc", false, "Sims Bayou"],
  ["77076", "Northline", "H", "1", "aldine", "lonestar", false, "Greens Bayou"],
  ["77077", "Energy Corridor", "G", "4", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77078", "East Houston", "B", "2", "hisd", "hcc", false, "Hunting Bayou"],
  ["77079", "Memorial West", "G", "4", "sbisd", "hcc", false, "Buffalo Bayou"],
  ["77080", "Spring Branch North", "A", "3", "sbisd", "hcc", false, "Brickhouse Gully"],
  ["77081", "Gulfton", "J", "4", "hisd", "hcc", false, "Brays Bayou"],
  ["77082", "Westchase South", "F", "4", "alief", "hcc", false, "Brays Bayou"],
  ["77083", "Mission Bend", "F", "4", "alief", "hcc", false, "Brays Bayou"],
  ["77084", "Bear Creek", null, "3", "cyfair", "lonestar", true, "Addicks Reservoir"],
  ["77085", "Fondren Southwest", "K", "1", "hisd", "hcc", false, "Sims Bayou"],
  ["77086", "Inwood", null, "1", "aldine", "lonestar", true, "Greens Bayou"],
  ["77087", "Park Place South", "I", "2", "hisd", "hcc", false, "Sims Bayou"],
  ["77088", "Acres Homes", "B", "1", "hisd", "hcc", false, "Halls Bayou"],
  ["77089", "Southbelt", "E", "2", "pasadena", "sanjac", false, "Clear Creek"],
  ["77090", "Ponderosa", null, "3", "spring", "lonestar", true, "Cypress Creek"],
  ["77091", "Independence Heights", "B", "1", "hisd", "hcc", false, "Halls Bayou"],
  ["77092", "Garden Oaks", "A", "1", "hisd", "hcc", false, "White Oak Bayou"],
  ["77093", "Aldine", "H", "1", "aldine", "lonestar", false, "Halls Bayou"],
  ["77094", "Barker", null, "3", "katy", "hcc", true, "Barker Reservoir"],
  ["77095", "Copperfield", null, "3", "cyfair", "lonestar", true, "Addicks Reservoir"],
  ["77096", "Meyerland", "K", "4", "hisd", "hcc", false, "Brays Bayou"],
  ["77098", "Upper Kirby West", "C", "1", "hisd", "hcc", false, "Buffalo Bayou"],
  ["77099", "Alief West", "F", "4", "alief", "hcc", false, "Brays Bayou"],
  ["77339", "Kingwood", "E", "2", "humble", "lonestar", false, "San Jacinto River"],
  ["77345", "Kingwood East", "E", "2", "humble", "lonestar", false, "San Jacinto River"],
  ["77346", "Atascocita", null, "2", "humble", "lonestar", true, "Lake Houston"],
  ["77373", "Spring", null, "3", "spring", "lonestar", true, "Spring Creek"],
  ["77379", "Klein", null, "3", "klein", "lonestar", true, "Cypress Creek"],
  ["77388", "Spring Northwest", null, "3", "klein", "lonestar", true, "Spring Creek"],
  ["77429", "Cypress", null, "3", "cyfair", "lonestar", true, "Cypress Creek"],
  ["77433", "Cypress / Bridgeland", null, "3", "cyfair", "lonestar", true, "Cypress Creek"],
  ["77449", "Katy North", null, "3", "katy", "lonestar", true, "Addicks Reservoir"],
  ["77450", "Katy", null, "3", "katy", "hcc", true, "Barker Reservoir"],
  ["77494", "Katy / Cinco Ranch", null, "1", "katy", "hcc", true, "Barker Reservoir", "fortbend"],
]

export const ZIPS: Record<string, Jurisdiction> = Object.fromEntries(
  ROWS.map(([zip, area, council, precinct, isd, college, hasMud, watershed, county]) => [
    zip,
    {
      zip,
      area,
      city: council ? "houston" : null,
      councilDistrict: council ?? undefined,
      county: county ?? "harris",
      precinct,
      isd,
      college,
      mud: hasMud ? mudIdFor(zip, county ?? "harris") : undefined,
      watershed,
    } satisfies Jurisdiction,
  ]),
)

function mudIdFor(zip: string, county: "harris" | "fortbend") {
  const n = (parseInt(zip.slice(2), 10) * 7 + 41) % 480 + 12
  return `${county === "fortbend" ? "fbc" : "hc"}-mud-${n}`
}

export const DEMO_ADDRESSES = [
  { label: "3100 Cleburne St, Houston, TX 77004", hint: "Third Ward · HISD" },
  { label: "12014 Fallbrook Dr, Houston, TX 77065", hint: "Unincorporated · MUD · Cy-Fair" },
  { label: "8800 Bellaire Blvd, Houston, TX 77036", hint: "Gulfton · renters" },
  { label: "2400 Cinco Ranch Blvd, Katy, TX 77494", hint: "Fort Bend · MUD · Katy ISD" },
  { label: "1500 Heights Blvd, Houston, TX 77008", hint: "The Heights" },
]

export function findJurisdiction(address: string): Jurisdiction | null {
  const zip = address.match(/\b(77\d{3})\b/)?.[1]
  if (zip && ZIPS[zip]) return ZIPS[zip]
  const lower = address.toLowerCase()
  const byArea = Object.values(ZIPS).find((j) => lower.includes(j.area.toLowerCase()))
  return byArea ?? null
}

export const SUPPORTED_ZIP_COUNT = ROWS.length
