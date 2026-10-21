import { describe, expect, it } from 'vitest';
import type { AdapterResult, Item, Meeting, NewsArticle, SourceConfig } from '@/lib/adapters/types';
import { health, isInfoFlag, normalizeCommentRules, wordDiff, type HealthHistory } from '@/lib/ingest/health';
import { CASES, buildCase } from '../golden/llm-extract/fixtures';
import { mapFixture } from '../golden/legistar/fixtures';

const NOW = new Date('2026-10-19T12:00:00-05:00');
const SRC: SourceConfig = { id: 'test_src', body_id: 'test_body', adapter: 'legistar', config: { expected_max_gap_days: 21 } };
const EMPTY_HISTORY: HealthHistory = { meetings: [], items: [] };

const meeting = (id: string, date: string, extra: Partial<Meeting> = {}): Meeting => ({
  external_id: id,
  body_id: 'test_body',
  date,
  type: 'regular',
  status: 'scheduled',
  agenda_url: 'https://example.org/agenda',
  ...extra,
});
const item = (id: string, meetingId: string, extra: Partial<Item> = {}): Item => ({
  external_id: id,
  meeting_external_id: meetingId,
  body_id: 'test_body',
  title: `Item ${id}`,
  status: 'upcoming',
  amounts: [],
  attachments: [],
  contains_private_person: false,
  source_url: 'https://example.org/agenda',
  ...extra,
});
const FUTURE = meeting('m-future', '2026-10-28T10:00:00-05:00');
const result = (r: Partial<AdapterResult> = {}): AdapterResult => ({
  meetings: [FUTURE],
  items: [item('i1', 'm-future')],
  documents: [],
  result_updates: [],
  warnings: [],
  ...r,
});
const run = (r: Partial<AdapterResult> = {}, history = EMPTY_HISTORY, src = SRC) => health({ agenda: result(r) }, history, src, NOW);

describe('health: baseline', () => {
  it('a clean run is ok with no flags', () => {
    expect(run()).toEqual({ ok: true, flags: [], details: {} });
  });
  it('info flags are recognized', () => {
    for (const f of ['news_feed_failed', 'news_article_failures', 'news_link_reject_rate_40', 'tax_rate_item_seen', 'comment_rules_changed', 'comment_rules_missing'])
      expect(isInfoFlag(f)).toBe(true);
    for (const f of ['fetch_failed', 'no_meetings_30d', 'quote_reject_rate_25', 'awaiting_result_over_limit']) expect(isInfoFlag(f)).toBe(false);
  });
});

describe('fetch_failed', () => {
  it('fires on a thrown run', () => {
    const r = health({ fetch_error: 'GET x failed: ECONNRESET' }, { meetings: [FUTURE], items: [] }, SRC, NOW);
    expect(r.flags).toEqual(['fetch_failed']);
    expect(r.ok).toBe(false);
  });
  it('fires on a fetch-failed warning', () => {
    expect(run({ warnings: ['https://x/a.pdf: fetch failed: HTTP 503'] }).flags).toContain('fetch_failed');
  });
});

describe('no_meetings_{n}d', () => {
  it('fires when the newest meeting is older than expected_max_gap_days and none is in the future', () => {
    const r = run({ meetings: [meeting('old', '2026-09-01T10:00:00-05:00')], items: [] });
    expect(r.flags).toEqual(['no_meetings_48d']);
    expect(r.ok).toBe(false);
  });
  it('does not fire inside the gap, or with a future meeting', () => {
    expect(run({ meetings: [meeting('recent', '2026-10-05T10:00:00-05:00')], items: [] }).flags).toEqual([]);
    expect(run({ meetings: [], items: [] }, { meetings: [meeting('old', '2026-01-01T10:00:00-06:00'), FUTURE], items: [] }).flags).toEqual([]);
  });
  it('uses history, ignores cancelled meetings, and honours the source gap (Commissioners Court 45)', () => {
    const hist = { meetings: [meeting('old', '2026-09-10T10:00:00-05:00')], items: [], comment_rules_missing_reported: true };
    expect(run({ meetings: [meeting('c', '2026-10-30T10:00:00-05:00', { status: 'cancelled' })], items: [] }, hist).flags).toEqual(['no_meetings_39d']);
    const cc = { ...SRC, config: { expected_max_gap_days: 45 } };
    expect(run({ meetings: [], items: [] }, hist, cc).flags).toEqual([]);
  });
  it('fires with the configured gap when nothing is known at all', () => {
    expect(run({ meetings: [], items: [] }).flags).toEqual(['no_meetings_21d']);
  });
  it('never fires for the manual source, which is empty by design (D18)', () => {
    const manual: SourceConfig = { id: 'manual', adapter: 'manual', config: { dir: 'data/manual' } };
    expect(run({ meetings: [], items: [] }, EMPTY_HISTORY, manual).flags).toEqual([]);
  });
});

