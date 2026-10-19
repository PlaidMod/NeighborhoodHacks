// DRAFT shared contract for POST /api/lookup (Technical_Implementation_Plan.md section 3).
// P1 owns the route: P1 signs off on this file and narrows the `unknown` element types.

export type LookupRequest = { address: string }

export type LookupErrorCode = 'invalid_address' | 'not_found' | 'outside_harris' | 'rate_limited' | 'server_error'

export type LookupResponse = {
  /** Signed list of body IDs (lib/tokens.ts). No address or coordinates. */
  bodies_token: string
  bodies: unknown[]
  ballot: unknown[]
  not_government: unknown[]
  regional: unknown[]
  hoa: unknown | null
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
