// Article fetcher (Step 11b, D27–D29). Only body-matched mentions, only outlets with fetch_articles: true.
// Opinion filter before any request, robots.txt (D36) per host, >= 2 s (or Crawl-delay) between requests
// to the same news host, one GET per article URL per feed change. Never fetches linked pages, images,
// comments, AMP, caches, archives or reader proxies. No LLM calls here.
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { HttpError, httpGet, type HttpOptions } from '@/lib/adapters/http';
import { toRegExp } from '@/lib/adapters/discover';
import type { ArticleResult, NewsArticle, NewsMention } from '@/lib/adapters/types';
import { sha256 } from '@/lib/ingest/hash';
import { normalizeSpace } from '@/lib/ingest/normalize';
import type { FeedConfig, MentionSource } from './collect';
import { RobotsCache } from './robots';

export const MIN_WORDS = 300;
export const NEWS_HOST_SPACING_MS = 2000;

export function isOpinion(url: string, categories: string[], feed: FeedConfig): boolean {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    /* keep raw */
  }
  const p = path.toLowerCase();
  if (feed.opinion_path_patterns.some((x) => p.includes(x.toLowerCase()))) return true;
  const cats = categories.map((c) => c.trim().toLowerCase());
  return feed.opinion_categories.some((c) => cats.includes(c.toLowerCase()));
}

export function contentTypeFor(headline: string, feed: FeedConfig): 'news' | 'explainer' {
  return feed.explainer_patterns.some((p) => toRegExp(p).test(headline)) ? 'explainer' : 'news';
}

const PAYWALL_RE = /paywall|subscriber-only|meteredContent|piano-/i;

export function hasPaywallMarker(html: string): boolean {
  if (/"isAccessibleForFree"\s*:\s*(false|"false")/i.test(html)) return true;
  const { document } = parseHTML(html);
  for (const el of document.querySelectorAll('[class],[id]')) {
    if (PAYWALL_RE.test(el.getAttribute('class') ?? '') || PAYWALL_RE.test(el.getAttribute('id') ?? '')) return true;
  }
  return false;
}

/** Readability plain text, one paragraph-ish line per line; null when Readability finds no article. */
export function extractText(html: string): string | null {
  const { document } = parseHTML(html);
  const parsed = new Readability(document as unknown as Document).parse();
  if (!parsed?.textContent) return null;
  const text = parsed.textContent
    .split(/\n+/)
    .map((l) => normalizeSpace(l))
    .filter(Boolean)
    .join('\n');
  return text || null;
}

export const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** Per-host spacing: max(2 s, Crawl-delay) between requests to the same news host. */
export class HostGate {
  private next = new Map<string, number>();
  constructor(
    private sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
    private now: () => number = Date.now,
  ) {}
  async wait(host: string, minMs: number): Promise<void> {
    const t = this.now();
    const start = Math.max(t, this.next.get(host) ?? 0);
    this.next.set(host, start + minMs);
    if (start > t) await this.sleep(start - t);
  }
}

export type FetchArticlesOptions = {
  feeds: FeedConfig[];
  sources: Record<string, MentionSource>;
  prev?: Record<string, NewsArticle>;
  http?: HttpOptions;
  now?: () => Date;
  robots?: RobotsCache;
  gate?: HostGate;
};
export type FetchArticlesOutput = ArticleResult & { raw: Record<string, string>; skipped_outlets: Record<string, number> };

export async function fetchArticles(mentions: NewsMention[], opts: FetchArticlesOptions): Promise<FetchArticlesOutput> {
  const now = opts.now ?? (() => new Date());
  const http = opts.http ?? {};
  const gate = opts.gate ?? new HostGate(http.sleep);
  const robotsFetch = async (url: string) => {
    await gate.wait(new URL(url).host, NEWS_HOST_SPACING_MS);
    const res = await httpGet(url, http);
    return new TextDecoder('utf-8').decode(await res.arrayBuffer());
  };
  const robots = opts.robots ?? new RobotsCache(robotsFetch);
  const byOutlet = new Map(opts.feeds.map((f) => [f.outlet, f]));
  const articles: NewsArticle[] = [];
  const warnings: string[] = [];
  const raw: Record<string, string> = {};
  const skipped: Record<string, number> = {};

  for (const m of mentions) {
    const src = opts.sources[m.external_id];
    const feed = byOutlet.get(src?.feed_outlet ?? m.outlet);
    if (!feed || !feed.enabled || !feed.fetch_articles) {
      skipped[m.outlet] = (skipped[m.outlet] ?? 0) + 1;
      continue;
    }
    const feedUpdated = src?.feed_updated_at ?? m.published_at;
    const prev = opts.prev?.[m.external_id];
    if (prev && prev.feed_updated_at === feedUpdated && prev.status !== 'fetch_failed') {
      articles.push({ ...prev, body_ids: m.body_ids });
      continue;
    }
    const base = {
      external_id: m.external_id,
      outlet: m.outlet,
      url: m.url,
      headline: m.headline,
      published_at: m.published_at,
      feed_updated_at: feedUpdated,
      content_type: contentTypeFor(m.headline, feed),
      body_ids: m.body_ids,
    };
    const done = (status: NewsArticle['status'], text?: string, words = 0) =>
      articles.push({ ...base, fetched_at: now().toISOString(), text, word_count: words, content_hash: sha256(text ?? ''), status });

    if (isOpinion(m.url, src?.categories ?? [], feed)) {
      done('opinion_excluded');
      continue;
    }
    const { rules, note } = await robots.forUrl(m.url);
    if (note) warnings.push(note);
    if (!rules.allowed(m.url)) {
      done('robots_blocked');
      continue;
    }
    const host = new URL(m.url).host;
    await gate.wait(host, Math.max(NEWS_HOST_SPACING_MS, (rules.crawlDelay() ?? 0) * 1000));
    let html: string;
    try {
      const res = await httpGet(m.url, http);
      html = new TextDecoder('utf-8').decode(await res.arrayBuffer());
    } catch (e) {
      const status = e instanceof HttpError ? e.status : undefined;
      if (status === 404 || status === 410) done('removed');
      else {
        done('fetch_failed');
        warnings.push(`article fetch failed: ${m.url}: ${(e as Error).message}`);
      }
      continue;
    }
    raw[m.external_id] = html;
    if (hasPaywallMarker(html)) {
      done('paywalled');
      continue;
    }
    const text = extractText(html);
    const words = text ? wordCount(text) : 0;
    if (!text || words < MIN_WORDS) done('too_short', undefined, words);
    else done('ok', text, words);
  }
  return { articles, links: [], warnings, raw, skipped_outlets: skipped };
}
