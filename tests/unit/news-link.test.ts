import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { LlmClient } from '@/lib/adapters/gemini';
import type { Item, Meeting, NewsArticle } from '@/lib/adapters/types';
import { sha256 } from '@/lib/ingest/hash';
import {
  MAX_CANDIDATES,
  buildLinkInput,
  candidateSetHash,
  candidatesFor,
  linkArticles,
  validateLinks,
} from '@/lib/news/linkArticles';

const DIR = fileURLToPath(new URL('../golden/news-articles/links/', import.meta.url));
const MODELS = { extract: 'test-extract', fallback: 'test-fallback' };

type CaseInput = { article: Omit<NewsArticle, 'text' | 'fetched_at' | 'word_count' | 'content_hash' | 'content_type' | 'status'>; meetings: Meeting[]; items: Item[] };

function loadCase(name: string) {
  const read = (f: string) => readFileSync(join(DIR, name, f), 'utf8');
  const input = JSON.parse(read('candidates.json')) as CaseInput;
  const text = read('article.txt').trimEnd();
  const article: NewsArticle = {
    ...input.article,
    text,
    fetched_at: '2026-10-19T08:00:00Z',
    word_count: text.split(/\s+/).length,
    content_hash: sha256(text),
    content_type: 'news',
    status: 'ok',
  };
  return { article, meetings: input.meetings, items: input.items, output: read('gemini_output.json'), expected: JSON.parse(read('expected.json')) };
}

function fakeLlm(output: string) {
  const calls: { system: string; text?: string; model: string }[] = [];
  const llm: LlmClient = {
    async generateJson(req) {
      calls.push({ system: req.system, text: req.text, model: req.model });
      return output;
    },
  };
  return { llm, calls };
}

async function runCase(name: string) {
  const c = loadCase(name);
  const { llm, calls } = fakeLlm(c.output);
  const res = await linkArticles([c.article], { items: c.items, meetings: c.meetings, llm, models: MODELS });
  return {
    c,
    calls,
    res,
    summary: {
      candidates: candidatesFor(c.article, c.items, c.meetings).map((x) => x.item_external_id),
      called: calls.length > 0,
      links: res.links.map((l) => ({ item_external_id: l.item_external_id, proof_quote: l.proof_quote })),
      proposed: res.stats.proposed,
      rejected: res.stats.rejected,
      warnings: res.warnings,
    },
  };
}

const CASES = readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

describe('Step 11c golden cases', () => {
  it('has all 7 recorded cases', () => {
    expect(CASES).toEqual([
      'changed-word',
      'fake-quote',
      'one-true-link',
      'passing-mention',
      'prompt-injection',
      'published-after-meeting',
      'unknown-id',
    ]);
  });

  for (const name of CASES) {
    it(`${name} matches expected.json`, async () => {
      const { summary, c } = await runCase(name);
      expect(summary).toEqual(c.expected);
    });
  }

  it('one true link is kept with the model name', async () => {
    const { res } = await runCase('one-true-link');
    expect(res.links).toHaveLength(1);
    expect(res.links[0]!.model).toBe('test-extract');
    expect(res.warnings).toEqual([]);
  });

  it('rejections carry their reason', async () => {
    expect((await runCase('unknown-id')).res.warnings[0]).toMatch(/not in the candidate list/);
    expect((await runCase('fake-quote')).res.warnings[0]).toMatch(/proof_quote not in article text/);
    expect((await runCase('changed-word')).res.warnings[0]).toMatch(/proof_quote not in article text/);
    expect((await runCase('passing-mention')).res.warnings[0]).toMatch(/relation passing_mention/);
  });

  it('an article published after the only meeting gets no candidates and no call', async () => {
    const { calls, res } = await runCase('published-after-meeting');
    expect(calls).toHaveLength(0);
    expect(res.stats.no_candidates).toBe(1);
    expect(res.links).toEqual([]);
  });

  it('prompt injection: only links that pass validation survive (3)', async () => {
    const { res } = await runCase('prompt-injection');
    expect(res.stats.proposed).toBe(14);
    expect(res.links).toHaveLength(3);
    expect(res.stats.rejected).toBe(11);
    expect(res.warnings.some((w) => /not in the candidate list/.test(w))).toBe(true);
    expect(res.warnings.some((w) => /over 3 links/.test(w))).toBe(true);
    expect(res.warnings.some((w) => /proof_quote not in article text/.test(w))).toBe(true);
  });

  it('the prompt wraps the article in <article> tags, lists candidates and warns about untrusted data', async () => {
    const { calls } = await runCase('one-true-link');
    expect(calls[0]!.model).toBe('test-extract');
    expect(calls[0]!.system).toMatch(/untrusted data/);
    expect(calls[0]!.text).toMatch(/<article>\nHeadline: [\s\S]*<\/article>$/);
    expect(calls[0]!.text).toContain('6c18fc10effd6a27ecb77ef37816071d51c6e32e');
  });
});

