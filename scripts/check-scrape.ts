// §7 smoke assertions over `npm run scrape` output:
//   npx tsx scripts/check-scrape.ts <outDirA> [<outDirB>] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
// With two dirs it also checks idempotency (identical external_id sets).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Item, Meeting } from '@/lib/adapters/types';
import { leakingName } from '@/lib/ingest/redact';
import { dateInWindow, duplicateIds } from '@/lib/ingest/validate';
import { windowFor } from './scrape';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: { from: { type: 'string' }, to: { type: 'string' } },
  allowPositionals: true,
});
const window = windowFor({ kind: 'rotation' }, values.from, values.to);
const load = (dir: string) => ({
  meetings: JSON.parse(readFileSync(join(dir, 'meetings.json'), 'utf8')) as Meeting[],
  items: JSON.parse(readFileSync(join(dir, 'items.json'), 'utf8')) as Item[],
});

const errors: string[] = [];
const a = load(positionals[0]!);
if (a.meetings.length === 0) console.log('note: 0 meetings in window');
for (const m of a.meetings) if (!dateInWindow(m.date, window)) errors.push(`meeting ${m.external_id} date ${m.date} outside window`);
for (const i of a.items) {
  if (!i.title?.trim() || !i.source_url?.trim() || !i.external_id) errors.push(`item ${i.external_id}: missing title/source_url/id`);
  if (i.contains_private_person && leakingName(i.title)) errors.push(`item ${i.external_id}: redaction leak "${i.title.slice(0, 60)}"`);
}
for (const d of duplicateIds(a.items)) errors.push(`duplicate item id ${d}`);
for (const d of duplicateIds(a.meetings)) errors.push(`duplicate meeting id ${d}`);
if (positionals[1]) {
  const b = load(positionals[1]);
  const ids = (x: { external_id: string }[]) => JSON.stringify(x.map((r) => r.external_id).sort());
  if (ids(a.items) !== ids(b.items) || ids(a.meetings) !== ids(b.meetings)) errors.push('idempotency: external_id sets differ');
}
console.log(
  `meetings=${a.meetings.length} items=${a.items.length} redacted=${a.items.filter((i) => i.contains_private_person).length} ` +
    (errors.length ? `FAIL\n${errors.join('\n')}` : 'OK'),
);
process.exit(errors.length ? 1 : 0);
