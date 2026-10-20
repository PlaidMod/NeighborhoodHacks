import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { openRouterJson, openRouterKey, pdfContent } from '../openrouter';
import { PAGE_BREAK } from './pdfText';

// Gemini client and agenda-extraction schema (agent-scraper-spec §8 Step 6, D17).
// P5 has no lib/gemini.ts yet, so this lives in lib/adapters/. Unit tests never call Gemini:
// they inject an LlmClient that returns recorded outputs.

export const EXTRACT_TIMEOUT_MS = 120_000;
export const DEFAULT_EXTRACT_MODEL = 'gemini-3.8-flash';
// D17's "current Pro model": Google's flagship, checked on OpenRouter's model list on Oct 20, 2026
// (structured output and PDF input). The same bare name works with the Google SDK.
export const DEFAULT_FALLBACK_MODEL = 'gemini-4-argon';

/** Chunking: split above ~150k chars into ~100k-char chunks on page boundaries, 1 page overlap. */
export const CHUNK_TRIGGER_CHARS = 150_000;
export const CHUNK_TARGET_CHARS = 100_000;

export const ExtractedItemSchema = z.object({
  agenda_number: z.string().optional(),
  title: z.string(),
  section: z.string().optional(),
  description: z.string().optional(),
  source_quote: z.string(),
});
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

export const ExtractionSchema = z.object({
  meeting: z.object({
    date: z.string(),
    time: z.string().optional(),
    type: z.enum(['regular', 'special']),
    title: z.string().optional(),
    /** Verbatim public-comment / speaker instructions, if the agenda has them. */
    comment_instructions_quote: z.string().optional(),
  }),
  items: z.array(ExtractedItemSchema),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

/** JSON schema handed to Gemini's structured output (generated from zod so the two can't drift). */
export function extractionJsonSchema(): Record<string, unknown> {
  const { $schema: _drop, ...schema } = z.toJSONSchema(ExtractionSchema) as Record<string, unknown>;
  return schema;
}

export const EXTRACTION_RULES = [
  'You extract agenda items from the text of an official local-government meeting agenda.',
  'Rules:',
  '- Extract every numbered or clearly separate agenda item, including lettered sub-items, in document order.',
  "- title: use the agenda's own wording. Do not summarize, shorten into a headline, or rephrase.",
  '- agenda_number: the outline number exactly as printed (e.g. "4", "12.a", "VII"), without a trailing period.',
  '- section: the nearest heading above the item, if any.',
  '- description: extra body text printed under the item, only if present.',
  "- source_quote: copy 20 to 200 characters EXACTLY from the text, including the item's distinctive words. Never paraphrase it.",
  '- Never invent items. If the text has no agenda items, return an empty items list.',
  '- Write "an employee" in place of the name of any private individual (employees, students, residents). Public officials in their public role keep their names.',
  '- Skip boilerplate (call to order, pledge, invocation, roll call, adjourn) unless it is numbered.',
  '- meeting.date: YYYY-MM-DD. meeting.time: the start time as printed (e.g. "11:00 a.m."), if present.',
  '- meeting.comment_instructions_quote: the public-comment or speaker sign-up instructions, copied verbatim, if the agenda has them.',
].join('\n');

export type KnownMeeting = { date: string; type: 'regular' | 'special'; title?: string };

export function buildExtractionPrompt(known?: KnownMeeting): string {
  if (!known) return EXTRACTION_RULES;
  return (
    EXTRACTION_RULES +
    `\nThe meeting is already known (${known.date}, ${known.type}${known.title ? `, "${known.title}"` : ''}). ` +
    'Copy those values into meeting; only the items matter.'
  );
}

/** What the adapters need from an LLM. Tests inject a fake that returns recorded JSON. */
export interface LlmClient {
  generateJson(req: {
    model: string;
    system: string;
    /** Text input (documents with a text layer). */
    text?: string;
    /** PDF bytes (scanned documents, D6). */
    pdf?: Uint8Array;
    schema: Record<string, unknown>;
    timeoutMs: number;
  }): Promise<string>;
}

export type GeminiModels = { extract: string; fallback: string };

/** Any string map. (Next.js types make NODE_ENV required on NodeJS.ProcessEnv, so tests can't pass {}.) */
export type EnvLike = Record<string, string | undefined>;

export function modelsFromEnv(env: EnvLike = process.env): GeminiModels {
  return {
    extract: env.GEMINI_EXTRACT_MODEL?.trim() || DEFAULT_EXTRACT_MODEL,
    fallback: env.GEMINI_EXTRACT_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL,
  };
}

/** Max inline PDF size for Gemini (larger files would need the Files API). */
export const MAX_INLINE_PDF_BYTES = 20 * 1024 * 1024;

export function createGeminiClient(apiKey: string): LlmClient {
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generateJson({ model, system, text, pdf, schema, timeoutMs }) {
      if (pdf && pdf.length >= MAX_INLINE_PDF_BYTES) throw new Error(`PDF is ${pdf.length} bytes; over the inline limit`);
      const parts = pdf
        ? [{ inlineData: { mimeType: 'application/pdf', data: Buffer.from(pdf).toString('base64') } }]
        : [{ text: text ?? '' }];
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: system,
          temperature: 0,
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          httpOptions: { timeout: timeoutMs },
        },
      });
      const out = res.text;
      if (!out) throw new Error(`empty response from ${model}`);
      return out;
    },
  };
}

