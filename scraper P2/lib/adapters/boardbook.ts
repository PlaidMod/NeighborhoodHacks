import { load, type CheerioAPI } from 'cheerio';
import { DateTime } from 'luxon';
import { z } from 'zod';
import type { Adapter, AdapterDocument, AdapterResult, Item, Meeting, RunMode, SourceConfig } from './types';
import { getText, type HttpOptions } from './http';
import { COMMENT_RULES_RE, stripHtml } from './legistar';
import { parseAmounts } from '@/lib/ingest/amounts';
import { documentContentHash } from '@/lib/ingest/hash';
import { ZONE, toChicagoIso } from '@/lib/ingest/normalize';
import { redactPersonnel } from '@/lib/ingest/redact';
import { dateInWindow, itemStatus } from '@/lib/ingest/validate';

// BoardBook public-view adapter (agent-scraper-spec §8 Step 4). Used by cfisd_board (org 668).
// Both pages are server-rendered HTML. DOM notes (inspected 2026-10-19):
//   listing: table#PublicMeetingsTable > tbody > tr, first <td> holds the title line
//     "{Month D, YYYY} at {h:mm AM} - {Name}" and "Meeting Type: {Regular|Working|Special}";
//     links /Public/Agenda/{org}?meeting={id}, /Public/Minutes/{org}?meeting={id},
//     and "Recorded Meeting URL" (YouTube).
//   agenda: tr.agenda-item-information.agenda-item-children-of-{parentId}[data-agendaitemid].
//     Rows with td.agenda-item-checkbox-cell are outline entries ("4.A. text"); rows without it
//     are display headers ("MEETING OPENING", plus the posting notice in <em>) that share the
//     next entry's id. Attachments are a[data-foragendaitem]; "Download" is /Public/DownloadAgenda.

export const BOARDBOOK_BASE = 'https://meetings.boardbook.org';
/** BoardBook nightly maintenance: never fetch between 00:00 and 05:00 Central. */
export const MAINTENANCE_END_HOUR = 5;

export const BoardBookConfigSchema = z.object({ org_id: z.number().int() }).loose();
export type BoardBookConfig = z.infer<typeof BoardBookConfigSchema>;

export type BoardBookDeps = { http?: HttpOptions; now?: () => Date };

export type ListedMeeting = {
  id: string;
  name: string;
  meeting_type: string;
  date: string;
  agenda_path: string;
  minutes_url?: string;
  video_url?: string;
};

export const listingUrl = (org: number) => `${BOARDBOOK_BASE}/Public/Organization/${org}`;
export const agendaPageUrl = (org: number, id: string) => `${BOARDBOOK_BASE}/Public/Agenda/${org}?meeting=${id}`;
const abs = (href: string) => new URL(href, BOARDBOOK_BASE).toString();
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

export function inMaintenanceWindow(now: Date): boolean {
  return DateTime.fromJSDate(now, { zone: ZONE }).hour < MAINTENANCE_END_HOUR;
}

const TITLE_LINE = /^([A-Z][a-z]+ \d{1,2}, \d{4}) at (\d{1,2}:\d{2} ?[AP]M) - (.+)$/;

/** Parse the organization listing page into meetings (all years, newest first as listed). */
export function parseListing(html: string): { meetings: ListedMeeting[]; warnings: string[] } {
  const $ = load(html);
  const meetings: ListedMeeting[] = [];
  const warnings: string[] = [];
  $('#PublicMeetingsTable tbody tr').each((_, tr) => {
    const row = $(tr);
    const cell = row.find('td').first();
    const line = squash(cell.children('div').first().text());
    const agenda = row.find('a[href*="/Public/Agenda/"]').attr('href');
    const id = agenda?.match(/meeting=(\d+)/)?.[1];
    const m = line.match(TITLE_LINE);
    if (!id || !m) {
      if (line || agenda) warnings.push(`listing row not parsed: "${line.slice(0, 80)}"`);
      return;
    }
    const day = DateTime.fromFormat(m[1]!, 'MMMM d, yyyy', { zone: ZONE });
    if (!day.isValid) {
      warnings.push(`meeting ${id}: bad date "${m[1]}"`);
      return;
    }
    const typeDiv = cell.find('b.important-page-text').parent();
    const meetingType = squash(typeDiv.text().replace(/Meeting Type:/i, ''));
    const minutes = row.find('a[href*="/Public/Minutes/"]').attr('href');
    const video = row.find('a').filter((__, a) => /recorded meeting/i.test($(a).text())).attr('href');
    meetings.push({
      id,
      name: m[3]!.trim(),
      meeting_type: meetingType,
      date: toChicagoIso(day.toISODate()!, m[2]!),
      agenda_path: abs(agenda!),
      ...(minutes ? { minutes_url: abs(minutes) } : {}),
      ...(video ? { video_url: video.trim() } : {}),
    });
  });
  return { meetings, warnings };
}

