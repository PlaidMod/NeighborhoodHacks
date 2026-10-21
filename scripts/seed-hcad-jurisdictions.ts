import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { z } from 'zod'
import { db } from '../lib/db'

config({ path: '.env.local', quiet: true })

const mapSchema = z.object({
  source_url: z.string().url(),
  codebook_url: z.string().url(),
  verified_on: z.string().date(),
  mappings: z.array(z.object({
    code: z.string().regex(/^\d{3,6}$/),
    source_name: z.string().min(1),
    body_id: z.string().regex(/^[a-z0-9_]+$/),
  })).min(1),
})
const map = mapSchema.parse(parse(readFileSync('data/hcad-jurisdiction-map.yaml', 'utf8')))
const bodies = z.array(z.object({ id: z.string() })).parse(parse(readFileSync('data/bodies.yaml', 'utf8')))
const bodyIds = new Set(bodies.map((body) => body.id))
if (new Set(map.mappings.map((row) => row.code)).size !== map.mappings.length) throw new Error('Jurisdiction map contains duplicate HCAD codes.')
for (const row of map.mappings) if (!bodyIds.has(row.body_id)) throw new Error(`Jurisdiction map references an unknown body for code ${row.code}.`)

async function main() {
  if (process.argv.includes('--check')) {
    console.log(`Validated ${map.mappings.length} source-backed HCAD jurisdiction mappings (verified ${map.verified_on}).`)
    return
  }
  if (!process.argv.includes('--apply')) throw new Error('Dry run only. Use --apply to upsert the validated jurisdiction map into Supabase.')
  const { error } = await db().from('jurisdiction_map').upsert(map.mappings.map(({ code, body_id }) => ({ hcad_code: code, body_id })), { onConflict: 'hcad_code' })
  if (error) throw new Error('HCAD jurisdiction map upsert failed.')
  console.log(`Upserted ${map.mappings.length} verified HCAD jurisdiction mappings.`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'HCAD jurisdiction map seed failed.')
  process.exitCode = 1
})
