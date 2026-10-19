import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { InvalidBodyIdError, signBodiesToken, verifyBodiesToken } from '@/lib/tokens'

const SECRET = 'test-secret-only'
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const sign = (payload: string, secret = SECRET) => createHmac('sha256', secret).update(payload).digest('base64url')

describe('bodies_token', () => {
  it('round trip returns sorted unique ids', () => {
    const token = signBodiesToken(['hisd_board', 'hcmud_489', 'houston_council'], SECRET)
    expect(verifyBodiesToken(token, SECRET)).toEqual(['hcmud_489', 'hisd_board', 'houston_council'])
  })

  it('same set in any order with duplicates gives the identical token', () => {
    const a = signBodiesToken(['b', 'a', 'c'], SECRET)
    const b = signBodiesToken(['c', 'a', 'b', 'a'], SECRET)
    expect(a).toBe(b)
  })

  it('edited payload with the old signature returns null', () => {
    const token = signBodiesToken(['hisd_board'], SECRET)
    const [, signature] = token.split('.')
    const edited = `${b64(JSON.stringify({ v: 1, b: ['harris_court'] }))}.${signature}`
    expect(verifyBodiesToken(edited, SECRET)).toBeNull()
  })

  it('truncated token returns null', () => {
    const token = signBodiesToken(['hisd_board', 'hcmud_489'], SECRET)
    expect(verifyBodiesToken(token.slice(0, -5), SECRET)).toBeNull()
  })

  it('token without a dot returns null', () => {
    expect(verifyBodiesToken('abcdef', SECRET)).toBeNull()
  })

  it('non-base64 garbage returns null', () => {
    expect(verifyBodiesToken('%%%.!!!', SECRET)).toBeNull()
    expect(verifyBodiesToken('a.b.c', SECRET)).toBeNull()
  })

  it('wrong secret returns null', () => {
    const token = signBodiesToken(['hisd_board'], SECRET)
    expect(verifyBodiesToken(token, 'another-secret')).toBeNull()
  })

  it('correctly signed v:2 payload returns null', () => {
    const payload = b64(JSON.stringify({ v: 2, b: ['hisd_board'] }))
    expect(verifyBodiesToken(`${payload}.${sign(payload)}`, SECRET)).toBeNull()
  })

  it('correctly signed payload with a bad body id returns null', () => {
    const payload = b64(JSON.stringify({ v: 1, b: ['Not Valid'] }))
    expect(verifyBodiesToken(`${payload}.${sign(payload)}`, SECRET)).toBeNull()
  })

  it("null, undefined and '' return null", () => {
    expect(verifyBodiesToken(null, SECRET)).toBeNull()
    expect(verifyBodiesToken(undefined, SECRET)).toBeNull()
    expect(verifyBodiesToken('', SECRET)).toBeNull()
  })

  it('signing [] throws', () => {
    expect(() => signBodiesToken([], SECRET)).toThrow(InvalidBodyIdError)
  })

  it('signing an id with uppercase or a space throws', () => {
    expect(() => signBodiesToken(['HISD_board'], SECRET)).toThrow(InvalidBodyIdError)
    expect(() => signBodiesToken(['hisd board'], SECRET)).toThrow(InvalidBodyIdError)
  })

  it('signing more than 64 ids throws', () => {
    const ids = Array.from({ length: 65 }, (_, i) => `body_${i}`)
    expect(() => signBodiesToken(ids, SECRET)).toThrow(InvalidBodyIdError)
  })
})