export function mapListedMeeting(l: ListedMeeting, bodyId: string, org: number): { meeting: Meeting; warnings: string[] } {
  const warnings: string[] = [];
  const t = l.meeting_type.toLowerCase();
  if (!['regular', 'working', 'special'].includes(t)) warnings.push(`meeting ${l.id}: unusual type "${l.meeting_type}" (${l.name})`);
  return {
    meeting: {
      external_id: l.id,
      body_id: bodyId,
      date: l.date,
      type: t === 'special' || /special/i.test(l.name) ? 'special' : 'regular',
      status: /cancel/i.test(l.name) ? 'cancelled' : 'scheduled',
      agenda_url: agendaPageUrl(org, l.id),
      ...(l.video_url ? { video_url: l.video_url } : {}),
      ...(l.minutes_url ? { minutes_url: l.minutes_url } : {}),
    },
    warnings,
  };
}

type Node = {
  id: string;
  parent: string;
  number?: string;
  title: string;
  description?: string;
  hasChildren: boolean;
  attachments: { name: string; url: string }[];
};

const NUMBER_RE = /^(\d+(?:\.[A-Za-z0-9]+)*)\.\s*/;

/** Split "<number>. <strong>Title</strong><br/>rest" (or plain text) into number/title/description. */
export function splitEntry(html: string): { number?: string; title: string; description?: string } {
  const text = stripHtml(html);
  const num = text.match(NUMBER_RE);
  const body = num ? text.slice(num[0].length) : text;
  const afterNum = num ? html.replace(/^[\s\S]*?\d+(?:\.[A-Za-z0-9]+)*\.\s*/, '') : html;
  const strong = afterNum.match(/^\s*<strong>([\s\S]*?)<\/strong>/i);
  let title: string;
  let rest: string;
  if (strong) {
    title = squash(stripHtml(strong[1]!));
    rest = stripHtml(afterNum.slice(strong[0].length));
  } else {
    const nl = body.indexOf('\n');
    title = squash(nl === -1 ? body : body.slice(0, nl));
    rest = nl === -1 ? '' : body.slice(nl + 1);
  }
  const cleaned = rest
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const description = cleaned || undefined;
  return { ...(num ? { number: num[1] } : {}), title, ...(description ? { description } : {}) };
}

function parseNodes($: CheerioAPI): { nodes: Node[]; notices: string[] } {
  const nodes: Node[] = [];
  const notices: string[] = [];
  $('tr.agenda-item-information').each((_, tr) => {
    const row = $(tr);
    const id = row.attr('data-agendaitemid') ?? '';
    const parent = (row.attr('class') ?? '').match(/agenda-item-children-of-(\d+)/)?.[1] ?? '0';
    if (row.find('td.agenda-item-checkbox-cell').length === 0) {
      // Display header: keep the posting notice (in <em>) as comment-rules context.
      row.find('em').each((__, em) => {
        const t = squash($(em).text());
        if (t) notices.push(t);
      });
      return;
    }
    const check = row.find('.form-check').first().clone();
    check.find('i').remove();
    const entry = splitEntry(check.html() ?? '');
    const attachments = row
      .find('a[data-foragendaitem]')
      .toArray()
      .map((a) => ({ name: squash($(a).find('.fileNameValue').text() || $(a).text()), url: abs($(a).attr('href') ?? '') }))
      .filter((a) => a.url);
    nodes.push({
      id,
      parent,
      ...entry,
      hasChildren: row.find('input.hasChildren').first().val() === 'true',
      attachments,
    });
  });
  return { nodes, notices };
}

/**
 * Map an agenda page to items. Top-level entries with children are sections; every other
 * entry is an item whose section is its top-level ancestor's title. Entries under a section
 * matching the comment-rules pattern (e.g. "PUBLIC COMMENTS") feed comment_rules_text instead.
 */
