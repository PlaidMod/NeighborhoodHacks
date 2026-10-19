import { DateTime } from 'luxon';
import { z } from 'zod';
import type {
  Adapter,
  AdapterDocument,
  AdapterResult,
  Item,
  Meeting,
  ResultUpdate,
  RunMode,
  SourceConfig,
} from './types';
import { getText, type HttpOptions } from './http';
import { parseAmounts } from '@/lib/ingest/amounts';
import { attributeBody } from '@/lib/ingest/attribution';
import { documentContentHash } from '@/lib/ingest/hash';
import { ZONE, toChicagoIso } from '@/lib/ingest/normalize';
import { redactPersonnel } from '@/lib/ingest/redact';
import { dateInWindow, itemStatus } from '@/lib/ingest/validate';

// Legistar Web API adapter (agent-scraper-spec §8 Step 2).
// Used by hc_commissioners_court (harriscountytx) and hisd_board (houstonisd).

export const LEGISTAR_BASE = 'https://webapi.legistar.com/v1';
export const PAGE_SIZE = 1000;
/** Section headers in real agendas are short; longer one-liners are notes (prayer, pledges). */
export const MAX_SECTION_LEN = 100;
const SPECIAL_BODY_IDS = new Set([223]);
export const COMMENT_RULES_RE =
  /public comment|address (the )?(court|board)|speak(er|ers)? |appearance|sign(ed)? up|register|zoom|live video/i;

export const LegistarConfigSchema = z.object({
  client: z.string().min(1),
  body_ids: z.array(z.number()).default([]),
  exclude_comment_patterns: z.array(z.string()).default([]),
  exclude_agenda_status: z.array(z.string()).default([]),
  section_body_map: z.record(z.string(), z.string()).optional(),
});
export type LegistarConfig = z.infer<typeof LegistarConfigSchema>;

export type LegistarEvent = {
  EventId: number;
  EventBodyId: number;
  EventBodyName?: string | null;
  EventDate: string;
  EventTime?: string | null;
  EventAgendaStatusName?: string | null;
  EventAgendaFile?: string | null;
  EventMinutesFile?: string | null;
  EventComment?: string | null;
  EventInSiteURL?: string | null;
  EventVideoPath?: string | null;
};

export type LegistarEventItem = {
  EventItemId: number;
  EventItemAgendaSequence?: number | null;
  EventItemAgendaNumber?: string | null;
  EventItemTitle?: string | null;
  EventItemAgendaNote?: string | null;
  EventItemMatterId?: number | null;
  EventItemMatterType?: string | null;
  EventItemActionName?: string | null;
  EventItemPassedFlagName?: string | null;
  EventItemMatterAttachments?: { MatterAttachmentName?: string | null; MatterAttachmentHyperlink?: string | null }[] | null;
};

export type LegistarDeps = {
  http?: HttpOptions;
  /** Frozen clock for status tests. */
  now?: () => Date;
  /** Page size for $top (tests use a small one to exercise pagination). */
  pageSize?: number;
};

const blank = (s: string | null | undefined): s is null | undefined => s === null || s === undefined || s.trim() === '';

/** Strip HTML tags and decode the common entities from an agenda note. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * §8 Step 2 vote mapping. Legistar rarely fills PassedFlagName before results post,
 * so an action such as "approved"/"accepted"/"adopted" with no flag also counts as passed.
 */
export function voteResult(action: string | null | undefined, passedFlag: string | null | undefined): Item['vote_result'] {
  const a = (action ?? '').trim();
  if (passedFlag === 'Pass') return 'passed';
  if (/fail/i.test(a) || passedFlag === 'Fail') return 'failed';
  if (/^no action/i.test(a)) return 'no_action';
  if (/approv|accept|adopt|pass|ratif|authoriz/i.test(a)) return 'passed';
  return undefined;
}

