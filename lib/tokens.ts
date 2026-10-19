import { createHmac, timingSafeEqual } from 'node:crypto'
import { getEnv } from './env'

// bodies_token (Technical_Implementation_Plan.md section 3): a signed list of body IDs
// for links like /weekly?t=<token>. It holds no address and no coordinates.
//
// Format: <payload>.<signature>
//   payload   = base64url of the JSON {"v":1,"b":[...sorted, unique body IDs]}
//   signature = base64url of HMAC-SHA256(BODIES_TOKEN_SECRET, payload)

const VERSION = 1
const MAX_IDS = 64
const BODY_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/

export class InvalidBodyIdError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBodyIdError'
  }
}

function canonical(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort()
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function isValidIdList(ids: unknown): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.length <= MAX_IDS &&
    ids.every((id) => typeof id === 'string' && BODY_ID.test(id))
  )
}

/** Signs a set of body IDs. The same set always gives the same token, whatever the order. */
export function signBodiesToken(bodyIds: readonly string[], secret: string = getEnv('BODIES_TOKEN_SECRET')): string {
  const ids = canonical(bodyIds)
  if (!isValidIdList(ids)) {
    throw new InvalidBodyIdError(
      `A bodies_token needs 1 to ${MAX_IDS} body IDs made of lowercase letters, digits, "_" or "-".`,
    )
  }
  const payload = Buffer.from(JSON.stringify({ v: VERSION, b: ids }), 'utf8').toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

/**
 * Returns the body IDs in a token, or null if the token is missing, cut off,
 * edited, signed with another secret, or in an unknown format.
 */
export function verifyBodiesToken(token: string | null | undefined, secret?: string): string[] | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts

  const expected = Buffer.from(sign(payload, secret ?? getEnv('BODIES_TOKEN_SECRET')))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  let data: unknown
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { v, b } = data as { v?: unknown; b?: unknown }
  if (v !== VERSION || !isValidIdList(b)) return null
  return canonical(b)
}