describe('required_field_empty', () => {
  it('fires on an empty title, source_url or agenda_url', () => {
    const r = run({ items: [item('i1', 'm-future', { title: ' ' }), item('i2', 'm-future', { source_url: '' })], meetings: [{ ...FUTURE, agenda_url: '' }] });
    expect(r.flags).toEqual(['required_field_empty']);
    expect(r.details.errors_found).toHaveLength(3);
  });
});

describe('quote_reject_rate_{pct}', () => {
  const q = (id: string) => item(id, 'm-future', { source_quote: 'quote' });
  const drop = (n: number) => `https://x/a.pdf: item ${n} dropped: source_quote not in text: "x"`;
  it('fires above 20%', () => {
    expect(run({ items: [q('a'), q('b'), q('c')], warnings: [drop(1)] }).flags).toEqual(['quote_reject_rate_25']);
  });
  it('does not fire at 20% or for non-LLM items', () => {
    expect(run({ items: [q('a'), q('b'), q('c'), q('d')], warnings: [drop(1)] }).flags).toEqual([]);
    expect(run({ items: [item('a', 'm-future')] }).flags).toEqual([]);
  });
  it('counts rejected minutes outcomes', () => {
    const r = run({
      items: [],
      result_updates: [{ meeting_external_id: 'm', item_external_id: 'a', action: 'passed', vote_result: 'passed', source_url: 'u', source_quote: 'q' }],
      warnings: ['outcome 3 rejected: source_quote not in minutes: "x"'],
    });
    expect(r.flags).toEqual(['quote_reject_rate_50']);
  });
});

describe('fallback_model_used / scanned_document', () => {
  it('fallback fires on the D17 retry warning', () => {
    expect(run({ warnings: ['u: 5/10 items dropped with flash; retrying with pro'] }).flags).toEqual(['fallback_model_used']);
  });
  it('scanned fires on the warning or on unverified quotes', () => {
    expect(run({ warnings: ['u: scanned document (no text layer); quotes not verified, items need review'] }).flags).toEqual(['scanned_document']);
    expect(run({ items: [item('a', 'm-future', { quote_verified: false })] }).flags).toEqual(['scanned_document']);
  });
});

describe('row_cap_hit_unpaginated', () => {
  it('fires when one meeting has exactly 1000 items', () => {
    const items = Array.from({ length: 1000 }, (_, n) => item(`i${n}`, 'm-future'));
    expect(run({ items }).flags).toEqual(['row_cap_hit_unpaginated']);
  });
  it('does not fire at 999 or 1001', () => {
    expect(run({ items: Array.from({ length: 999 }, (_, n) => item(`i${n}`, 'm-future')) }).flags).toEqual([]);
    expect(run({ items: Array.from({ length: 1001 }, (_, n) => item(`i${n}`, 'm-future')) }).flags).toEqual([]);
  });
});

describe('redaction_leak_suspected', () => {
  it('fires on a personnel item that still names a person', () => {
    const leak = item('p', 'm-future', { section: 'Hearing Items', title: 'Natasha Smith, teacher, Twain Elementary School, Consideration of the proposed termination' });
    const r = run({ items: [leak] });
    expect(r.flags).toEqual(['redaction_leak_suspected']);
    expect(r.details.redaction_leaks).toEqual(['p']);
  });
  it('does not fire on redacted HISD 1332 hearing items or unnamed closed-session items', () => {
    const { items } = mapFixture('houstonisd-1332');
    expect(items.some((i) => i.contains_private_person)).toBe(true);
    expect(run({ items: items.map((i) => ({ ...i, meeting_external_id: 'm-future' })) }).flags).not.toContain('redaction_leak_suspected');
  });
});

