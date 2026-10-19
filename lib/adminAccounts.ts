// Accounts for the admin pages. P5 creates them without passwords, and each admin then sets
// their own with scripts/admin-account.ts. Supabase's built-in email can't send setup links
// to people outside the Supabase organization, so there is no email step.
import { adminEmails } from './env'

export const MIN_PASSWORD_LENGTH = 12
// Supabase rejects passwords longer than this.
export const MAX_PASSWORD_LENGTH = 72

type ApiError = { message: string } | null

/** The part of supabase.auth.admin used here, so tests can pass a fake. */
export interface AuthAdmin {
  listUsers(params?: { page?: number; perPage?: number }): Promise<{
    data: { users: { id: string; email?: string }[] }
    error: ApiError
  }>
  createUser(attributes: { email: string; email_confirm: boolean }): Promise<{
    data: { user: { id: string } | null }
    error: ApiError
  }>
  updateUserById(id: string, attributes: { password: string }): Promise<{ error: ApiError }>
}

export class NotAdminEmailError extends Error {
  constructor(email: string) {
    super(`${email} isn't in ADMIN_EMAILS in .env.local.`)
    this.name = 'NotAdminEmailError'
  }
}

/** What's wrong with a new password and its repeat, or null when it's fine. */
export function passwordProblem(password: string, repeat: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters. A few words with spaces works well.`
  }
  if (password.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`
  if (password !== repeat) return "The two passwords don't match."
  return null
}

function normalize(email: string): string {
  return email.trim().toLowerCase()
}

function check<T extends { error: ApiError }>(result: T): T {
  if (result.error) throw new Error(`Supabase: ${result.error.message}`)
  return result
}

/** The account ID for an email, or null when there's no account. */
export async function findUserId(admin: AuthAdmin, email: string, perPage = 1000): Promise<string | null> {
  const wanted = normalize(email)
  for (let page = 1; ; page++) {
    const { data } = check(await admin.listUsers({ page, perPage }))
    const match = data.users.find((user) => user.email && normalize(user.email) === wanted)
    if (match) return match.id
    if (data.users.length < perPage) return null
  }
}

/** Creates a confirmed account with no password for an admin email, unless it already exists. */
export async function ensureAdminAccount(
  admin: AuthAdmin,
  email: string,
  allow: string[] = adminEmails(),
): Promise<{ id: string; created: boolean }> {
  const address = normalize(email)
  if (!allow.includes(address)) throw new NotAdminEmailError(address)
  const existing = await findUserId(admin, address)
  if (existing) return { id: existing, created: false }
  const { data } = check(await admin.createUser({ email: address, email_confirm: true }))
  if (!data.user) throw new Error(`Supabase didn't return the new account for ${address}.`)
  return { id: data.user.id, created: true }
}

/** Sets an admin's password, creating their account first if needed. */
export async function setAdminPassword(
  admin: AuthAdmin,
  email: string,
  password: string,
  allow: string[] = adminEmails(),
): Promise<{ created: boolean }> {
  const problem = passwordProblem(password, password)
  if (problem) throw new Error(problem)
  const { id, created } = await ensureAdminAccount(admin, email, allow)
  check(await admin.updateUserById(id, { password }))
  return { created }
}
