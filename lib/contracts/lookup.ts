// P1 contract for POST /api/lookup (Technical_Implementation_Plan.md section 3).

import type { BodyType } from './bodyTypes'

export type LookupRequest = { address: string }

export type LookupErrorCode = 'invalid_address' | 'not_found' | 'outside_harris' | 'rate_limited' | 'server_error'

export type LookupBody = {
  id: string
  name: string
  type: BodyType | null
  category: 'tracked' | 'ballot_list' | 'not_government' | 'regional_coming_soon'
  elected_or_appointed: string | null
  description: string | null
  meeting_info_url: string | null
  /** True only when the authoritative jurisdiction source supports this body assignment. */
  verified: boolean
  source_kind: 'hcad' | 'gis' | 'census' | 'manual' | null
  /** Source link for the displayed tax rate only; jurisdiction evidence is identified by source_kind. */
  tax_source_url: string | null
  tax_rate: number | null
  tax_year: number | null
  last_vote_date: string | null
}

export type LookupBallotOffice = {
  id: string
  body_id: string | null
  office_name: string | null
  holder_name: string | null
  next_election_date: string | null
  source_url: string | null
}

export type LookupHoa = {
  subdivision_name: string
  hoa_body_id: string | null
  master_hoa_body_id: string | null
  source_url: string | null
  association_verified: boolean
  /** Address-to-subdivision extraction is heuristic; the resident still confirms the candidate. */
  status: 'needs_confirmation'
}

export type LookupResponse = {
  /** Signed list of body IDs (lib/tokens.ts). No address or coordinates. */
  bodies_token: string
  bodies: LookupBody[]
  ballot: LookupBallotOffice[]
  not_government: LookupBody[]
  regional: LookupBody[]
  hoa: LookupHoa | null
}

export type LookupErrorResponse = { error: { code: LookupErrorCode; message: string } }

/** HTTP status for each error code. */
export const LOOKUP_ERROR_STATUS: Record<LookupErrorCode, number> = {
  invalid_address: 400,
  not_found: 404,
  outside_harris: 422,
  rate_limited: 429,
  server_error: 500,
}
