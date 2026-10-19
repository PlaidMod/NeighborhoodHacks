import { DateTime } from 'luxon';
import { z } from 'zod';
import type { Adapter, AdapterDocument, AdapterResult, Meeting, RunMode, SourceConfig } from './types';
import { PDF_TIMEOUT_MS, getBytes, getText, type HttpOptions } from './http';
import { geminiFromEnv, modelsFromEnv, type GeminiModels, type LlmClient } from './gemini';
import { extractDocument } from './llmExtract';
import { getPdfText, type PdfText } from './pdfText';
import { documentContentHash } from '@/lib/ingest/hash';
import { ZONE, toChicagoIso } from '@/lib/ingest/normalize';

// PrimeGovAdapter for Houston City Council (agent-scraper-spec §8 Step 8, D8).
// Meetings come from the public JSON (deterministic). Items come from the compiled "Agenda" PDF
// through the Step 7 LLM path with the meeting already known. Never the "Packet".

export const PrimeGovConfigSchema = z
  .object({
    tenant: z.string().min(1),
    committee_id: z.number().int(),
    document_template: z.string().default('Agenda'),
  })
  .loose();
export type PrimeGovConfig = z.infer<typeof PrimeGovConfigSchema>;

export type PgDocument = {
  id: number;
  templateName: string;
  compileOutputType: number;
  publishDate?: string | null;
  language?: string | null;
};
export type PgMeeting = {
  id: number;
  committeeId: number;
  dateTime: string;
  title: string;
  videoUrl?: string | null;
  meetingState?: number;
  documentList: PgDocument[];
};

export const baseUrl = (tenant: string) => `https://${tenant}.primegov.com`;
export const upcomingUrl = (tenant: string) => `${baseUrl(tenant)}/api/v2/PublicPortal/ListUpcomingMeetings`;
export const archivedUrl = (tenant: string, year: number) => `${baseUrl(tenant)}/api/v2/PublicPortal/ListArchivedMeetings?year=${year}`;
export const documentUrl = (tenant: string, id: number) => `${baseUrl(tenant)}/Public/CompiledDocument/${id}`;

/** compileOutputType 1 = PDF. */
export const PDF_OUTPUT = 1;

const MONTH_DAY_RE =
  /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:\s*&\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+)?(\d{1,2}))?[.,]?\s*(\d{4})/i;

const monthOf = (s: string) => DateTime.fromFormat(s.slice(0, 3), 'LLL', { locale: 'en-US' }).month;

/**
 * Days named in a title: "October 20 & 21, 2026" -> [2026-10-20, 2026-10-21],
 * "March 31 & April 1, 2026" -> [2026-03-31, 2026-04-01], "January 21. 2026" -> [2026-01-21].
 */
export function titleDays(title: string): string[] {
  const m = title.match(MONTH_DAY_RE);
  if (!m) return [];
  const year = Number(m[5]);
  const first = DateTime.fromObject({ year, month: monthOf(m[1]!), day: Number(m[2]) }, { zone: ZONE });
  if (!first.isValid) return [];
  const days = [first.toFormat('yyyy-MM-dd')];
  if (m[4]) {
    const second = DateTime.fromObject({ year, month: m[3] ? monthOf(m[3]) : first.month, day: Number(m[4]) }, { zone: ZONE });
    if (second.isValid && second > first) days.push(second.toFormat('yyyy-MM-dd'));
  }
  return days;
}

/** Newest PDF document with the configured template ("Agenda", never "Packet"). */
export function pickAgendaDocument(docs: PgDocument[], template: string): PgDocument | undefined {
  return docs
    .filter((d) => d.templateName === template && d.compileOutputType === PDF_OUTPUT)
    .sort((a, b) => (b.publishDate ?? '').localeCompare(a.publishDate ?? '') || b.id - a.id)[0];
}

/** A minutes document, if the meeting has one (PDF preferred). */
export function pickMinutesDocument(docs: PgDocument[]): PgDocument | undefined {
  const minutes = docs.filter((d) => /minutes/i.test(d.templateName));
  return minutes.find((d) => d.compileOutputType === PDF_OUTPUT) ?? minutes[0];
}

export function mapMeeting(pg: PgMeeting, cfg: PrimeGovConfig, bodyId: string): { meeting: Meeting; agenda?: PgDocument } {
  const start = toChicagoIso(pg.dateTime);
  const startDay = pg.dateTime.slice(0, 10);
  const last = titleDays(pg.title).at(-1);
  const agenda = pickAgendaDocument(pg.documentList ?? [], cfg.document_template);
  const minutes = pickMinutesDocument(pg.documentList ?? []);
  const meeting: Meeting = {
    external_id: String(pg.id),
    body_id: bodyId,
    date: start,
    // Two-day session: the second day, when it is after the start day (archived sessions often
    // carry the second day's dateTime already, so there is nothing to add).
    ...(last && last > startDay ? { end_date: toChicagoIso(last) } : {}),
    type: /special/i.test(pg.title) ? 'special' : 'regular',
    status: 'scheduled',
    agenda_url: agenda ? documentUrl(cfg.tenant, agenda.id) : `${baseUrl(cfg.tenant)}/public/portal`,
    ...(pg.videoUrl ? { video_url: pg.videoUrl } : {}),
    ...(minutes ? { minutes_url: documentUrl(cfg.tenant, minutes.id) } : {}),
  };
  return { meeting, agenda };
}