export function mapAgenda(meeting: Meeting, html: string, now: Date = new Date()): { meeting: Meeting; items: Item[]; warnings: string[] } {
  const $ = load(html);
  const warnings: string[] = [];
  const download = $('a[href*="/Public/DownloadAgenda/"]').attr('href');
  const minutes = $('a[href*="/Public/Minutes/"]').attr('href');
  const m: Meeting = {
    ...meeting,
    ...(download ? { agenda_url: abs(download) } : {}),
    ...(minutes && !meeting.minutes_url ? { minutes_url: abs(minutes) } : {}),
  };
  const sourceUrl = meeting.agenda_url;
  const { nodes, notices } = parseNodes($);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const top = (n: Node): Node => {
    let cur = n;
    for (let guard = 0; cur.parent !== '0' && byId.has(cur.parent) && guard < 20; guard++) cur = byId.get(cur.parent)!;
    return cur;
  };
  const rules: string[] = [...notices];
  const items: Item[] = [];
  const seen = new Set<string>();
  for (const n of nodes) {
    if (!n.id || seen.has(n.id)) {
      warnings.push(`meeting ${m.external_id}: entry without a unique id ("${n.title.slice(0, 40)}")`);
      continue;
    }
    seen.add(n.id);
    if (n.parent === '0' && n.hasChildren) continue; // section header
    const root = top(n);
    const isChild = root !== n;
    if (COMMENT_RULES_RE.test(n.title) || (isChild && COMMENT_RULES_RE.test(root.title))) {
      rules.push([n.title, n.description].filter(Boolean).join('\n'));
      continue;
    }
    if (!n.title) {
      warnings.push(`meeting ${m.external_id}: entry ${n.id} has an empty title`);
      continue;
    }
    const item: Item = {
      external_id: n.id,
      meeting_external_id: m.external_id,
      body_id: m.body_id,
      ...(n.number ? { agenda_number: n.number } : {}),
      title: n.title,
      ...(isChild ? { section: root.title } : {}),
      ...(n.description ? { description: n.description } : {}),
      status: itemStatus({}, m.date, now),
      amounts: [],
      attachments: n.attachments,
      contains_private_person: false,
      source_url: sourceUrl,
    };
    const red = redactPersonnel(item);
    items.push({ ...red, amounts: parseAmounts(red.title + (red.description ? ' ' + red.description : '')) });
  }
  if (items.length === 0) warnings.push(`meeting ${m.external_id}: 0 items`);
  return { meeting: rules.length ? { ...m, comment_rules_text: rules.join('\n\n') } : m, items, warnings };
}

export function createBoardBookAdapter(deps: BoardBookDeps = {}): Adapter {
  return {
    async run(source: SourceConfig, mode: RunMode, window: { from: Date; to: Date }): Promise<AdapterResult> {
      const cfg = BoardBookConfigSchema.parse(source.config);
      if (!source.body_id) throw new Error(`source ${source.id}: boardbook sources need body_id`);
      const now = deps.now?.() ?? new Date();
      const empty: AdapterResult = { meetings: [], items: [], documents: [], result_updates: [], warnings: [] };
      if (inMaintenanceWindow(now)) {
        return { ...empty, warnings: [`${source.id}: BoardBook maintenance window (00:00-05:00 Central); not fetched`] };
      }
      const documents: AdapterDocument[] = [];
      const get = async (url: string) => {
        const raw = await getText(url, deps.http);
        documents.push({ url, fetched_at: new Date().toISOString(), content_hash: documentContentHash(raw), raw, kind: 'html' });
        return raw;
      };
      const listing = parseListing(await get(listingUrl(cfg.org_id)));
      const warnings = [...listing.warnings];
      let chosen: ListedMeeting[];
      if (mode.kind === 'results') {
        const ids = new Set(mode.meeting_external_ids);
        chosen = listing.meetings.filter((l) => ids.has(l.id));
        for (const id of ids) if (!chosen.some((l) => l.id === id)) warnings.push(`meeting ${id}: not on the listing page`);
      } else {
        chosen = listing.meetings.filter((l) => dateInWindow(l.date, window));
      }
      chosen.sort((a, b) => a.date.localeCompare(b.date));
      const meetings: Meeting[] = [];
      const items: Item[] = [];
      for (const l of chosen) {
        const base = mapListedMeeting(l, source.body_id, cfg.org_id);
        warnings.push(...base.warnings);
        const mapped = mapAgenda(base.meeting, await get(base.meeting.agenda_url), now);
        meetings.push(mapped.meeting);
        items.push(...mapped.items);
        warnings.push(...mapped.warnings);
      }
      // Results from minutes are Step 10; this adapter only records minutes_url.
      return { meetings, items, documents, result_updates: [], warnings };
    },
  };
}

export const boardbookAdapter: Adapter = createBoardBookAdapter();