export function isExcludedEvent(e: LegistarEvent, cfg: LegistarConfig): boolean {
  if (cfg.body_ids.length && !cfg.body_ids.includes(e.EventBodyId)) return true;
  if (e.EventAgendaStatusName && cfg.exclude_agenda_status.includes(e.EventAgendaStatusName)) return true;
  const comment = e.EventComment ?? '';
  return cfg.exclude_comment_patterns.some((p) => comment.includes(p));
}

export function mapEvent(e: LegistarEvent, bodyId: string): Meeting {
  const comment = e.EventComment ?? '';
  const agendaUrl = e.EventAgendaFile ?? e.EventInSiteURL ?? '';
  return {
    external_id: String(e.EventId),
    body_id: bodyId,
    date: toChicagoIso(e.EventDate, e.EventTime ?? undefined),
    type: SPECIAL_BODY_IDS.has(e.EventBodyId) || /special/i.test(comment) ? 'special' : 'regular',
    status: /cancel/i.test(comment) ? 'cancelled' : 'scheduled',
    agenda_url: agendaUrl,
    ...(e.EventVideoPath ? { video_url: e.EventVideoPath } : {}),
    ...(e.EventMinutesFile ? { minutes_url: e.EventMinutesFile } : {}),
  };
}

/**
 * A header-like row (no number, no matter id) counts as a section header only if it
 * reads like one: short, one line, not a bullet / table row / "Page Break" / lead-in
 * ending in ":". Everything else is boilerplate (prayer text, notices, tables).
 */
export function isSectionHeader(title: string): boolean {
  const t = title.trim();
  return (
    t.length > 0 &&
    t.length <= MAX_SECTION_LEN &&
    !/[\r\n]/.test(t) &&
    !/^[•\-*]/.test(t) &&
    !/\S {3,}\S/.test(title) &&
    !/^\s{2,}/.test(title) &&
    !/:$/.test(t) &&
    !/^page break$/i.test(t) &&
    !COMMENT_RULES_RE.test(t)
  );
}

/** ALL-CAPS multi-word headers ("CLOSED SESSION", "HEARING ITEMS") are top level; acronyms like "ARPA" are not. */
const isTopLevel = (s: string) => /[A-Z]/.test(s) && s === s.toUpperCase() && (/\s/.test(s) || s.length > 5);

/**
 * Walk event items in agenda order: track section headers, collect comment rules,
 * emit numbered / matter rows as Items (redacted). Returns the meeting with
 * comment_rules_text filled in.
 *
 * Rows with a null EventItemAgendaSequence are minutes-only copies (they appear once
 * results post). They are never emitted; their outcome is copied onto the agenda row
 * with the same EventItemMatterId when that row has none.
 */
