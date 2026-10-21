import type { SourceConfig } from '@/lib/adapters/types';
import type { Json } from '@/lib/database.types';
import { TRACKED_BODIES } from './bodies';
import { DEFAULT_RESULTS_MAX_DAYS } from './health';
import type { IngestStore, SourceSeed } from './store';

// Rows every run needs first: the tracked bodies (insert-only) and the sources, mirrored from
// data/sources.yaml. The YAML stays the source of truth; the table copy is what joins and FKs use.

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function sourceSeed(s: SourceConfig): SourceSeed {
  return {
    id: s.id,
    body_id: s.body_id ?? null,
    adapter: s.adapter,
    config: s.config as Json,
    expected_max_gap_days: num(s.config.expected_max_gap_days),
    results_max_days: num(s.config.results_max_days) ?? DEFAULT_RESULTS_MAX_DAYS,
  };
}

export async function seedAll(store: IngestStore, sources: SourceConfig[]): Promise<void> {
  await store.ensureBodies(TRACKED_BODIES);
  await store.syncSources(sources.map(sourceSeed));
}
