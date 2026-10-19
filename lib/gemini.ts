import { GoogleGenAI, type Part } from '@google/genai'
import { z } from 'zod'
import { assertServer, getEnv, getOptionalEnv } from './env'

// Shared Gemini client for P2 (agenda extraction), P3 (stories) and P4 (the coach).
// Server-only: the API key never reaches the browser.

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'
export const DEFAULT_TIMEOUT_MS = 120_000
/** PDFs at or above this size can't be sent inline (scraper spec Step 6). */
export const PDF_INLINE_LIMIT = 20 * 1024 * 1024

export type GeminiPurpose = 'default' | 'extract' | 'extract_fallback'

/** The model name for a job, read from env vars so it can change without a code edit. */
export function geminiModel(purpose: GeminiPurpose = 'default'): string {
  const base = getOptionalEnv('GEMINI_MODEL') ?? DEFAULT_GEMINI_MODEL
  if (purpose === 'extract') return getOptionalEnv('GEMINI_EXTRACT_MODEL') ?? base
  // No guessed default for the fallback: P2 must name it (scraper spec D17).
  if (purpose === 'extract_fallback') return getEnv('GEMINI_EXTRACT_FALLBACK_MODEL')
  return base
}

export class GeminiOutputError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown[] = [],
    public readonly raw?: string,
  ) {
    super(message)
    this.name = 'GeminiOutputError'
  }
}

export class GeminiTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Gemini did not answer within ${timeoutMs} ms.`)
    this.name = 'GeminiTimeoutError'
  }
}

export class PdfTooLargeError extends Error {
  constructor(public readonly bytes: number) {
    super(`PDF is ${bytes} bytes; inline PDFs must be under ${PDF_INLINE_LIMIT} bytes.`)
    this.name = 'PdfTooLargeError'
  }
}

export interface GenerateJsonOptions<T> {
  schema: z.ZodType<T>
  contents: string | Part[]
  system?: string
  model?: string
  /** Defaults to 0, so the same input gives the same answer as often as possible. */
  temperature?: number
  timeoutMs?: number
}

/** The part of the Gemini SDK this module uses. Tests pass a fake with the same shape. */
export interface GeminiClientLike {
  models: { generateContent(req: unknown): Promise<{ text?: string }> }
}

/** JSON Schema for Gemini's structured output. Gemini rejects the top-level "$schema" key. */
export function toResponseJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = { ...(z.toJSONSchema(schema) as Record<string, unknown>) }
  delete jsonSchema.$schema
  return jsonSchema
}

export function createGemini(client: GeminiClientLike) {
  return {
    async generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
      const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
      const controller = new AbortController()
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Aborting only stops waiting on our side. Google still bills the call.
          controller.abort()
          reject(new GeminiTimeoutError(timeoutMs))
        }, timeoutMs)
      })

      let text: string | undefined
      try {
        const response = await Promise.race([
          client.models.generateContent({
            model: opts.model ?? geminiModel(),
            contents: opts.contents,
            config: {
              systemInstruction: opts.system,
              temperature: opts.temperature ?? 0,
              responseMimeType: 'application/json',
              responseJsonSchema: toResponseJsonSchema(opts.schema),
              abortSignal: controller.signal,
              httpOptions: { timeout: timeoutMs },
            },
          }),
          timeout,
        ])
        text = response.text
      } finally {
        clearTimeout(timer)
      }

      if (!text) throw new GeminiOutputError('Gemini returned no text.')
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new GeminiOutputError('Gemini returned text that is not JSON.', [], text)
      }
      const result = opts.schema.safeParse(parsed)
      if (!result.success) {
        throw new GeminiOutputError('Gemini output did not match the schema.', result.error.issues, text)
      }
      return result.data
    },
  }
}

let shared: ReturnType<typeof createGemini> | undefined

/** Asks Gemini for JSON that matches `schema`, and validates the answer. Server-only. */
export function generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
  assertServer('generateJson()')
  shared ??= createGemini(new GoogleGenAI({ apiKey: getEnv('GEMINI_API_KEY') }))
  return shared.generateJson(opts)
}

/** Wraps PDF bytes as inline data for `contents`. Throws PdfTooLargeError at 20 MiB or more. */
export function pdfPart(bytes: Uint8Array): Part {
  if (bytes.length >= PDF_INLINE_LIMIT) throw new PdfTooLargeError(bytes.length)
  return { inlineData: { mimeType: 'application/pdf', data: Buffer.from(bytes).toString('base64') } }
}
