import type { BodyType } from '@/lib/contracts/bodyTypes'
import type { LookupUncovered } from '@/lib/contracts/lookup'
import hcadList from '@/data/hcad-jurisdictions.json'

// Governments on an address that ShowUp doesn't track yet: HCAD tax codes with no curated
// body, and Census places or school districts outside the body catalog. They are listed by
// their official name instead of failing the lookup, and never go into the bodies_token.
// Names come from HCAD's public jurisdiction list (scripts/fetch-hcad-jurisdictions.ts).

const NAMES = (hcadList as { jurisdictions: Record<string, string> }).jurisdictions

/** Codes that apply to every Harris County address but have no tracked body (Census fallback lists them). */
export const COUNTYWIDE_UNCOVERED_CODES = ['043', '044'] as const

export function hcadJurisdictionName(code: string): string | null {
  return NAMES[code] ?? null
}

const ACRONYMS = new Set(['ISD', 'MUD', 'WCID', 'FWSD', 'UD', 'PUD', 'TIRZ', 'ESD', 'MMD', 'LID', 'HCAD'])
const SMALL = new Set(['OF', 'AND', 'THE', 'FOR'])

function titleWords(text: string): string {
  return text
    .split(' ')
    .map((word, i) => {
      if (ACRONYMS.has(word) || /\d/.test(word)) return word
      if (i > 0 && SMALL.has(word)) return word.toLowerCase()
      return word.charAt(0) + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/** "HC EMERG SRV DIST 009" -> "Harris County Emergency Services District 9". Wording is kept; only spelling-out and case change. */
export function displayHcadName(name: string): string {
  let text = name.replace(/\s+/g, ' ').trim().toUpperCase()
  const city = text.match(/^(.+), CITY OF$/)
  if (city) return `City of ${titleWords(city[1]!)}`
  text = text
    .replace(/^HC\b/, 'HARRIS COUNTY')
    .replace(/\bEMERG(?:ENCY)?\s+S(?:E)?RV(?:ICES?)?\s+DIST(?:RICT)?\b/, 'EMERGENCY SERVICES DISTRICT')
    .replace(/\b0+(\d+)\b/g, '$1')
  return titleWords(text)
}

export function typeFromHcadName(name: string): BodyType {
  const n = name.toUpperCase()
  if (/COLLEGE/.test(n)) return 'college_board'
  if (/\bISD\b|INDEPENDENT SCHOOL/.test(n)) return 'school_board'
  if (/, CITY OF$|^CITY OF\b|\bTOWN OF\b/.test(n)) return 'city_council'
  if (/^HARRIS COUNTY$/.test(n)) return 'commissioners_court'
  if (/FLOOD CONTROL/.test(n)) return 'flood_control'
  if (/PORT OF HOUSTON/.test(n)) return 'port'
  if (/\bEMERG|\bESD\b/.test(n)) return 'esd'
  if (/REGIONAL WATER|WATER AUTH|SUBSIDENCE/.test(n)) return 'water_authority'
  if (/\bMUD\b|MUNICIPAL UTIL|\bWCID\b|WATER CONTROL|\bFWSD\b|FRESH WATER|\bU\.?D\.?\b|UTILITY DIST|\bPUD\b/.test(n)) return 'mud'
  return 'other'
}

export function uncoveredFromHcadCode(code: string): LookupUncovered {
  const name = hcadJurisdictionName(code)
  return {
    key: `hcad:${code}`,
    name: name ? displayHcadName(name) : `HCAD tax code ${code}`,
    type: name ? typeFromHcadName(name) : 'other',
    source_kind: 'hcad',
  }
}
