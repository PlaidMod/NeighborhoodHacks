import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { SourceConfigSchema, type SourceConfig } from '@/lib/adapters/types';

// Loads data/sources.yaml (Phase 2: the `sources` table) and enforces the
// news guard (D24 + D26): agenda sources may never point at a news domain.

export const NEWS_DOMAINS = [
  'communityimpact.com',
  'houstonpublicmedia.org',
  'houstonchronicle.com',
  'chron.com',
  'houstonlanding.org',
  'khou.com',
  'click2houston.com',
  'abc13.com',
  'fox26houston.com',
];

export const GUARDED_URL_KEYS = ['index_url', 'minutes_index_url', 'source_url', 'agenda_url'] as const;

export class NewsDomainError extends Error {
  constructor(where: string, url: string) {
    super(`${where}: ${url} is a news domain. Agenda data must come from official sources (D24); news belongs only in data/news_feeds.yaml.`);
    this.name = 'NewsDomainError';
  }
}

export function isNewsHost(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return NEWS_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Recursively check every guarded URL key in an object (source config or manual YAML). */
export function assertNoNewsUrls(where: string, value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoNewsUrls(`${where}[${i}]`, v));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if ((GUARDED_URL_KEYS as readonly string[]).includes(k) && typeof v === 'string' && isNewsHost(v)) {
        throw new NewsDomainError(`${where}.${k}`, v);
      }
      assertNoNewsUrls(`${where}.${k}`, v);
    }
  }
}

export function parseSources(yamlText: string): SourceConfig[] {
  const sources = z.array(SourceConfigSchema).parse(parse(yamlText) ?? []);
  const ids = new Set<string>();
  for (const s of sources) {
    if (ids.has(s.id)) throw new Error(`duplicate source id: ${s.id}`);
    ids.add(s.id);
    assertNoNewsUrls(`source ${s.id}`, s);
  }
  return sources;
}

export function loadSources(path = 'data/sources.yaml'): SourceConfig[] {
  // The ignore comment stops the bundler tracing the whole project; next.config.ts ships the file.
  return parseSources(readFileSync(/*turbopackIgnore: true*/ path, 'utf8'));
}

export function getSource(id: string, path?: string): SourceConfig {
  const s = loadSources(path).find((x) => x.id === id);
  if (!s) throw new Error(`unknown source: ${id}`);
  return s;
}
