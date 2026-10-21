import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { z } from 'zod'
import { db } from '../lib/db'

config({ path: '.env.local', quiet: true })

const bodySchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  type: z.enum(['city_council', 'commissioners_court', 'school_board', 'college_board', 'mud', 'esd', 'water_authority', 'flood_control', 'port', 'metro', 'hcad', 'hoa', 'other']),
  category: z.enum(['tracked', 'ballot_list', 'not_government', 'regional_coming_soon']),
  elected_or_appointed: z.string().min(1),
  impact_rank: z.number().int().nonnegative(),
  sms_eligible: z.boolean(),
  description_en: z.string().min(1),
  description_es: z.string().min(1),
  meeting_info_url: z.string().url(),
  source_url: z.string().url(),
  tax_set_by_body_id: z.string().regex(/^[a-z0-9_]+$/).optional(),
  operations_by_body_id: z.string().regex(/^[a-z0-9_]+$/).optional(),
  regulated_by: z.string().optional(),
  operator_name: z.string().optional(),
})

const rows = z.array(bodySchema).min(1).parse(parse(readFileSync('data/bodies.yaml', 'utf8')))
if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error('Body catalog contains duplicate IDs.')
for (const row of rows) {
  if (row.tax_set_by_body_id && !rows.some((candidate) => candidate.id === row.tax_set_by_body_id)) {
    throw new Error(`Body catalog has an unresolved tax-setting relationship for ${row.id}.`)
  }
}

async function main() {
  if (process.argv.includes('--check')) {
    console.log(`Validated ${rows.length} canonical body catalog entries.`)
    return
  }
  if (!process.argv.includes('--apply')) throw new Error('Dry run only. Use --apply to upsert the validated catalog into Supabase.')
  const { error } = await db().from('bodies').upsert(rows.map(({ source_url: _sourceUrl, ...body }) => body), { onConflict: 'id' })
  if (error) throw new Error('Body catalog upsert failed.')
  console.log(`Upserted ${rows.length} canonical body catalog entries.`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Body catalog seed failed.')
  process.exitCode = 1
})
