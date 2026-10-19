// Records Legistar golden fixtures (agent-scraper-spec §8 Step 2):
//   npx tsx scripts/record-legistar.ts
// Writes tests/golden/legistar/<client>-<eventId>/{event.json,eventitems.json}.
// Read-only GETs through http.ts (>= 500 ms per host).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getText } from '@/lib/adapters/http';
import { LEGISTAR_BASE, PAGE_SIZE, eventItemsUrl } from '@/lib/adapters/legistar';

const FIXTURES: [string, number][] = [
  ['harriscountytx', 1244],
  ['harriscountytx', 1242],
  ['harriscountytx', 1243],
  ['houstonisd', 1306],
  ['houstonisd', 1332],
];

const MAX_BYTES = 1_000_000;
const DROP = /Guid$|RowVersion$/;

function compact(row: unknown): unknown {
  if (Array.isArray(row)) return row.map(compact);
  if (row && typeof row === 'object') {
    return Object.fromEntries(
      Object.entries(row)
        .filter(([k, v]) => v !== null && !DROP.test(k))
        .map(([k, v]) => [k, compact(v)]),
    );
  }
  return row;
}

const serialize = (rows: unknown[]) => '[\n' + rows.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n';

async function main() {
  for (const [client, id] of FIXTURES) {
    const dir = join('tests', 'golden', 'legistar', `${client}-${id}`);
    mkdirSync(dir, { recursive: true });
    const event = JSON.parse(await getText(`${LEGISTAR_BASE}/${client}/events/${id}`));
    const rows: unknown[] = [];
    for (let skip = 0; ; skip += PAGE_SIZE) {
      const page = JSON.parse(await getText(`${eventItemsUrl(client, id)}&$top=${PAGE_SIZE}&$skip=${skip}`)) as unknown[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    writeFileSync(join(dir, 'event.json'), JSON.stringify(event, null, 2) + '\n');
    // Compact: drop null fields and GUID/row-version noise, one row per line.
    // Trim to the first N rows (agenda order) if still over 1 MB; see README.md.
    let kept = rows.map(compact);
    let text = serialize(kept);
    while (Buffer.byteLength(text) > MAX_BYTES) {
      kept = kept.slice(0, Math.floor(kept.length * 0.9));
      text = serialize(kept);
    }
    writeFileSync(join(dir, 'eventitems.json'), text);
    console.log(`${client} ${id}: ${rows.length} rows, kept ${kept.length} (${Buffer.byteLength(text)} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