describe('awaiting_result_over_limit', () => {
  const old = meeting('old', '2026-08-15T10:00:00-05:00'); // 65 days before NOW
  const hist = (status: Item['status']) => ({ meetings: [old], items: [item('a', 'old', { status })], comment_rules_missing_reported: true });
  it('fires when a meeting older than results_max_days (45) still has awaiting_result items', () => {
    const r = run({}, hist('awaiting_result'));
    expect(r.flags).toEqual(['awaiting_result_over_limit']);
    expect(r.details.awaiting_result_meetings).toEqual(['old']);
  });
  it('honours results_max_days (MUD 489: 75) and ignores decided items', () => {
    expect(run({}, hist('awaiting_result'), { ...SRC, config: { ...SRC.config, results_max_days: 75 } }).flags).toEqual([]);
    expect(run({}, hist('decided')).flags).toEqual([]);
  });
});

describe('news flags (info-level)', () => {
  const art = (outlet: string, status: NewsArticle['status']): NewsArticle => ({
    external_id: `${outlet}-${status}-${Math.random()}`,
    outlet,
    url: 'https://example.org/a',
    headline: 'h',
    published_at: '2026-10-18T10:00:00-05:00',
    fetched_at: '2026-10-19T10:00:00-05:00',
    word_count: 0,
    content_hash: 'x',
    content_type: 'news',
    status,
    body_ids: [],
  });
  it('news_feed_failed is info and never affects agenda ok', () => {
    const r = health({ news_warnings: ['news feed failed: KHOU 11: HTTP 500'] }, EMPTY_HISTORY, SRC, NOW);
    expect(r).toEqual({ ok: true, flags: ['news_feed_failed'], details: {} });
    expect(health({ news_warnings: ['news feed empty or unparseable: KPRC 2'] }, EMPTY_HISTORY, SRC, NOW).flags).toEqual(['news_feed_failed']);
  });
  it('news_article_failures fires when >50% of an outlet’s fetches fail', () => {
    const r = health({ articles: [art('A', 'ok'), art('A', 'paywalled'), art('A', 'too_short'), art('B', 'ok'), art('B', 'fetch_failed'), art('B', 'opinion_excluded')] }, EMPTY_HISTORY, SRC, NOW);
    expect(r.ok).toBe(true);
    expect(r.flags).toEqual(['news_article_failures']);
    expect(r.details.news_article_failures).toEqual({ A: { failed: 2, attempted: 3 } });
  });
  it('news_link_reject_rate fires above 30%', () => {
    expect(health({ links: { proposed: 14, rejected: 11 } }, EMPTY_HISTORY, SRC, NOW)).toEqual({ ok: true, flags: ['news_link_reject_rate_79'], details: {} });
    expect(health({ links: { proposed: 10, rejected: 3 } }, EMPTY_HISTORY, SRC, NOW).flags).toEqual([]);
    expect(health({ links: { proposed: 0, rejected: 0 } }, EMPTY_HISTORY, SRC, NOW).flags).toEqual([]);
  });
});

