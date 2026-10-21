import { normalizeAddressInput } from '@/lib/address'

const SUFFIXES: Record<string, string> = {
  AVENUE: 'AVE', BOULEVARD: 'BLVD', CIRCLE: 'CIR', COURT: 'CT', DRIVE: 'DR',
  EXPRESSWAY: 'EXPY', FREEWAY: 'FWY', HIGHWAY: 'HWY', LANE: 'LN', PARKWAY: 'PKWY',
  PLACE: 'PL', ROAD: 'RD', SQUARE: 'SQ', STREET: 'ST', TERRACE: 'TER', TRAIL: 'TRL',
  TURNPIKE: 'TPKE',
}

const UNIT_MARKER = /\s+(?:APT|APARTMENT|BLDG|BUILDING|LOT|STE|SUITE|UNIT|#)\s+[^,]+$/i

/**
 * Canonical form shared by the HCAD loader and address lookup. Unit designators are
 * removed because HCAD's site address identifies the parcel, not an apartment door.
 */
export function normalizeHcadAddress(raw: string): string {
  // HCAD keys are parcel-level street addresses; discard optional city/state/ZIP fields.
  const streetLine = normalizeAddressInput(raw).split(',')[0]
  const upper = streetLine.toUpperCase().replace(/[.,]/g, ' ')
  const withoutUnit = upper.replace(UNIT_MARKER, '').replace(/\s+#\s*\S+$/, '')
  const tokens = withoutUnit.split(/\s+/).filter(Boolean)
  if (tokens.length > 0) {
    const last = tokens[tokens.length - 1]
    if (SUFFIXES[last]) tokens[tokens.length - 1] = SUFFIXES[last]
  }
  return tokens.join(' ')
}

/** Never mix an unrelated address suggestion with a Census point for parcel selection. */
export function parcelAddressCandidates(args: {
  censusMatchedAddress: string
  censusQueryAddress: string
} | null, fallbackAddresses: readonly string[]): string[] {
  return args
    ? [...new Set([args.censusMatchedAddress, args.censusQueryAddress])]
    : [...fallbackAddresses]
}
