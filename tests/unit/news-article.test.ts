import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetHostSpacing } from '@/lib/adapters/http';
import type { NewsArticle, NewsMention } from '@/lib/adapters/types';
import { HostGate, extractText, fetchArticles, hasPaywallMarker, wordCount, type FetchArticlesOptions } from '@/lib/news/article';
import { parseFeeds, type FeedConfig, type MentionSource } from '@/lib/news/collect';
import { RobotsCache, parseRobots } from '@/lib/news/robots';

const page = (n: string) => readFileSync(`tests/golden/news-articles/pages/${n}.html`, 'utf8');
const robotsFx = (n: string) => readFileSync(`tests/golden/news-articles/robots/${n}.txt`, 'utf8');
const FEED: FeedConfig = parseFeeds(`- { outlet: Test, url: "https://news.example/feed" }`)[0]!;
const HPM = 'https://www.houstonpublicmedia.org';
const A = 'https://news.example/news/a';
const ROBOTS = 'https://news.example/robots.txt';
const robotsOk = { [ROBOTS]: 'User-agent: *\nAllow: /\n' };

const mention = (id: string, url: string, headline = 'HISD board to vote on budget'): NewsMention => ({
  external_id: id,
  outlet: 'Test',
  headline,
  url,
  published_at: '2026-10-18T12:00:00.000Z',
  body_ids: ['hisd_board'],
  matched_terms: ['HISD'],
  forward_looking: true,
});
const src = (categories: string[] = [], feed_updated_at = '2026-10-18T12:00:00.000Z'): MentionSource => ({
  feed_outlet: 'Test',
  categories,
  feed_updated_at,
});

