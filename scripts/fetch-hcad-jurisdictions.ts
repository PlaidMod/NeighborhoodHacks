// Regenerates data/hcad-jurisdictions.json from HCAD's public jurisdiction list:
//   npx tsx scripts/fetch-hcad-jurisdictions.ts
// Keeps only each tax code and its official name. The page also lists tax collectors' names and
// phone numbers (left out), and its links often point at the tax collector rather than the
// government itself, so links are left out too.
import { writeFileSync } from 'node:fs'
import { getText } from '../lib/adapters/http'

const SOURCE_URL = 'https://public.hcad.org/resources/jurlist.asp'

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

export function parseJurisdictionList(html: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of html.split(/<tr[\s>]/i).slice(1)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]!)
    if (cells.length < 2) continue
    const code = decode(cells[0]!)
    const name = decode(cells[1]!)
    if (/^\d{3}$/.test(code) && name) out[code] = name
  }
  return out
}

async function main() {
  const jurisdictions = parseJurisdictionList(await getText(SOURCE_URL, { timeoutMs: 60_000 }))
  const count = Object.keys(jurisdictions).length
  if (count < 100) throw new Error(`only ${count} jurisdictions parsed; the page layout may have changed`)
  const sorted = Object.fromEntries(Object.entries(jurisdictions).sort(([a], [b]) => a.localeCompare(b)))
  const file = { source_url: SOURCE_URL, fetched: new Date().toISOString().slice(0, 10), jurisdictions: sorted }
  writeFileSync('data/hcad-jurisdictions.json', JSON.stringify(file, null, 2) + '\n')
  console.log(`wrote ${count} HCAD jurisdictions to data/hcad-jurisdictions.json`)
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()!)
if (isMain) main().catch((e) => { console.error((e as Error).message); process.exit(1) })
