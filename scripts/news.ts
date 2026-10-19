// CLI: npm run news -- [--out tmp/news] [--record]
// Step 11: reads data/news_feeds.yaml, matches against data/news_terms.yaml and writes mentions.json + warnings.json.
// --record saves the raw feeds to tests/golden/news/feeds/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { NewsResultSchema } from '@/lib/adapters/types';
import { collectNews, loadFeeds } from '@/lib/news/collect';
import { loadTerms } from '@/lib/news/match';

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function parseNewsCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      out: { type: 'string', default: 'tmp/news' },
      record: { type: 'boolean', default: false },
    },
    strict: true,
  });
  return { out: values.out!, record: values.record! };
}

async function main() {
  const args = parseNewsCli(process.argv.slice(2));
  const feeds = loadFeeds();
  const terms = loadTerms();
  const res = await collectNews(feeds, terms);
  const result = NewsResultSchema.parse({ mentions: res.mentions, warnings: res.warnings });
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'mentions.json'), JSON.stringify(result.mentions, null, 2));
  writeFileSync(join(args.out, 'warnings.json'), JSON.stringify(result.warnings, null, 2));
  writeFileSync(join(args.out, 'sources.json'), JSON.stringify(res.sources, null, 2));
  if (args.record) {
    const dir = 'tests/golden/news/feeds';
    mkdirSync(dir, { recursive: true });
    for (const [outlet, xml] of Object.entries(res.raw)) writeFileSync(join(dir, `${slug(outlet)}.xml`), xml);
  }
  const perBody: Record<string, number> = {};
  for (const m of result.mentions) for (const b of m.body_ids) perBody[b] = (perBody[b] ?? 0) + 1;
  const perOutlet: Record<string, number> = {};
  for (const m of result.mentions) perOutlet[m.outlet] = (perOutlet[m.outlet] ?? 0) + 1;
  console.log(JSON.stringify({ mentions: result.mentions.length, perBody, perOutlet, warnings: result.warnings }, null, 2));
}

if (process.argv[1] && /news\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