/** Mock fetch: url -> body or status. Records every call. */
function mockFetch(routes: Record<string, string | number>) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const r = routes[url];
    if (typeof r === 'string') return new Response(r, { status: 200 });
    return new Response('x', { status: r ?? 404 });
  }) as typeof fetch;
  return { calls, impl };
}
const noSleep = async () => {};
async function run(mentions: NewsMention[], routes: Record<string, string | number>, extra: Partial<FetchArticlesOptions> = {}) {
  const f = mockFetch(routes);
  const r = await fetchArticles(mentions, {
    feeds: [FEED],
    sources: Object.fromEntries(mentions.map((m) => [m.external_id, src()])),
    http: { fetchImpl: f.impl, sleep: noSleep, retries: 0 },
    gate: new HostGate(noSleep),
    now: () => new Date('2026-10-19T12:00:00Z'),
    ...extra,
  });
  return { ...r, calls: f.calls };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('readability on recorded pages', () => {
  it('real HPM articles give >= 300 words and no paywall marker', () => {
    for (const n of ['hpm-whitmire-homelessness', 'hpm-da-ice-witness']) {
      expect(wordCount(extractText(page(n))!)).toBeGreaterThanOrEqual(300);
      expect(hasPaywallMarker(page(n))).toBe(false);
    }
  });
  it('detects the hand-made paywall page', () => expect(hasPaywallMarker(page('handmade-paywall'))).toBe(true));
});

describe('fetchArticles', () => {
  it('ok, too_short, paywalled (no text), removed, fetch_failed', async () => {
    const r = await run(
      ['/news/a', '/v/short', '/p', '/gone', '/err'].map((p, i) => mention(String(i), `https://news.example${p}`)),
      {
        ...robotsOk,
        [A]: page('hpm-whitmire-homelessness'),
        'https://news.example/v/short': page('hpm-engines-podcast-short'),
        'https://news.example/p': page('handmade-paywall'),
        'https://news.example/gone': 410,
        'https://news.example/err': 503,
      },
    );
    expect(r.articles.map((a) => a.status)).toEqual(['ok', 'too_short', 'paywalled', 'removed', 'fetch_failed']);
    expect(r.articles[0]!.word_count).toBeGreaterThanOrEqual(300);
    expect(r.articles[0]!.text).toContain('Whitmire');
    expect(r.articles[1]!.text).toBeUndefined();
    expect(r.articles[2]!.text).toBeUndefined();
    expect(r.links).toEqual([]);
  });

  it('opinion URLs and categories are never requested', async () => {
    const f = mockFetch(robotsOk);
    const r = await fetchArticles([mention('1', 'https://news.example/opinion/x'), mention('2', A)], {
      feeds: [FEED],
      sources: { '1': src(), '2': src(['Commentary']) },
      http: { fetchImpl: f.impl, sleep: noSleep, retries: 0 },
      gate: new HostGate(noSleep),
    });
    expect(r.articles.map((a) => a.status)).toEqual(['opinion_excluded', 'opinion_excluded']);
    expect(f.calls).toEqual([]);
  });

  it('a robots-disallowed path is never requested; robots.txt fetched once per host', async () => {
    const r = await run([mention('1', 'https://news.example/private/x'), mention('2', A)], {
      [ROBOTS]: robotsFx('handmade-disallow'),
      [A]: page('hpm-da-ice-witness'),
    });
    expect(r.articles.map((a) => a.status)).toEqual(['robots_blocked', 'ok']);
    expect(r.calls).toEqual([ROBOTS, A]);
  });

  it('D36: a Google-Extended group does not apply; a group naming our bot does', async () => {
    const ok = await run([mention('1', A)], { [ROBOTS]: robotsFx('handmade-google-extended'), [A]: page('hpm-da-ice-witness') });
    expect(ok.articles[0]!.status).toBe('ok');
    const blocked = await run([mention('1', A)], { [ROBOTS]: robotsFx('handmade-names-our-bot'), [A]: page('hpm-da-ice-witness') });
    expect(blocked.articles[0]!.status).toBe('robots_blocked');
    expect(blocked.calls).toEqual([ROBOTS]);
  });

  it('real HPM robots.txt allows article paths and blocks /videos/', () => {
    const r = parseRobots(HPM, robotsFx('houstonpublicmedia.org'));
    expect(r.allowed(`${HPM}/articles/news/city-of-houston/2026/10/16/564595/x/`)).toBe(true);
    expect(r.allowed(`${HPM}/videos/x`)).toBe(false);
  });

  it('unreadable robots.txt blocks the host; missing robots.txt allows', async () => {
    const r1 = await run([mention('1', A)], { [ROBOTS]: 500, [A]: page('hpm-da-ice-witness') });
    expect(r1.articles[0]!.status).toBe('robots_blocked');
    expect(r1.warnings[0]).toMatch(/robots.txt unreadable/);
    const r2 = await run([mention('1', A)], { [ROBOTS]: 404, [A]: page('hpm-da-ice-witness') });
    expect(r2.articles[0]!.status).toBe('ok');
  });

  it('robots.txt is cached for 24 hours', async () => {
    let t = 0;
    let n = 0;
    const cache = new RobotsCache(
      async () => {
        n++;
        return 'User-agent: *\nAllow: /';
      },
      () => t,
    );
    await cache.forUrl(A);
    t = 23 * 3600e3;
    await cache.forUrl(A);
    expect(n).toBe(1);
    t = 25 * 3600e3;
    await cache.forUrl(A);
    expect(n).toBe(2);
  });

  it('honors Crawl-delay and the 2 s minimum between same-host requests (fake timers)', async () => {
    // Earlier tests leave real-clock times in http.ts's per-host spacing. If those times are
    // after the fake clock's start, the fetch would wait hours, so clear them first.
    resetHostSpacing();
    vi.useFakeTimers({ now: new Date('2026-10-19T12:00:00Z') });
    const f = mockFetch({
      [ROBOTS]: robotsFx('handmade-disallow'), // Crawl-delay: 5
      'https://news.example/a': page('hpm-da-ice-witness'),
      'https://news.example/b': page('hpm-da-ice-witness'),
      'https://other.example/robots.txt': 'User-agent: *\nAllow: /',
      'https://other.example/c': page('hpm-da-ice-witness'),
      'https://other.example/d': page('hpm-da-ice-witness'),
    });
    const times: Record<string, number> = {};
    const impl = (async (u: string | URL | Request) => {
      times[String(u)] = Date.now();
      return f.impl(u);
    }) as typeof fetch;
    const ms = ['https://news.example/a', 'https://news.example/b', 'https://other.example/c', 'https://other.example/d'].map((u, i) =>
      mention(String(i), u),
    );
    const p = fetchArticles(ms, {
      feeds: [FEED],
      sources: Object.fromEntries(ms.map((m) => [m.external_id, src()])),
      http: { fetchImpl: impl, retries: 0 },
    });
    await vi.advanceTimersByTimeAsync(60_000);
    const r = await p;
    expect(r.articles.map((a) => a.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(times['https://news.example/a']! - times[ROBOTS]!).toBeGreaterThanOrEqual(2000);
    expect(times['https://news.example/b']! - times['https://news.example/a']!).toBeGreaterThanOrEqual(5000);
    const cd = times['https://other.example/d']! - times['https://other.example/c']!;
    expect(cd).toBeGreaterThanOrEqual(2000);
    expect(cd).toBeLessThan(5000);
  });

  it('detects explainer headlines', async () => {
    const r = await run([mention('1', A, 'HISD budget: what to know')], { ...robotsOk, [A]: page('hpm-da-ice-witness') });
    expect(r.articles[0]!.content_type).toBe('explainer');
    const r2 = await run([mention('1', A)], { ...robotsOk, [A]: page('hpm-da-ice-witness') });
    expect(r2.articles[0]!.content_type).toBe('news');
  });

  it('an unchanged feed_updated_at causes no fetch; a changed one refetches', async () => {
    const prevA: NewsArticle = {
      external_id: '1',
      outlet: 'Test',
      url: A,
      headline: 'h',
      published_at: '2026-10-18T12:00:00.000Z',
      feed_updated_at: '2026-10-18T12:00:00.000Z',
      fetched_at: '2026-10-18T13:00:00.000Z',
      text: 'old',
      word_count: 1,
      content_hash: 'h',
      content_type: 'news',
      status: 'ok',
      body_ids: ['hisd_board'],
    };
    const same = await run([mention('1', A)], { ...robotsOk, [A]: page('hpm-da-ice-witness') }, { prev: { '1': prevA } });
    expect(same.calls).toEqual([]);
    expect(same.articles[0]!.text).toBe('old');
    const changed = await run(
      [mention('1', A)],
      { ...robotsOk, [A]: page('hpm-da-ice-witness') },
      { prev: { '1': { ...prevA, feed_updated_at: '2026-10-17T00:00:00.000Z' } } },
    );
    expect(changed.calls).toContain(A);
  });

  it('outlets with fetch_articles: false are never requested', async () => {
    const f = mockFetch({});
    const r = await fetchArticles([mention('1', A)], {
      feeds: [{ ...FEED, fetch_articles: false }],
      sources: { '1': src() },
      http: { fetchImpl: f.impl, sleep: noSleep },
    });
    expect(r.articles).toEqual([]);
    expect(r.skipped_outlets).toEqual({ Test: 1 });
    expect(f.calls).toEqual([]);
  });
});
