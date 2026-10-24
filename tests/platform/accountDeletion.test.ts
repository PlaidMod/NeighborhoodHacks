import { describe, expect, it } from 'vitest'
import { checkDeleteRequest, deleteAccount } from '@/lib/accountDeletion'

const account = { id: 'user-1', email: 'reader@example.com', name: null, avatar: null }
const sameSite = { origin: 'https://showup.test', requestOrigin: 'https://showup.test', fetchSite: 'same-origin' }

describe('checkDeleteRequest', () => {
  it('allows a signed-in reader posting from this site', () => {
    expect(checkDeleteRequest({ account, isAdmin: false, ...sameSite })).toEqual({ ok: true, userId: 'user-1' })
  })

  it('refuses a guest', () => {
    expect(checkDeleteRequest({ account: null, isAdmin: false, ...sameSite })).toEqual({ ok: false, reason: 'signed_out' })
  })

  it('refuses team admin accounts, which the team removes by hand', () => {
    expect(checkDeleteRequest({ account, isAdmin: true, ...sameSite })).toEqual({ ok: false, reason: 'admin' })
  })

  it('refuses a post from another site, or one with no Origin header', () => {
    const cross = { ok: false, reason: 'cross_site' }
    expect(checkDeleteRequest({ account, isAdmin: false, ...sameSite, origin: 'https://evil.test' })).toEqual(cross)
    expect(checkDeleteRequest({ account, isAdmin: false, ...sameSite, origin: null })).toEqual(cross)
    expect(checkDeleteRequest({ account, isAdmin: false, ...sameSite, fetchSite: 'cross-site' })).toEqual(cross)
  })
})

describe('deleteAccount', () => {
  it('deletes the user, then signs out', async () => {
    const calls: string[] = []
    const ok = await deleteAccount('user-1', {
      deleteUser: async (id) => (calls.push(`delete ${id}`), { error: null }),
      signOut: async () => void calls.push('sign out'),
    })
    expect(ok).toBe(true)
    expect(calls).toEqual(['delete user-1', 'sign out'])
  })

  it('keeps the reader signed in when deleting fails, so they can try again', async () => {
    const calls: string[] = []
    const ok = await deleteAccount('user-1', {
      deleteUser: async (id) => (calls.push(`delete ${id}`), { error: new Error('Auth is down') }),
      signOut: async () => void calls.push('sign out'),
    })
    expect(ok).toBe(false)
    expect(calls).toEqual(['delete user-1'])
  })

  it('still succeeds when signing out fails after the user is gone', async () => {
    const ok = await deleteAccount('user-1', {
      deleteUser: async () => ({ error: null }),
      signOut: async () => {
        throw new Error('session not found')
      },
    })
    expect(ok).toBe(true)
  })
})
