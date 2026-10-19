import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import type { AdapterResult, Item, Meeting, NewsMention, NewsResult } from '@/lib/adapters/types';

describe('news isolation (D26, D32)', () => {
  it('NewsMention is not assignable to Item, Meeting or AdapterResult (type test)', () => {
    const m = {} as NewsMention;
    // @ts-expect-error a news mention must never be usable as an agenda item
    const asItem: Item = m;
    // @ts-expect-error nor as a meeting
    const asMeeting: Meeting = m;
    const r = {} as NewsResult;
    // @ts-expect-error a news result is not an adapter result
    const asResult: AdapterResult = r;
    expect([asItem, asMeeting, asResult]).toHaveLength(3);
  });

  it('eslint forbids lib/adapters and lib/ingest from importing lib/news', async () => {
    const eslint = new ESLint();
    for (const filePath of ['lib/ingest/_isolation_probe.ts', 'lib/adapters/_isolation_probe.ts']) {
      for (const spec of ['@/lib/news/collect', '../news/match']) {
        const [res] = await eslint.lintText(`import { x } from '${spec}';\nexport const y = x;\n`, { filePath });
        expect(res!.messages.map((m) => m.ruleId)).toContain('no-restricted-imports');
      }
    }
    const [ok] = await eslint.lintText(`import { sha1 } from '@/lib/ingest/hash';\nexport const y = sha1;\n`, {
      filePath: 'lib/news/_isolation_probe.ts',
    });
    expect(ok!.messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  }, 30_000);
});