export function mapEventItems(
  meeting: Meeting,
  rows: LegistarEventItem[],
  cfg: LegistarConfig,
  now: Date = new Date(),
): { meeting: Meeting; items: Item[]; warnings: string[] } {
  const warnings: string[] = [];
  const items: Item[] = [];
  const rules: string[] = [];
  const agenda = rows
    .filter((r) => r.EventItemAgendaSequence !== null && r.EventItemAgendaSequence !== undefined)
    .sort((a, b) => a.EventItemAgendaSequence! - b.EventItemAgendaSequence!);
  const minutesOutcome = new Map<number, LegistarEventItem>();
  for (const r of rows) {
    if ((r.EventItemAgendaSequence === null || r.EventItemAgendaSequence === undefined) && r.EventItemMatterId && !blank(r.EventItemActionName)) {
      minutesOutcome.set(r.EventItemMatterId, r);
    }
  }
  // Header stack. ALL-CAPS headers are top level (HISD "CLOSED SESSION"); a Title-case
  // header under an ALL-CAPS one is its child ("CLOSED SESSION / Legal"). Otherwise a
  // header replaces the stack (Commissioners Court has one level).
  let headers: string[] = [];

  for (const raw of agenda) {
    const title = (raw.EventItemTitle ?? '').trim();
    const isHeaderLike = blank(raw.EventItemAgendaNumber) && (raw.EventItemMatterId === null || raw.EventItemMatterId === undefined);
    if (isHeaderLike) {
      if (!title) continue;
      if (isSectionHeader(raw.EventItemTitle ?? '')) {
        headers = isTopLevel(title) || !headers[0] || !isTopLevel(headers[0]) ? [title] : [headers[0], title];
      } else if (COMMENT_RULES_RE.test(title) && title.length > MAX_SECTION_LEN) {
        rules.push(title);
      }
      continue;
    }
    let r = raw;
    const fromMinutes = r.EventItemMatterId ? minutesOutcome.get(r.EventItemMatterId) : undefined;
    if (fromMinutes && blank(r.EventItemActionName)) {
      r = { ...r, EventItemActionName: fromMinutes.EventItemActionName, EventItemPassedFlagName: fromMinutes.EventItemPassedFlagName };
    }
    if (!title) {
      warnings.push(`event ${meeting.external_id}: item ${r.EventItemId} has an empty title`);
      continue;
    }
    const section = headers.length ? headers.join(' / ') : undefined;
    let bodyId = meeting.body_id;
    for (let i = headers.length - 1; i >= 0; i--) {
      const hit = attributeBody(headers[i], meeting.body_id, cfg.section_body_map);
      if (hit !== meeting.body_id) {
        bodyId = hit;
        break;
      }
    }
    const description = r.EventItemAgendaNote ? stripHtml(r.EventItemAgendaNote) || undefined : undefined;
    const action = blank(r.EventItemActionName) ? undefined : r.EventItemActionName.trim();
    const vote = voteResult(action, r.EventItemPassedFlagName);
    const number = blank(r.EventItemAgendaNumber) ? undefined : r.EventItemAgendaNumber.trim().replace(/\.$/, '');
    const matterType = blank(r.EventItemMatterType) ? undefined : r.EventItemMatterType.trim();
    const item: Item = {
      external_id: String(r.EventItemId),
      meeting_external_id: meeting.external_id,
      body_id: bodyId,
      ...(number ? { agenda_number: number } : {}),
      title,
      ...(section ? { section } : {}),
      ...(description ? { description } : {}),
      ...(matterType ? { matter_type: matterType } : {}),
      status: itemStatus({ action, vote_result: vote }, meeting.date, now),
      ...(action ? { action } : {}),
      ...(vote ? { vote_result: vote } : {}),
      amounts: [],
      attachments: (r.EventItemMatterAttachments ?? [])
        .filter((a) => a.MatterAttachmentHyperlink)
        .map((a) => ({ name: (a.MatterAttachmentName ?? '').trim(), url: a.MatterAttachmentHyperlink! })),
      contains_private_person: false,
      source_url: meeting.agenda_url,
    };
    // Redact first, then parse amounts from the redacted text so Amount.text stays a substring.
    const red = redactPersonnel(item);
    items.push({ ...red, amounts: parseAmounts(red.title + (red.description ? ' ' + red.description : '')) });
  }
  if (items.length === 0) warnings.push(`event ${meeting.external_id}: 0 items`);
  return { meeting: rules.length ? { ...meeting, comment_rules_text: rules.join('\n\n') } : meeting, items, warnings };
}

/** Result updates for every item that has an outcome. */
export function resultUpdatesFrom(meeting: Meeting, items: Item[], insiteUrl?: string | null): ResultUpdate[] {
  const src = meeting.minutes_url ?? insiteUrl ?? meeting.agenda_url;
  return items
    .filter((i) => i.action || i.vote_result)
    .flatMap((i) =>
      i.vote_result
        ? [
            {
              meeting_external_id: meeting.external_id,
              item_external_id: i.external_id,
              action: i.action ?? i.vote_result,
              vote_result: i.vote_result,
              source_url: src,
            },
          ]
        : [],
    );
}

type Fetcher = { get: <T>(url: string) => Promise<T>; documents: AdapterDocument[]; warnings: string[] };