/** The same LlmClient, sent through OpenRouter (OPENROUTER_API_KEY). */
export function createOpenRouterClient(apiKey: string, fetchImpl?: typeof fetch): LlmClient {
  return {
    async generateJson({ model, system, text, pdf, schema, timeoutMs }) {
      if (pdf && pdf.length >= MAX_INLINE_PDF_BYTES) throw new Error(`PDF is ${pdf.length} bytes; over the inline limit`);
      const content = pdf ? [pdfContent(pdf)] : (text ?? '');
      return openRouterJson({ apiKey, fetchImpl, model, system, content, schema, timeoutMs });
    },
  };
}

/** An OpenRouter client when OPENROUTER_API_KEY is set, else a Gemini client when GEMINI_API_KEY is set, else null (LLM steps then skip with a warning). */
export function geminiFromEnv(env: EnvLike = process.env): LlmClient | null {
  const routerKey = openRouterKey(env);
  if (routerKey) return createOpenRouterClient(routerKey);
  const key = env.GEMINI_API_KEY?.trim();
  return key ? createGeminiClient(key) : null;
}

/** Split pages into chunks (page ranges) of about CHUNK_TARGET_CHARS, overlapping by one page. */
export function chunkPages(pages: string[], trigger = CHUNK_TRIGGER_CHARS, target = CHUNK_TARGET_CHARS): string[][] {
  const total = pages.reduce((n, p) => n + p.length, 0);
  if (total <= trigger || pages.length <= 1) return [pages];
  const chunks: string[][] = [];
  let start = 0;
  while (start < pages.length) {
    let end = start;
    let size = 0;
    while (end < pages.length && (end === start || size + pages[end]!.length <= target)) size += pages[end++]!.length;
    chunks.push(pages.slice(start, end));
    if (end >= pages.length) break;
    start = Math.max(end - 1, start + 1); // 1-page overlap
  }
  return chunks;
}

export type ExtractionRun = {
  model: string;
  /** One raw output per chunk (stored as llm_output documents). */
  raw: string[];
  /** Parsed outputs per chunk; null when a chunk's output didn't parse. */
  parsed: (Extraction | null)[];
  errors: string[];
};

/** Parse one raw model output against the schema. */
export function parseExtraction(raw: string): { ok: true; value: Extraction } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
  }
  const r = ExtractionSchema.safeParse(json);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: `schema: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}` };
}

/** Run extraction over a document: text chunks for text-layer docs, the PDF itself for scanned docs. */
export async function runExtraction(
  llm: LlmClient,
  model: string,
  input: { pages: string[]; scanned: boolean; pdf?: Uint8Array; known?: KnownMeeting },
): Promise<ExtractionRun> {
  const system = buildExtractionPrompt(input.known);
  const schema = extractionJsonSchema();
  const run: ExtractionRun = { model, raw: [], parsed: [], errors: [] };
  const requests =
    input.scanned && input.pdf ? [{ pdf: input.pdf }] : chunkPages(input.pages).map((c) => ({ text: c.join(PAGE_BREAK) }));
  for (const req of requests) {
    try {
      const raw = await llm.generateJson({ model, system, schema, timeoutMs: EXTRACT_TIMEOUT_MS, ...req });
      run.raw.push(raw);
      const p = parseExtraction(raw);
      run.parsed.push(p.ok ? p.value : null);
      if (!p.ok) run.errors.push(`${model}: ${p.error}`);
    } catch (e) {
      run.raw.push('');
      run.parsed.push(null);
      run.errors.push(`${model}: ${(e as Error).message}`);
    }
  }
  return run;
}

