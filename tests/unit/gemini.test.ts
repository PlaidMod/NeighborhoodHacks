import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXTRACT_MODEL,
  DEFAULT_FALLBACK_MODEL,
  EXTRACT_TIMEOUT_MS,
  buildExtractionPrompt,
  chunkPages,
  extractionJsonSchema,
  geminiFromEnv,
  modelsFromEnv,
  parseExtraction,
  runExtraction,
  type LlmClient,
} from '@/lib/adapters/gemini';

const GOLDEN = fileURLToPath(new URL('../golden/llm-extract/', import.meta.url));
const CASES = ['lonestar-2026-10-01', 'mud489-2026-10-19', 'mud489-2026-04-09'];

type Req = Parameters<LlmClient['generateJson']>[0];
function fakeLlm(outputs: string[] | ((req: Req) => string)) {
  const calls: Req[] = [];
  const client: LlmClient = {
    async generateJson(req) {
      calls.push(req);
      if (typeof outputs === 'function') return outputs(req);
      const next = outputs.shift();
      if (next === undefined) throw new Error('no more outputs');
      return next;
    },
  };
  return { client, calls };
}

describe('extraction schema', () => {
  for (const c of CASES) {
    it(`${c}/gemini_output.json matches the schema`, () => {
      const r = parseExtraction(readFileSync(join(GOLDEN, c, 'gemini_output.json'), 'utf8'));
      expect(r.ok).toBe(true);
    });
  }
  it('JSON schema is generated from zod and has no LLM-owned code fields', () => {
    const s = extractionJsonSchema() as { properties: Record<string, { properties?: Record<string, unknown>; items?: { properties: Record<string, unknown>; required: string[] } }> };
    expect(s).not.toHaveProperty('$schema');
    const item = s.properties.items!.items!;
    expect(Object.keys(item.properties).sort()).toEqual(['agenda_number', 'description', 'section', 'source_quote', 'title']);
    expect(item.required.sort()).toEqual(['source_quote', 'title']);
    for (const banned of ['amounts', 'status', 'external_id', 'body_id']) expect(item.properties).not.toHaveProperty(banned);
    expect(Object.keys(s.properties.meeting!.properties!)).toContain('comment_instructions_quote');
  });
  it('rejects invalid JSON and schema violations', () => {
    expect(parseExtraction('not json').ok).toBe(false);
    expect(parseExtraction('{"meeting":{"date":"2026-10-19","type":"weird"},"items":[]}').ok).toBe(false);
    expect(parseExtraction('{"meeting":{"date":"2026-10-19","type":"regular"},"items":[{"title":"x"}]}').ok).toBe(false);
  });
});

describe('prompt', () => {
  it('carries the Step 6 rules', () => {
    const p = buildExtractionPrompt();
    for (const rule of [/exactly/i, /never invent/i, /an employee/, /do not summarize/i, /boilerplate/i, /20 to 200 characters/]) expect(p).toMatch(rule);
  });
  it('tells the model the meeting when it is already known (PrimeGov)', () => {
    expect(buildExtractionPrompt({ date: '2026-10-20', type: 'regular' })).toMatch(/already known \(2026-10-20, regular\)/);
  });
});

describe('models and client from env', () => {
  it('defaults and overrides', () => {
    expect(modelsFromEnv({})).toEqual({ extract: DEFAULT_EXTRACT_MODEL, fallback: DEFAULT_FALLBACK_MODEL });
    expect(modelsFromEnv({ GEMINI_EXTRACT_MODEL: 'a', GEMINI_EXTRACT_FALLBACK_MODEL: 'b' })).toEqual({ extract: 'a', fallback: 'b' });
  });
  it('no key -> no client', () => {
    expect(geminiFromEnv({})).toBeNull();
    expect(geminiFromEnv({ GEMINI_API_KEY: '  ' })).toBeNull();
    expect(geminiFromEnv({ GEMINI_API_KEY: 'k' })).not.toBeNull();
  });
});

describe('chunkPages', () => {
  const pages = (n: number, size: number) => Array.from({ length: n }, (_, i) => String(i).padEnd(size, 'x'));
  it('one chunk at or under 150k chars', () => {
    expect(chunkPages(pages(10, 15_000))).toHaveLength(1);
  });
  it('splits on page boundaries into ~100k chunks with a 1-page overlap', () => {
    const p = pages(40, 10_000); // 400k chars
    const chunks = chunkPages(p);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.join('').length).toBeLessThanOrEqual(100_000);
    for (let i = 1; i < chunks.length; i++) expect(chunks[i]![0]).toBe(chunks[i - 1]!.at(-1));
    expect(new Set(chunks.flat())).toEqual(new Set(p));
  });
  it('a single huge page is its own chunk', () => {
    expect(chunkPages(['a'.repeat(200_000), 'b'.repeat(10)]).map((c) => c.length)).toEqual([1, 1]);
  });
});

describe('runExtraction (fake client)', () => {
  const ok = readFileSync(join(GOLDEN, 'mud489-2026-10-19', 'gemini_output.json'), 'utf8');
  it('sends the text, the zod-generated schema and a 120 s timeout', async () => {
    const { client, calls } = fakeLlm([ok]);
    const run = await runExtraction(client, 'm1', { pages: ['p1', 'p2'], scanned: false });
    expect(run.parsed[0]?.items).toHaveLength(38);
    expect(calls[0]).toMatchObject({ model: 'm1', text: 'p1\fp2', timeoutMs: EXTRACT_TIMEOUT_MS });
    expect(calls[0]!.pdf).toBeUndefined();
    expect(calls[0]!.schema).toEqual(extractionJsonSchema());
  });
  it('sends the PDF for scanned documents', async () => {
    const { client, calls } = fakeLlm([ok]);
    await runExtraction(client, 'm1', { pages: [''], scanned: true, pdf: new Uint8Array([1, 2, 3]) });
    expect(calls[0]!.pdf).toEqual(new Uint8Array([1, 2, 3]));
    expect(calls[0]!.text).toBeUndefined();
  });
  it('one call per chunk; bad output and thrown errors are recorded, not fatal', async () => {
    let n = 0;
    const { client, calls } = fakeLlm(() => {
      n++;
      if (n === 2) return '{oops';
      if (n === 3) throw new Error('timeout');
      return ok;
    });
    const run = await runExtraction(client, 'm1', { pages: Array.from({ length: 40 }, () => 'x'.repeat(10_000)), scanned: false });
    expect(calls.length).toBe(run.raw.length);
    expect(calls.length).toBeGreaterThan(3);
    expect(run.parsed.filter((p) => p === null)).toHaveLength(2);
    expect(run.errors).toHaveLength(2);
  });
});
