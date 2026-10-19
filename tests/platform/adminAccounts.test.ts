import { describe, expect, it } from 'vitest'
import {
  ensureAdminAccount,
  findUserId,
  NotAdminEmailError,
  passwordProblem,
  setAdminPassword,
  type AuthAdmin,
} from '@/lib/adminAccounts'

const ALLOW = ['a@x.com', 'b@y.org']

/** In-memory stand-in for supabase.auth.admin that records every call. */
function fakeAdmin(emails: string[] = []) {
  const users = emails.map((email, i) => ({ id: `u${i}`, email, password: undefined as string | undefined }))
  const calls: { method: string; args: unknown[] }[] = []
  const admin: AuthAdmin = {
    async listUsers(params) {
      calls.push({ method: 'listUsers', args: [params] })
      const perPage = params?.perPage ?? 50
      const page = params?.page ?? 1
      return { data: { users: users.slice((page - 1) * perPage, page * perPage) }, error: null }
    },
    async createUser(attrs) {
      calls.push({ method: 'createUser', args: [attrs] })
      const user = { id: `u${users.length}`, email: attrs.email, password: undefined }
      users.push(user)
      return { data: { user }, error: null }
    },
    async updateUserById(id, attrs) {
      calls.push({ method: 'updateUserById', args: [id, attrs] })
      const user = users.find((u) => u.id === id)!
      user.password = attrs.password
      return { data: { user }, error: null }
    },
  }
  return { admin, users, calls }
}

describe('passwordProblem', () => {
  it('asks for at least 12 characters', () => {
    expect(passwordProblem('elevenchars', 'elevenchars')).toMatch(/12/)
    expect(passwordProblem('twelve chars', 'twelve chars')).toBeNull()
  })

  it('rejects two different entries', () => {
    expect(passwordProblem('correct horse battery', 'correct horse batterY')).toMatch(/match/)
  })

  it('rejects more than 72 characters, the most Supabase accepts', () => {
    expect(passwordProblem('a'.repeat(73), 'a'.repeat(73))).toMatch(/72/)
    expect(passwordProblem('a'.repeat(72), 'a'.repeat(72))).toBeNull()
  })
})

describe('findUserId', () => {
  it('pages through the user list until it finds the email', async () => {
    const { admin } = fakeAdmin(['p@q.com', 'r@s.com', 't@u.com', 'v@w.com', 'b@y.org'])
    expect(await findUserId(admin, 'B@Y.org', 2)).toBe('u4')
    expect(await findUserId(admin, 'nobody@z.net', 2)).toBeNull()
  })
})

describe('ensureAdminAccount', () => {
  it('creates a confirmed account with no password for a listed email', async () => {
    const { admin, calls } = fakeAdmin()
    expect(await ensureAdminAccount(admin, ' A@X.com ', ALLOW)).toEqual({ id: 'u0', created: true })
    const create = calls.find((c) => c.method === 'createUser')!
    expect(create.args[0]).toEqual({ email: 'a@x.com', email_confirm: true })
  })

  it('leaves an existing account alone, ignoring case', async () => {
    const { admin, calls } = fakeAdmin(['a@x.com'])
    expect(await ensureAdminAccount(admin, 'A@x.COM', ALLOW)).toEqual({ id: 'u0', created: false })
    expect(calls.some((c) => c.method === 'createUser')).toBe(false)
  })

  it('refuses an email that is not on the admin list', async () => {
    const { admin, calls } = fakeAdmin()
    await expect(ensureAdminAccount(admin, 'c@z.net', ALLOW)).rejects.toBeInstanceOf(NotAdminEmailError)
    expect(calls).toEqual([])
  })

  it('passes on an error from Supabase', async () => {
    const { admin } = fakeAdmin()
    admin.listUsers = async () => ({ data: { users: [] }, error: { message: 'service unavailable' } })
    await expect(ensureAdminAccount(admin, 'a@x.com', ALLOW)).rejects.toThrow('service unavailable')
  })
})

describe('setAdminPassword', () => {
  it("sets the password on that admin's account", async () => {
    const { admin, users } = fakeAdmin(['a@x.com', 'b@y.org'])
    expect(await setAdminPassword(admin, 'b@y.org', 'correct horse battery', ALLOW)).toEqual({ created: false })
    expect(users[1]!.password).toBe('correct horse battery')
    expect(users[0]!.password).toBeUndefined()
  })

  it("creates the account first when it doesn't exist", async () => {
    const { admin, users } = fakeAdmin()
    expect(await setAdminPassword(admin, 'a@x.com', 'correct horse battery', ALLOW)).toEqual({ created: true })
    expect(users[0]).toMatchObject({ email: 'a@x.com', password: 'correct horse battery' })
  })

  it('refuses a short password without touching the account', async () => {
    const { admin, calls } = fakeAdmin(['a@x.com'])
    await expect(setAdminPassword(admin, 'a@x.com', 'short', ALLOW)).rejects.toThrow(/12/)
    expect(calls).toEqual([])
  })
})
