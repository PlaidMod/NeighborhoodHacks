// One place to read environment variables, with clear errors when one is missing.
// Plain TypeScript (no Next.js imports) so command-line scripts can use it too.

export type EnvName =
  // Technical_Implementation_Plan.md section 21
  | 'SUPABASE_URL'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'GEMINI_API_KEY'
  | 'TWILIO_ACCOUNT_SID'
  | 'TWILIO_AUTH_TOKEN'
  | 'TWILIO_MESSAGING_SERVICE_SID'
  | 'TWILIO_VERIFY_SID'
  | 'BODIES_TOKEN_SECRET'
  | 'CRON_SECRET'
  | 'ADMIN_EMAILS'
  | 'DEMO_MODE'
  // Added by P5
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  | 'SITE_URL'
  | 'OPENROUTER_API_KEY'
  | 'GEMINI_MODEL'
  | 'GEMINI_EXTRACT_MODEL'
  | 'GEMINI_EXTRACT_FALLBACK_MODEL'
  | 'GEMINI_JUDGE_MODEL'
  | 'IP_HASH_SECRET'
  | 'COACH_TRUSTED_IP_HEADER'
  | 'DEMO_RECORD'
  | 'SUPABASE_DB_URL'
  // Set by Vercel: 'production', 'preview' or 'development'
  | 'VERCEL_ENV'

export class MissingEnvError extends Error {
  constructor(public readonly variable: EnvName) {
    super(`Missing environment variable ${variable}. Add it to .env.local (see .env.example).`)
    this.name = 'MissingEnvError'
  }
}

/** The value of an environment variable, or undefined when it's unset or empty. */
export function getOptionalEnv(name: EnvName): string | undefined {
  const value = process.env[name]
  return value === undefined || value === '' ? undefined : value
}

/** The value of an environment variable. Throws MissingEnvError when it's unset or empty. */
export function getEnv(name: EnvName): string {
  const value = getOptionalEnv(name)
  if (value === undefined) throw new MissingEnvError(name)
  return value
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true'
}

export function isDemoRecord(): boolean {
  return process.env.DEMO_RECORD === 'true'
}

/** ADMIN_EMAILS as a list: comma-separated, lowercased, blanks dropped. */
export function adminEmails(): string[] {
  return (getOptionalEnv('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

/** Throws if called in a browser. Server secrets must never be read there. */
export function assertServer(what: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(`${what} is server-only and can't run in the browser.`)
  }
}
