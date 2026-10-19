import { beforeEach, describe, expect, it } from 'vitest';
import { HttpError, USER_AGENT, getText, resetHostSpacing } from '@/lib/adapters/http';
import { AdapterResultSchema } from '@/lib/adapters/types';
import { parseCli } from '@/scripts/scrape';

const noSleep = async () => {};

describe('http (mocked fetch, no network)', () => {
  beforeEach(() => resetHostSpacing());
  it('sends UA and decodes UTF-8', async () => {
    let ua = '';
    const fetchImpl = (async (_u: string, init?: RequestInit) => {
      ua = (init?.headers as Record<string, string>)['User-Agent']!;
      return new Response(new TextEncoder().encode('café “x”'));
    }) as typeof fetch;
    expect(await getText('https://a.gov/x', { fetchImpl, sleep: noSleep })).toBe('café “x”');
    expect(ua).toBe(USER_AGENT);
  });
  it('retries 5xx twice then succeeds', async () => {
    let n = 0;
    const fetchImpl = (async () => (++n < 3 ? new Response('', { status: 503 }) : new Response('ok'))) as typeof fetch;
    expect(await getText('https://b.gov/x', { fetchImpl, sleep: noSleep })).toBe('ok');
    expect(n).toBe(3);
  });
  it('does not retry 4xx', async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n++;
      return new Response('', { status: 404 });
    }) as typeof fetch;
    await expect(getText('https://c.gov/x', { fetchImpl, sleep: noSleep })).rejects.toBeInstanceOf(HttpError);
    expect(n).toBe(1);
  });
  it('spaces requests to the same host', async () => {
    const waits: number[] = [];
    const fetchImpl = (async () => new Response('ok')) as typeof fetch;
    const sleep = async (ms: number) => {
      waits.push(ms);
    };
    await getText('https://d.gov/1', { fetchImpl, sleep });
    await getText('https://d.gov/2', { fetchImpl, sleep });
    expect(waits.length).toBe(1);
    expect(waits[0]).toBeGreaterThan(0);
  });
});

describe('scrape CLI args', () => {
  it('parses flags', () => {
    expect(parseCli(['--source', 'hisd_board', '--record'])).toMatchObject({
      source: 'hisd_board',
      mode: { kind: 'rotation' },
      out: 'tmp/scrape',
      record: true,
    });
    expect(parseCli(['--source', 's', '--mode', 'results', '--meetings', 'a,b']).mode).toEqual({
      kind: 'results',
      meeting_external_ids: ['a', 'b'],
    });
  });
  it('requires --source, and --meetings for results', () => {
    expect(() => parseCli([])).toThrow();
    expect(() => parseCli(['--source', 's', '--mode', 'results'])).toThrow();
  });
  it('AdapterResultSchema accepts an empty result', () => {
    expect(AdapterResultSchema.parse({ meetings: [], items: [], documents: [], result_updates: [], warnings: [] })).toBeTruthy();
  });
});