function fetcher(http?: HttpOptions): Fetcher {
  const documents: AdapterDocument[] = [];
  return {
    documents,
    warnings: [],
    async get<T>(url: string): Promise<T> {
      const raw = await getText(url, { ...http, headers: { Accept: 'application/json', ...http?.headers } });
      documents.push({ url, fetched_at: new Date().toISOString(), content_hash: documentContentHash(raw), raw, kind: 'json' });
      return JSON.parse(raw) as T;
    },
  };
}

async function paged<T>(f: Fetcher, url: string, pageSize: number, label: string): Promise<T[]> {
  const out: T[] = [];
  const sep = url.includes('?') ? '&' : '?';
  for (let skip = 0; ; skip += pageSize) {
    const page = await f.get<T[]>(`${url}${sep}$top=${pageSize}&$skip=${skip}`);
    out.push(...page);
    if (page.length < pageSize) break;
    f.warnings.push(`${label}: page at $skip=${skip} hit ${pageSize} rows; paginating`);
  }
  return out;
}

export function eventsUrl(cfg: LegistarConfig, window: { from: Date; to: Date }): string {
  const from = DateTime.fromJSDate(window.from, { zone: ZONE }).toFormat('yyyy-MM-dd');
  const to = DateTime.fromJSDate(window.to, { zone: ZONE }).plus({ days: 1 }).toFormat('yyyy-MM-dd');
  let filter = `EventDate ge datetime'${from}' and EventDate lt datetime'${to}'`;
  if (cfg.body_ids.length) filter += ` and (${cfg.body_ids.map((b) => `EventBodyId eq ${b}`).join(' or ')})`;
  return `${LEGISTAR_BASE}/${cfg.client}/events?$filter=${encodeURIComponent(filter)}&$orderby=EventDate`;
}

export function eventItemsUrl(client: string, eventId: string | number): string {
  return `${LEGISTAR_BASE}/${client}/events/${eventId}/eventitems?AgendaNote=1&Attachments=1`;
}

export function createLegistarAdapter(deps: LegistarDeps = {}): Adapter {
  const pageSize = deps.pageSize ?? PAGE_SIZE;
  return {
    async run(source: SourceConfig, mode: RunMode, window: { from: Date; to: Date }): Promise<AdapterResult> {
      const cfg = LegistarConfigSchema.parse(source.config);
      if (!source.body_id) throw new Error(`source ${source.id}: legistar sources need body_id`);
      const bodyId = source.body_id;
      const now = deps.now?.() ?? new Date();
      const f = fetcher(deps.http);
      const warnings = f.warnings;
      const meetings: Meeting[] = [];
      const items: Item[] = [];
      const resultUpdates: ResultUpdate[] = [];

      let events: LegistarEvent[];
      if (mode.kind === 'results') {
        events = [];
        for (const id of mode.meeting_external_ids) {
          events.push(await f.get<LegistarEvent>(`${LEGISTAR_BASE}/${cfg.client}/events/${encodeURIComponent(id)}`));
        }
      } else {
        const all = await paged<LegistarEvent>(f, eventsUrl(cfg, window), pageSize, `${cfg.client} events`);
        events = all.filter((e) => !isExcludedEvent(e, cfg));
      }

      for (const e of events) {
        const m = mapEvent(e, bodyId);
        if (mode.kind !== 'results' && !dateInWindow(m.date, window)) continue;
        const rows = await paged<LegistarEventItem>(f, eventItemsUrl(cfg.client, e.EventId), pageSize, `event ${e.EventId} items`);
        const mapped = mapEventItems(m, rows, cfg, now);
        meetings.push(mapped.meeting);
        items.push(...mapped.items);
        warnings.push(...mapped.warnings);
        if (mode.kind === 'results') resultUpdates.push(...resultUpdatesFrom(mapped.meeting, mapped.items, e.EventInSiteURL));
      }

      return { meetings, items, documents: f.documents, result_updates: resultUpdates, warnings };
    },
  };
}

export const legistarAdapter: Adapter = createLegistarAdapter();
