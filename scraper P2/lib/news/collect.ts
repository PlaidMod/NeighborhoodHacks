// D26 news collector (Step 11): RSS feeds -> NewsMention[]. Headline, outlet, link and date only.
// Feed descriptions are used in memory for matching and never stored. No LLM calls here.
// lib/adapters and lib/ingest must never import lib/news (eslint no-restricted-imports).
import { readFileSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { getText, type HttpOptions } from '@/lib/adapters/http';
import type { NewsMention, NewsResult } from '@/lib/adapters/types';
import { sha1 } from '@/lib/ingest/hash';
import { normalizeSpace } from '@/lib/ingest/normalize';
import { isForwardLooking, matchBodies, sortMentions, type BodyTerms } from './match';

export const FeedConfigSchema = z.object({
  outlet: z.string().min(1),
  url: z.string().url(),
  enabled: z.boolean().default(true),
  link_path_allow: z.array(z.string()).optional(),
  fetch_articles: z.boolean().default(true),
  opinion_path_patterns: z.array(z.string()).default(['/opinion', '/editorial', '/commentary', '/op-ed', '/letters']),
  opinion_categories: z.array(z.string()).default(['Opinion', 'Editorial', 'Commentary', 'Letters']),
  explainer_patterns: z.array(z.string()).default(['(?i)what to know', '(?i)explained', '(?i)Q&A', '(?i)faq']),
});
export type FeedConfig = z.infer<typeof FeedConfigSchema>;

export function parseFeeds(yamlText: string): FeedConfig[] {
  return z.array(FeedConfigSchema).parse(parseYaml(yamlText));
}
export function loadFeeds(path = 'data/news_feeds.yaml'): FeedConfig[] {
  return parseFeeds(readFileSync(path, 'utf8'));
}

export const RECENT_DAYS = 14;

export type FeedItem = {
  title: string;
  link: string;
  published_at: string; // ISO
  updated_at?: string; // atom:updated / dc:modified when present
  description: string; // in memory only
  categories: string[];
};

const stripTags = (s: string) => normalizeSpace(cheerio.load(s, null, false).text());

/** RSS 2.0 (and minimal Atom) parse. Items with no title, link or parseable date are skipped. */
export function parseFeed(xml: string): FeedItem[] {
  const $ = cheerio.load(xml, { xml: true });
  const out: FeedItem[] = [];
  $('item, entry').each((_, el) => {
    const e = $(el);
    const title = normalizeSpace(e.children('title').first().text());
    const link = (e.children('link').first().text() || e.children('link').first().attr('href') || '').trim();
    const dateText = e.children('pubDate, published, dc\\:date').first().text().trim();
    const updText = e.children('updated, atom\\:updated, dc\\:modified').first().text().trim();
    const t = Date.parse(dateText || updText);
    if (!title || !link || Number.isNaN(t)) return;
    const u = Date.parse(updText);
    out.push({
      title,
      link,
      published_at: new Date(t).toISOString(),
      updated_at: Number.isNaN(u) ? undefined : new Date(u).toISOString(),
      description: stripTags(e.children('description, summary').first().text()),
      categories: e
        .children('category')
        .map((__, c) => normalizeSpace($(c).text() || $(c).attr('term') || ''))
        .get()
        .filter(Boolean),
    });
  });
  return out;
}

/** Drop tracking params and the fragment; lowercase the host. Used for external_id and as the stored link. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return url.trim();
  }
}

export const mentionId = (url: string) => sha1(normalizeUrl(url));

/** Feed-side data Step 11b needs that is not part of NewsMention (no descriptions). */
export type MentionSource = { feed_outlet: string; categories: string[]; feed_updated_at: string };

export type CollectOptions = { http?: HttpOptions; now?: Date; feedText?: (feed: FeedConfig) => Promise<string> };
export type CollectOutput = NewsResult & { sources: Record<string, MentionSource>; raw: Record<string, string> };

/** Match one feed's items; pure. */
export function mentionsFromFeed(
  feed: FeedConfig,
  items: FeedItem[],
  terms: BodyTerms[],
  now: Date,
): { mention: NewsMention; source: MentionSource }[] {
  const since = now.getTime() - RECENT_DAYS * 86_400_000;
  const out: { mention: NewsMention; source: MentionSource }[] = [];
  for (const it of items) {
    if (Date.parse(it.published_at) < since) continue;
    if (feed.link_path_allow) {
      let path: string;
      try {
        path = new URL(it.link).pathname;
      } catch {
        continue;
      }
      if (!feed.link_path_allow.some((p) => path.startsWith(p))) continue;
    }
    const text = [it.title, it.description, ...it.categories].join(' \n ');
    const m = matchBodies(text, terms);
    if (m.body_ids.length === 0) continue;
    const url = normalizeUrl(it.link);
    out.push({
      mention: {
        external_id: sha1(url),
        outlet: feed.outlet,
        headline: it.title,
        url,
        published_at: it.published_at,
        body_ids: m.body_ids,
        matched_terms: m.matched_terms,
        forward_looking: isForwardLooking(`${it.title} \n ${it.description}`),
      },
      source: { feed_outlet: feed.outlet, categories: it.categories, feed_updated_at: it.updated_at ?? it.published_at },
    });
  }
  return out;
}

/** Merge mentions with the same external_id (same URL from two feeds). The first outlet wins. */
export function mergeMentions(list: NewsMention[]): NewsMention[] {
  const byId = new Map<string, NewsMention>();
  for (const m of list) {
    const prev = byId.get(m.external_id);
    if (!prev) {
      byId.set(m.external_id, { ...m, body_ids: [...m.body_ids], matched_terms: [...m.matched_terms] });
      continue;
    }
    for (const b of m.body_ids) if (!prev.body_ids.includes(b)) prev.body_ids.push(b);
    for (const t of m.matched_terms) if (!prev.matched_terms.includes(t)) prev.matched_terms.push(t);
    prev.forward_looking ||= m.forward_looking;
  }
  return [...byId.values()];
}

export async function collectNews(feeds: FeedConfig[], terms: BodyTerms[], opts: CollectOptions = {}): Promise<CollectOutput> {
  const now = opts.now ?? new Date();
  const read = opts.feedText ?? ((f: FeedConfig) => getText(f.url, opts.http));
  const warnings: string[] = [];
  const all: NewsMention[] = [];
  const sources: Record<string, MentionSource> = {};
  const raw: Record<string, string> = {};
  for (const feed of feeds) {
    if (!feed.enabled) continue;
    let xml: string;
    try {
      xml = await read(feed);
    } catch (e) {
      warnings.push(`news feed failed: ${feed.outlet}: ${(e as Error).message}`);
      continue;
    }
    raw[feed.outlet] = xml;
    const items = parseFeed(xml);
    if (items.length === 0) warnings.push(`news feed empty or unparseable: ${feed.outlet}`);
    for (const { mention, source } of mentionsFromFeed(feed, items, terms, now)) {
      all.push(mention);
      sources[mention.external_id] ??= source;
    }
  }
  return { mentions: sortMentions(mergeMentions(all)), warnings, sources, raw };
}
