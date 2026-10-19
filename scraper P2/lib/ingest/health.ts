import type { AdapterResult, Item, Meeting, NewsArticle, SourceConfig } from '@/lib/adapters/types';
import { normalize } from './normalize';
import { isPersonnelSensitive, leakingName, redactText } from './redact';
import { validateItem, validateMeeting } from './validate';

// Step 12: pure health check (agent-scraper-spec §8 Step 12). No I/O, no clock reads: `now` is passed in.
// Error flags make `ok` false; info flags (INFO_FLAGS) are reported but never do.
// News inputs are plain data (NewsArticle is a shared type); this file does not import lib/news (D32).

export const QUOTE_REJECT_LIMIT = 0.2;
export const NEWS_ARTICLE_FAILURE_LIMIT = 0.5;
export const NEWS_LINK_REJECT_LIMIT = 0.3;
export const DEFAULT_RESULTS_MAX_DAYS = 45;
export const DEFAULT_MAX_GAP_DAYS = 14; // the plan's flat value, used only when a source sets none
/** Legistar page size: a list of exactly this many rows (or a multiple) means pagination may have been skipped. */
export const ROW_CAP = 1000;

export const TAX_RATE_RE =
  /tax rate|no[- ]new[- ]revenue|voter[- ]approval rate|truth[- ]in[- ]taxation|ad valorem tax|levy|tax hearing|rate hearing/i;

const INFO_PREFIXES = [
  'news_feed_failed',
  'news_article_failures',
  'news_link_reject_rate_',
  'tax_rate_item_seen',
  'comment_rules_changed',
  'comment_rules_missing',
];
export const isInfoFlag = (flag: string) => INFO_PREFIXES.some((p) => flag.startsWith(p));

/** What one run produced. Agenda and news parts are optional so news runs never touch agenda health. */
export type HealthRun = {
  agenda?: AdapterResult;
  /** The run threw before producing a result (network, HTTP error, parse failure). */
  fetch_error?: string;
  /** Step 11 NewsResult warnings. */
  news_warnings?: string[];
  /** Step 11b articles attempted in this run. */
  articles?: NewsArticle[];
  /** Step 11c stats from linkArticles(). */
  links?: { proposed: number; rejected: number };
};

/** Stored state from earlier runs of the same source. */
export type HealthHistory = {
  meetings: Meeting[];
  items: Item[];
  /** external_ids already reported by tax_rate_item_seen (raised once per item). */
  tax_items_seen?: string[];
  /** comment_rules_missing is raised once per source. */
  comment_rules_missing_reported?: boolean;
};

export type TaxRateItem = { external_id: string; body_id: string; meeting_date?: string; agenda_number?: string; title: string; source_url: string };
export type CommentRulesChange = { meeting_external_id: string; previous_meeting_external_id: string; previous: string; current: string; diff: string };

export type HealthReport = {
  ok: boolean;
  flags: string[];
  details: {
    errors_found?: string[];
    tax_rate_items?: TaxRateItem[];
    comment_rules_changed?: CommentRulesChange;
    news_article_failures?: Record<string, { failed: number; attempted: number }>;
    redaction_leaks?: string[];
    awaiting_result_meetings?: string[];
  };
};

