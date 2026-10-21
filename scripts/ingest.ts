// CLI: writes scraped agendas to Supabase from a laptop (no Vercel time limit).
//   npm run ingest -- --seed                         bodies and sources only
//   npm run ingest -- --source <id> [--mode rotation|near_term|results] [--meetings id1,id2]
//                     [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--dry-run]
//   npm run ingest -- --scheduled                    the same stages as /api/cron/ingest, no time limit
// Reads .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and an AI key for AI-read agendas).
// Prints counts as JSON. Warnings (which can quote agenda text) go to this console only.
import { parseArgs } from 'node:util';
import { config as loadEnv } from 'dotenv';
import type { RunMode } from '@/lib/adapters/types';
import { getSource, loadSources } from '@/lib/ingest/registry';
import { runIngest } from '@/lib/ingest/run';
import { runScheduled } from '@/lib/ingest/scheduled';
import { seedAll } from '@/lib/ingest/seed';
import { supabaseIngestStore } from '@/lib/ingest/supabaseStore';
import { windowFor } from './scrape';

function fail(msg: string): never {
  console.error(`ingest: ${msg}`);
  process.exit(1);
}

export function parseIngestCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      seed: { type: 'boolean', default: false },
      scheduled: { type: 'boolean', default: false },
      source: { type: 'string' },
      mode: { type: 'string', default: 'rotation' },
      meetings: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
    strict: true,
  });
  const picked = [values.seed && !values.source, values.scheduled, !!values.source].filter(Boolean).length;
  if (picked !== 1) throw new Error('pass exactly one of --seed, --scheduled or --source <id>');
  let mode: RunMode;
  if (values.mode === 'rotation') mode = { kind: 'rotation' };
  else if (values.mode === 'near_term') mode = { kind: 'near_term' };
  else if (values.mode === 'results') {
    const ids = (values.meetings ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!ids.length) throw new Error('--mode results needs --meetings id1,id2');
    mode = { kind: 'results', meeting_external_ids: ids };
  } else throw new Error(`unknown --mode ${values.mode}`);
  return { seed: values.seed!, scheduled: values.scheduled!, source: values.source, mode, from: values.from, to: values.to, dryRun: values['dry-run']! };
}

async function main() {
  loadEnv({ path: '.env.local', quiet: true });
  let args: ReturnType<typeof parseIngestCli>;
  try {
    args = parseIngestCli(process.argv.slice(2));
  } catch (e) {
    fail((e as Error).message);
  }
  const store = supabaseIngestStore;
  const sources = loadSources();

  if (args.scheduled) {
    const report = await runScheduled({ store, sources, budgetMs: Number.POSITIVE_INFINITY, maxLlmDocs: null });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exit(1);
    return;
  }

  if (!args.dryRun) await seedAll(store, sources);
  if (!args.source) {
    console.log(`seeded: ${(await store.listSources()).length} sources; bodies inserted where missing`);
    return;
  }

  const source = getSource(args.source);
  const maxDays = typeof source.config.results_max_days === 'number' ? source.config.results_max_days : 45;
  const report = await runIngest({ store, source, mode: args.mode, window: windowFor(args.mode, args.from, args.to, maxDays), dryRun: args.dryRun });
  const { warning_text, ...counts } = report;
  for (const w of warning_text) console.error(`warning: ${w}`);
  console.log(JSON.stringify(counts, null, 2));
  if (!report.ok) process.exit(1);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()!);
if (isMain) {
  main().catch((e) => fail((e as Error).stack ?? String(e)));
}
