import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { assertServer, getEnv } from './env'

let client: SupabaseClient<Database> | undefined

/**
 * The shared server-side database client. It uses the secret key, which bypasses
 * row level security, so it must only ever run on the server.
 */
export function db(): SupabaseClient<Database> {
  assertServer('db()')
  client ??= createClient<Database>(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