/** Archive years to list: every year the window touches. */
export function yearsFor(window: { from: Date; to: Date }): number[] {
  const a = DateTime.fromJSDate(window.from, { zone: ZONE }).year;
  const b = DateTime.fromJSDate(window.to, { zone: ZONE }).year;
  const years: number[] = [];
  for (let y = a; y <= b; y++) years.push(y);
  return years;
}

export type PrimeGovDeps = {
  http?: HttpOptions;
  now?: () => Date;
  llm?: LlmClient | null;
  models?: GeminiModels;
  pdfText?: (bytes: Uint8Array) => Promise<PdfText>;
};

export function createPrimeGovAdapter(deps: PrimeGovDeps = {}): Adapter {
  return {
    async run(source: SourceConfig, mode: RunMode, window, prev): Promise<AdapterResult> {
      const result: AdapterResult = { meetings: [], items: [], documents: [], result_updates: [], warnings: [] };
      const cfg = PrimeGovConfigSchema.parse(source.config);
      const bodyId = source.body_id ?? source.id;
      const now = (deps.now ?? (() => new Date()))();
      const llm = deps.llm === undefined ? geminiFromEnv() : deps.llm;
      const models = deps.models ?? modelsFromEnv();
      const pdfText = deps.pdfText ?? getPdfText;
      const stamp = () => new Date().toISOString();

      // Upcoming list plus each archive year the window (or, in results mode, the meetings) touch.
      const listUrls = [upcomingUrl(cfg.tenant), ...yearsFor(window).map((y) => archivedUrl(cfg.tenant, y))];
      const byId = new Map<number, PgMeeting>();
      for (const url of listUrls) {
        let raw: string;
        try {
          raw = await getText(url, { ...deps.http, headers: { Accept: 'application/json' } });
        } catch (e) {
          result.warnings.push(`${url}: fetch failed: ${(e as Error).message}`);
          continue;
        }
        result.documents.push({ url, fetched_at: stamp(), content_hash: documentContentHash(raw), raw, kind: 'json' });
        let list: PgMeeting[];
        try {
          list = JSON.parse(raw) as PgMeeting[];
        } catch (e) {
          result.warnings.push(`${url}: invalid JSON: ${(e as Error).message}`);
          continue;
        }
        for (const m of list) if (m.committeeId === cfg.committee_id && !byId.has(m.id)) byId.set(m.id, m);
      }

      if (mode.kind === 'results') {
        result.warnings.push('primegov results mode (minutes) is not implemented yet (Step 10)');
        return result;
      }

      const selected = [...byId.values()]
        .filter((m) => {
          const t = Date.parse(toChicagoIso(m.dateTime));
          return t >= window.from.getTime() && t <= window.to.getTime();
        })
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime));

      if (!llm && selected.some((m) => pickAgendaDocument(m.documentList ?? [], cfg.document_template))) {
        result.warnings.push('llm_unavailable: GEMINI_API_KEY is not set; agenda items were not extracted');
      }
      for (const pg of selected) {
        const { meeting, agenda } = mapMeeting(pg, cfg, bodyId);
        result.meetings.push(meeting);
        if (!agenda) {
          result.warnings.push(`agenda_not_published: meeting ${meeting.external_id} (${pg.dateTime})`);
          continue;
        }
        if (!llm) continue;
        const url = meeting.agenda_url;
        let bytes: Uint8Array;
        try {
          bytes = await getBytes(url, { timeoutMs: PDF_TIMEOUT_MS, ...deps.http });
        } catch (e) {
          result.warnings.push(`${url}: fetch failed: ${(e as Error).message}`);
          continue;
        }
        const hash = documentContentHash(bytes);
        if (prev?.documentHashes[url] === hash) continue; // D11: unchanged PDF, items already stored
        const text = await pdfText(bytes);
        const doc: AdapterDocument = { url, fetched_at: stamp(), content_hash: hash, raw: text.text, kind: 'pdf_text' };
        result.documents.push(doc);
        const out = await extractDocument({
          source_id: source.id,
          body_id: bodyId,
          url,
          pdf: bytes,
          text,
          known: meeting,
          llm,
          models,
          now,
        });
        result.documents.push(...out.documents);
        result.warnings.push(...out.warnings);
        result.items.push(...out.items);
      }
      return result;
    },
  };
}

export const primeGovAdapter: Adapter = createPrimeGovAdapter();