const DAY = 86_400_000;
const cfgNum = (src: SourceConfig, key: string, dflt: number) => {
  const v = src.config[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : dflt;
};
const pct = (n: number) => Math.round(n * 100);

// ---------------------------------------------------------------------------------------------
// comment_rules normalization and word diff

const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const DAYS = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thu(?:rs)?|fri|sat|sun';

/** §5.5 normalize(), then strip dates, times, meeting-specific URLs / meeting IDs and day names. */
export function normalizeCommentRules(text: string): string {
  return normalize(text)
    .replace(/https?:\/\/\S*(?:zoom|teams|webex|meet|gotomeeting|youtube|youtu\.be)\S*/g, ' ')
    .replace(/\b(?:meeting|webinar|zoom)\s*(?:id|#|number)\s*:?\s*[\d\s-]{6,}/g, ' ')
    .replace(/\b(?:passcode|password)\s*:?\s*\S+/g, ' ')
    .replace(new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s*\\d{4})?`, 'g'), ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?=\W|$)/g, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .replace(new RegExp(`\\b(?:${DAYS})\\b\\.?`, 'g'), ' ')
    .replace(/[••]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word-level diff: "-word" removed, "+word" added, unchanged runs collapsed to "…". */
export function wordDiff(a: string, b: string): string {
  const x = a.split(' ').filter(Boolean);
  const y = b.split(' ').filter(Boolean);
  const dp = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--) dp[i]![j] = x[i] === y[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: string[] = [];
  let i = 0;
  let j = 0;
  const same = () => {
    if (out[out.length - 1] !== '…') out.push('…');
  };
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) {
      same();
      i++;
      j++;
    } else if (i < x.length && (j >= y.length || dp[i + 1]![j]! >= dp[i]![j + 1]!)) out.push(`-${x[i++]}`);
    else out.push(`+${y[j++]}`);
  }
  return out.join(' ');
}

// ---------------------------------------------------------------------------------------------

export function health(result: HealthRun, history: HealthHistory, sourceConfig: SourceConfig, now: Date): HealthReport {
  const flags: string[] = [];
  const details: HealthReport['details'] = {};
  const agenda = result.agenda;
  const warnings = agenda?.warnings ?? [];
  const nowMs = now.getTime();

  // fetch_failed
  if (result.fetch_error || warnings.some((w) => /fetch failed/i.test(w))) flags.push('fetch_failed');

  if (agenda || result.fetch_error) {
    // no_meetings_{n}d: newest known meeting older than expected_max_gap_days and nothing in the future.
    const gap = cfgNum(sourceConfig, 'expected_max_gap_days', DEFAULT_MAX_GAP_DAYS);
    const all = [...history.meetings, ...(agenda?.meetings ?? [])].filter((m) => m.status !== 'cancelled');
    const times = all.map((m) => Date.parse(m.date)).filter((t) => !Number.isNaN(t));
    const future = times.some((t) => t >= nowMs);
    if (!future) {
      const newest = times.length ? Math.max(...times) : undefined;
      const days = newest === undefined ? undefined : Math.floor((nowMs - newest) / DAY);
      if (days === undefined) flags.push(`no_meetings_${gap}d`);
      else if (days > gap) flags.push(`no_meetings_${days}d`);
    }
  }

  if (agenda) {
    // required_field_empty
    const errs = [
      ...agenda.meetings.flatMap((m) => validateMeeting(m)),
      ...agenda.items.flatMap((i) => validateItem({ ...i, amounts: [] })),
      ...agenda.meetings.filter((m) => !m.agenda_url?.trim()).map((m) => `meeting ${m.external_id}: missing agenda_url`),
    ];
    if (errs.length) {
      flags.push('required_field_empty');
      details.errors_found = errs;
    }

    // quote_reject_rate_{pct}
    const rejected = warnings.filter((w) => /dropped: source_quote not in text|rejected: source_quote not in minutes/.test(w)).length;
    const total = rejected + agenda.items.filter((i) => i.source_quote !== undefined).length + agenda.result_updates.filter((u) => u.source_quote !== undefined).length;
    if (total > 0 && rejected / total > QUOTE_REJECT_LIMIT) flags.push(`quote_reject_rate_${pct(rejected / total)}`);

    if (warnings.some((w) => /retrying with /.test(w))) flags.push('fallback_model_used');
    if (warnings.some((w) => /scanned (document|minutes)/.test(w)) || agenda.items.some((i) => i.quote_verified === false)) flags.push('scanned_document');

    // row_cap_hit_unpaginated: a list (or one meeting's items) of exactly ROW_CAP rows or a multiple.
    const perMeeting = new Map<string, number>();
    for (const i of agenda.items) perMeeting.set(i.meeting_external_id, (perMeeting.get(i.meeting_external_id) ?? 0) + 1);
    const capped = (n: number) => n > 0 && n % ROW_CAP === 0;
    if (capped(agenda.meetings.length) || [...perMeeting.values()].some(capped)) flags.push('row_cap_hit_unpaginated');

    // redaction_leak_suspected
    const leaks = agenda.items
      .filter((i) => i.contains_private_person || isPersonnelSensitive(i))
      .filter((i) =>
        [i.title, i.description, i.source_quote].some((t) => t && (redactText(t).redacted || (i.contains_private_person && leakingName(t)))),
      )
      .map((i) => i.external_id);
    if (leaks.length) {
      flags.push('redaction_leak_suspected');
      details.redaction_leaks = leaks;
    }

    // tax_rate_item_seen (info, once per item)
    const seen = new Set(history.tax_items_seen ?? []);
    const mDate = new Map([...history.meetings, ...agenda.meetings].map((m) => [m.external_id, m.date]));
    const tax = agenda.items
      .filter((i) => !seen.has(i.external_id))
      .filter((i) => TAX_RATE_RE.test([i.title, i.description ?? '', i.section ?? ''].join('\n')) || i.amounts.some((a) => a.kind === 'rate'))
      .map((i) => ({
        external_id: i.external_id,
        body_id: i.body_id,
        meeting_date: mDate.get(i.meeting_external_id),
        agenda_number: i.agenda_number,
        title: i.title,
        source_url: i.source_url,
      }));
    if (tax.length) {
      flags.push('tax_rate_item_seen');
      details.tax_rate_items = tax;
    }

    // comment_rules_changed / comment_rules_missing (info)
    const newest = [...agenda.meetings].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
    if (newest) {
      const prev = [...history.meetings, ...agenda.meetings]
        .filter((m) => m.external_id !== newest.external_id && Date.parse(m.date) < Date.parse(newest.date))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
      if (prev) {
        if (!newest.comment_rules_text || !prev.comment_rules_text) {
          if (!history.comment_rules_missing_reported) flags.push('comment_rules_missing');
        } else {
          const a = normalizeCommentRules(prev.comment_rules_text);
          const b = normalizeCommentRules(newest.comment_rules_text);
          if (a !== b) {
            flags.push('comment_rules_changed');
            details.comment_rules_changed = {
              meeting_external_id: newest.external_id,
              previous_meeting_external_id: prev.external_id,
              previous: prev.comment_rules_text,
              current: newest.comment_rules_text,
              diff: wordDiff(a, b),
            };
          }
        }
      }
    }
  }

  // awaiting_result_over_limit
  const maxDays = cfgNum(sourceConfig, 'results_max_days', DEFAULT_RESULTS_MAX_DAYS);
  const items = [...history.items, ...(agenda?.items ?? [])];
  const meetings = new Map([...history.meetings, ...(agenda?.meetings ?? [])].map((m) => [m.external_id, m]));
  const stale = [...new Set(items.filter((i) => i.status === 'awaiting_result').map((i) => i.meeting_external_id))].filter((id) => {
    const t = Date.parse(meetings.get(id)?.date ?? '');
    return !Number.isNaN(t) && nowMs - t > maxDays * DAY;
  });
  if (stale.length) {
    flags.push('awaiting_result_over_limit');
    details.awaiting_result_meetings = stale;
  }

  // news (info only)
  if (result.news_warnings?.some((w) => /^news feed (failed|empty or unparseable)/.test(w))) flags.push('news_feed_failed');
  if (result.articles?.length) {
    const per: Record<string, { failed: number; attempted: number }> = {};
    for (const a of result.articles) {
      if (!['ok', 'fetch_failed', 'paywalled', 'too_short'].includes(a.status)) continue;
      const o = (per[a.outlet] ??= { failed: 0, attempted: 0 });
      o.attempted++;
      if (a.status !== 'ok') o.failed++;
    }
    const bad = Object.fromEntries(Object.entries(per).filter(([, v]) => v.failed / v.attempted > NEWS_ARTICLE_FAILURE_LIMIT));
    if (Object.keys(bad).length) {
      flags.push('news_article_failures');
      details.news_article_failures = bad;
    }
  }
  if (result.links && result.links.proposed > 0 && result.links.rejected / result.links.proposed > NEWS_LINK_REJECT_LIMIT) {
    flags.push(`news_link_reject_rate_${pct(result.links.rejected / result.links.proposed)}`);
  }

  return { ok: !flags.some((f) => !isInfoFlag(f)), flags, details };
}