// ---------------------------------------------------------------------------------------------
// Results from minutes (agent-scraper-spec §8 Step 10, D22). The LLM reports outcomes only; code
// matches them to existing items (never creates items) and checks every quote.

export const OutcomeSchema = z.object({
  agenda_number: z.string().optional(),
  title_fragment: z.string(),
  outcome: z.enum(['passed', 'failed', 'tabled', 'no_action']),
  source_quote: z.string(),
});
export type Outcome = z.infer<typeof OutcomeSchema>;
export const OutcomesSchema = z.object({ outcomes: z.array(OutcomeSchema) });
export type Outcomes = z.infer<typeof OutcomesSchema>;

export function outcomesJsonSchema(): Record<string, unknown> {
  const { $schema: _drop, ...schema } = z.toJSONSchema(OutcomesSchema) as Record<string, unknown>;
  return schema;
}

export const OUTCOME_RULES = [
  'You read the official minutes of a local-government meeting and report what happened to agenda items.',
  'Rules:',
  '- Report only items the minutes say were acted on, deferred or discussed without action. Never invent outcomes.',
  '- outcome: "passed" (approved, adopted, authorized, ratified, accepted), "failed" (motion failed or denied),',
  '  "tabled" (deferred, tabled, postponed), "no_action" (discussed or received, no vote taken).',
  '- agenda_number: only if the minutes print the item number.',
  '- title_fragment: a few words naming the item, taken from the minutes heading or the known item list.',
  '- source_quote: copy 20 to 200 characters EXACTLY from the minutes that show the outcome (e.g. the motion sentence). Never paraphrase.',
  '- Write "an employee" in place of the name of any private individual.',
].join('\n');

export type KnownItemRef = { agenda_number?: string; title: string };

export function buildOutcomesPrompt(items: KnownItemRef[]): string {
  if (!items.length) return OUTCOME_RULES;
  const list = items.map((i) => `- ${i.agenda_number ? `${i.agenda_number}: ` : ''}${i.title.slice(0, 160)}`).join('\n');
  return `${OUTCOME_RULES}\nKnown agenda items for this meeting (use their wording for title_fragment):\n${list}`;
}

export function parseOutcomes(raw: string): { ok: true; value: Outcomes } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
  }
  const r = OutcomesSchema.safeParse(json);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: `schema: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}` };
}

export type OutcomesRun = { model: string; raw: string[]; parsed: (Outcomes | null)[]; errors: string[] };

/** Run outcome extraction over minutes: text chunks for text-layer docs, the PDF for scanned docs. */
export async function runOutcomes(
  llm: LlmClient,
  model: string,
  input: { pages: string[]; scanned: boolean; pdf?: Uint8Array; items: KnownItemRef[] },
): Promise<OutcomesRun> {
  const system = buildOutcomesPrompt(input.items);
  const schema = outcomesJsonSchema();
  const run: OutcomesRun = { model, raw: [], parsed: [], errors: [] };
  const requests =
    input.scanned && input.pdf ? [{ pdf: input.pdf }] : chunkPages(input.pages).map((c) => ({ text: c.join(PAGE_BREAK) }));
  for (const req of requests) {
    try {
      const raw = await llm.generateJson({ model, system, schema, timeoutMs: EXTRACT_TIMEOUT_MS, ...req });
      run.raw.push(raw);
      const p = parseOutcomes(raw);
      run.parsed.push(p.ok ? p.value : null);
      if (!p.ok) run.errors.push(`${model}: ${p.error}`);
    } catch (e) {
      run.raw.push('');
      run.parsed.push(null);
      run.errors.push(`${model}: ${(e as Error).message}`);
    }
  }
  return run;
}