describe('candidatesFor (D33)', () => {
  const c = loadCase('one-true-link');
  const lsMeeting = c.meetings.find((m) => m.body_id === 'lone_star_board')!;

  it('keeps only items of the article bodies', () => {
    const ids = candidatesFor(c.article, c.items, c.meetings).map((x) => x.item_external_id);
    expect(ids).toHaveLength(12);
    expect(c.items.filter((i) => i.body_id === 'hcmud_489').every((i) => !ids.includes(i.external_id))).toBe(true);
  });

  it('needs the meeting to start after published_at and at most 45 days later', () => {
    const at = (published_at: string) => candidatesFor({ ...c.article, published_at }, c.items, c.meetings).length;
    expect(at('2026-08-17T10:30:00-05:00')).toBe(12); // exactly 45 days before
    expect(at('2026-08-17T10:29:00-05:00')).toBe(0); // 45 days + 1 minute
    expect(at(lsMeeting.date)).toBe(0); // published at the start: not after
    expect(at('2026-10-01T10:29:00-05:00')).toBe(12);
    expect(at('not a date')).toBe(0);
  });

  it('allows any status, sorts by meeting date and caps at 40', () => {
    const meetings: Meeting[] = [0, 1, 2].map((d) => ({ ...lsMeeting, external_id: `m${d}`, date: `2026-10-0${3 - d}T10:00:00-05:00` }));
    const items: Item[] = Array.from({ length: 60 }, (_, n) => ({
      ...c.items[0]!,
      external_id: `i${String(n).padStart(2, '0')}`,
      meeting_external_id: `m${n % 3}`,
      status: n % 2 ? 'decided' : 'upcoming',
    }));
    const out = candidatesFor(c.article, items, meetings);
    expect(out).toHaveLength(MAX_CANDIDATES);
    const dates = out.map((x) => Date.parse(x.meeting_date));
    expect([...dates].sort((a, b) => a - b)).toEqual(dates);
    expect(out[0]!.meeting_date).toBe('2026-10-01T10:00:00-05:00');
  });

  it('uses body names when given', () => {
    const out = candidatesFor(c.article, c.items, c.meetings, { lone_star_board: 'Lone Star College Board of Trustees' });
    expect(out[0]!.body_name).toBe('Lone Star College Board of Trustees');
    expect(out.find((x) => x.item_external_id === '6c18fc10effd6a27ecb77ef37816071d51c6e32e')).toEqual(expect.objectContaining({ section: 'Tax Rate Public Hearing', meeting_date: lsMeeting.date }));
  });

  it('candidate-set hash ignores order', () => {
    const cs = candidatesFor(c.article, c.items, c.meetings);
    expect(candidateSetHash([...cs].reverse())).toBe(candidateSetHash(cs));
    expect(candidateSetHash(cs.slice(1))).not.toBe(candidateSetHash(cs));
  });
});

describe('validateLinks', () => {
  const c = loadCase('one-true-link');
  const cands = candidatesFor(c.article, c.items, c.meetings);
  const id = cands[0]!.item_external_id;

  it('accepts a quote broken by a hyphenated line end and differing whitespace/curly quotes', () => {
    const art = { external_id: 'a', text: 'The trustees will hold a public hear-\ning on the “proposed” tax rate for tax year 2026.' };
    const v = validateLinks(art, cands, { links: [{ item_external_id: id, relation: 'about_item', proof_quote: 'hold a public hear-ing on the "proposed"  tax rate' }] }, 'm');
    expect(v.links).toHaveLength(1);
  });

  it('rejects quotes shorter than 20 or longer than 300 characters, and duplicates', () => {
    const long = 'x'.repeat(301);
    const v = validateLinks({ external_id: 'a', text: c.article.text! + long }, cands, {
      links: [
        { item_external_id: id, relation: 'about_item', proof_quote: 'Lone Star College' },
        { item_external_id: id, relation: 'about_item', proof_quote: long },
        { item_external_id: id, relation: 'about_item', proof_quote: 'hold a public hearing on the proposed tax rate' },
        { item_external_id: id, relation: 'about_item', proof_quote: 'hold a public hearing on the proposed tax rate' },
      ],
    }, 'm');
    expect(v.links).toHaveLength(1);
    expect(v.rejected).toBe(3);
    expect(v.warnings.join('\n')).toMatch(/length 17[\s\S]*length 301[\s\S]*duplicate/);
  });
});