describe('tax_rate_item_seen (for P1)', () => {
  const ls = buildCase(CASES[0]!);
  const lsRun = (history: HealthHistory = EMPTY_HISTORY) =>
    health({ agenda: { meetings: [ls.meeting!, FUTURE], items: ls.items, documents: [], result_updates: [], warnings: [] } }, history, SRC, NOW);

  it('fires on the Lone Star Oct 1 tax-rate-hearing items with the P1 details', () => {
    const r = lsRun();
    expect(r.flags).toContain('tax_rate_item_seen');
    expect(r.ok).toBe(true);
    const nums = r.details.tax_rate_items!.map((t) => t.agenda_number);
    expect(nums).toEqual(['V', 'VII', '1', '2', '3']);
    expect(r.details.tax_rate_items![0]).toEqual({
      external_id: expect.any(String),
      body_id: 'lone_star_board',
      meeting_date: '2026-10-01T10:30:00-05:00',
      agenda_number: 'V',
      title: 'Convene Tax Rate Public Hearing for Tax Year 2026',
      source_url: expect.stringContaining('lonestar.edu'),
    });
  });
  it('is raised once per item', () => {
    const first = lsRun().details.tax_rate_items!.map((t) => t.external_id);
    expect(lsRun({ meetings: [], items: [], tax_items_seen: first }).flags).not.toContain('tax_rate_item_seen');
  });
  it('fires on a rate amount alone', () => {
    const r = run({ items: [item('r', 'm-future', { title: 'Adopt the budget', amounts: [{ value: 0.389, text: '$0.3891 per $100', kind: 'rate' }] })] });
    expect(r.flags).toEqual(['tax_rate_item_seen']);
  });
  it('does not fire on arbitrage rebate payments or tax-exempt commercial paper (event 1244)', () => {
    const { meeting: m, items } = mapFixture('harriscountytx-1244');
    expect(items.some((i) => /arbitrage rebate payment/i.test(i.title))).toBe(true);
    const r = health({ agenda: { meetings: [m, FUTURE], items, documents: [], result_updates: [], warnings: [] } }, EMPTY_HISTORY, SRC, NOW);
    const hits = (r.details.tax_rate_items ?? []).map((t) => t.title);
    expect(hits.filter((t) => /arbitrage|commercial paper/i.test(t))).toEqual([]);
    expect(run({ items: [item('x', 'm-future', { title: 'Approve the issuance of tax-exempt commercial paper notes' })] }).flags).toEqual([]);
  });
});

describe('comment_rules_changed / comment_rules_missing (for P4)', () => {
  const m1306 = mapFixture('houstonisd-1306').meeting;
  const m1332 = mapFixture('houstonisd-1332').meeting;
  const rules = m1332.comment_rules_text!;
  const pair = (prevText: string | undefined, curText: string | undefined, history: Partial<HealthHistory> = {}) =>
    health(
      { agenda: result({ meetings: [{ ...m1332, comment_rules_text: curText }], items: [] }) },
      { meetings: [{ ...m1306, comment_rules_text: prevText }], items: [], ...history },
      SRC,
      NOW,
    );

  it('does not fire across the two HISD fixtures', () => {
    expect(pair(m1306.comment_rules_text, rules).flags).toEqual([]);
  });
  it('does not fire when only the date, time, day name and Zoom link differ', () => {
    const a = `${rules}\nThe meeting is Thursday, October 8, 2026 at 5:00 p.m. Join via https://houstonisd.zoom.us/j/81234567890 Meeting ID: 812 3456 7890`;
    const b = `${rules}\nThe meeting is Thursday, October 22, 2026 at 5:00 PM. Join via https://houstonisd.zoom.us/j/89999999999 Meeting ID: 899 9999 9999`;
    expect(pair(a, b).flags).toEqual([]);
  });
  it('fires on a hand-edited speaker sign-up deadline, with both texts and a word diff', () => {
    const edited = rules.replace('by 12:00 p.m. the day before the meeting. Any', 'by 5:00 p.m. two business days before the meeting. Any');
    expect(edited).not.toBe(rules);
    const r = pair(rules, edited);
    expect(r.flags).toEqual(['comment_rules_changed']);
    expect(r.ok).toBe(true);
    const d = r.details.comment_rules_changed!;
    expect(d.previous).toBe(rules);
    expect(d.current).toBe(edited);
    expect(d.diff).toContain('-the');
    expect(d.diff).toContain('+two');
    expect(d.diff).toContain('+business');
  });
  it('raises comment_rules_missing once instead when either text is missing', () => {
    expect(pair(undefined, rules).flags).toEqual(['comment_rules_missing']);
    expect(pair(rules, undefined).flags).toEqual(['comment_rules_missing']);
    expect(pair(undefined, rules, { comment_rules_missing_reported: true }).flags).toEqual([]);
  });
  it('normalization and diff helpers', () => {
    expect(normalizeCommentRules('Register by 12:00 p.m. on Monday, Oct. 5, 2026 at https://x.zoom.us/j/1')).toBe('register by on , at');
    expect(wordDiff('a b c', 'a x c')).toBe('… -b +x …');
  });
});
