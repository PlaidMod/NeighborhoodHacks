// robots.txt for news hosts (Step 11b, D36). Literal reading: the group for our own User-Agent
// (`NeighborhoodHacks-AgendaBot`), else `*`. Groups that name other crawlers (Google-Extended, GPTBot, …)
// do not apply to us. The User-Agent is never changed. Cached 24 h per host.
import robotsParser from 'robots-parser';
import { HttpError, getText, type HttpOptions } from '@/lib/adapters/http';

/** Product token robots.txt groups are matched against (the full UA is in lib/adapters/http.ts). */
export const ROBOTS_AGENT = 'NeighborhoodHacks-AgendaBot';
export const ROBOTS_TTL_MS = 24 * 3600 * 1000;

export type RobotsRules = {
  allowed(url: string): boolean;
  /** Crawl-delay for our group (or `*`), seconds. */
  crawlDelay(): number | undefined;
};

/** Parse a robots.txt body for one origin. */
export function parseRobots(origin: string, body: string): RobotsRules {
  const r = robotsParser(`${origin}/robots.txt`, body);
  return {
    allowed: (url) => r.isAllowed(url, ROBOTS_AGENT) !== false,
    crawlDelay: () => {
      const d = r.getCrawlDelay(ROBOTS_AGENT);
      return typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : undefined;
    },
  };
}

const ALLOW_ALL: RobotsRules = { allowed: () => true, crawlDelay: () => undefined };
const DENY_ALL: RobotsRules = { allowed: () => false, crawlDelay: () => undefined };

export type RobotsFetch = (url: string) => Promise<string>;

/**
 * Per-host cache. 404/410 → allow all (no robots.txt). Any other failure → deny all for that host
 * until the entry expires (we never fetch articles from a host whose robots.txt we couldn't read).
 */
export class RobotsCache {
  private entries = new Map<string, { rules: RobotsRules; at: number; note?: string }>();
  constructor(
    private fetchText: RobotsFetch,
    private now: () => number = Date.now,
  ) {}

  static withHttp(http: HttpOptions = {}, now?: () => number): RobotsCache {
    return new RobotsCache((url) => getText(url, http), now);
  }

  /** Rules for the URL's origin, plus a warning note when robots.txt could not be read. */
  async forUrl(url: string): Promise<{ rules: RobotsRules; note?: string }> {
    const origin = new URL(url).origin;
    const hit = this.entries.get(origin);
    if (hit && this.now() - hit.at < ROBOTS_TTL_MS) return hit;
    let entry: { rules: RobotsRules; at: number; note?: string };
    try {
      entry = { rules: parseRobots(origin, await this.fetchText(`${origin}/robots.txt`)), at: this.now() };
    } catch (e) {
      const status = e instanceof HttpError ? e.status : undefined;
      entry =
        status === 404 || status === 410
          ? { rules: ALLOW_ALL, at: this.now() }
          : { rules: DENY_ALL, at: this.now(), note: `robots.txt unreadable for ${origin}: ${(e as Error).message}` };
    }
    this.entries.set(origin, entry);
    return entry;
  }
}