describe('linkArticles run behaviour', () => {
  const c = loadCase('one-true-link');

  it('skips the call when content_hash and candidate set are unchanged, and reuses the stored links', async () => {
    const first = fakeLlm(c.output);
    const r1 = await linkArticles([c.article], { items: c.items, meetings: c.meetings, llm: first.llm, models: MODELS });
    const second = fakeLlm(c.output);
    const r2 = await linkArticles([c.article], { items: c.items, meetings: c.meetings, llm: second.llm, models: MODELS, prev: r1.state });
    expect(second.calls).toHaveLength(0);
    expect(r2.stats.skipped_unchanged).toBe(1);
    expect(r2.links).toEqual(r1.links);

    // changed text -> call again
    const changed = { ...c.article, text: c.article.text + ' More.', content_hash: sha256(c.article.text + ' More.') };
    const third = fakeLlm(c.output);
    await linkArticles([changed], { items: c.items, meetings: c.meetings, llm: third.llm, models: MODELS, prev: r1.state });
    expect(third.calls).toHaveLength(1);

    // changed candidate set -> call again
    const fourth = fakeLlm(c.output);
    await linkArticles([c.article], { items: c.items.slice(1), meetings: c.meetings, llm: fourth.llm, models: MODELS, prev: r1.state });
    expect(fourth.calls).toHaveLength(1);
  });

  it('ignores articles that are not ok', async () => {
    const f = fakeLlm(c.output);
    const { text: _t, ...noText } = c.article;
    const r = await linkArticles([{ ...noText, status: 'paywalled' }], { items: c.items, meetings: c.meetings, llm: f.llm, models: MODELS });
    expect(f.calls).toHaveLength(0);
    expect(r.links).toEqual([]);
  });

  it('without an LLM it warns once and links nothing', async () => {
    const r = await linkArticles([c.article, { ...c.article, external_id: 'b' }], { items: c.items, meetings: c.meetings, llm: null, models: MODELS });
    expect(r.links).toEqual([]);
    expect(r.warnings).toEqual(['llm_unavailable: no OPENROUTER_API_KEY or GEMINI_API_KEY is set; articles were not linked']);
  });

  it('bad JSON and thrown errors become warnings', async () => {
    const bad = await linkArticles([c.article], { items: c.items, meetings: c.meetings, llm: fakeLlm('{"links": "x"}').llm, models: MODELS });
    expect(bad.warnings[0]).toMatch(/LLM output rejected: schema/);
    const llm: LlmClient = { generateJson: async () => { throw new Error('timeout'); } };
    const thrown = await linkArticles([c.article], { items: c.items, meetings: c.meetings, llm, models: MODELS });
    expect(thrown.warnings[0]).toMatch(/LLM call failed: timeout/);
  });

  it('never mutates the items or meetings it is given (D32)', async () => {
    const items = structuredClone(c.items);
    const meetings = structuredClone(c.meetings);
    await linkArticles([loadCase('prompt-injection').article], { items, meetings, llm: fakeLlm(loadCase('prompt-injection').output).llm, models: MODELS });
    expect(items).toEqual(c.items);
    expect(meetings).toEqual(c.meetings);
  });

  it('buildLinkInput puts candidates before the article', () => {
    const s = buildLinkInput(c.article, candidatesFor(c.article, c.items, c.meetings));
    expect(s.indexOf('Candidates')).toBeLessThan(s.indexOf('<article>'));
  });
});

describe('LLM isolation in lib/news', () => {
  it('linkArticles.ts is the only lib/news module that imports the LLM client', () => {
    const dir = fileURLToPath(new URL('../../lib/news/', import.meta.url));
    const users = readdirSync(dir).filter((f) => /gemini|@google\/genai/.test(readFileSync(join(dir, f), 'utf8')));
    expect(users).toEqual(['linkArticles.ts']);
  });
});
