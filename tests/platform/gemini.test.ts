import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { MissingEnvError } from '@/lib/env'
import {
  GeminiOutputError,
  GeminiTimeoutError,
  PdfTooLargeError,
  createGemini,
  geminiModel,
  pdfPart,
} from '@/lib/gemini'

type Request = { model: string; contents: unknown; config: Record<string, unknown> }

/** A stand-in for the Gemini SDK that records the request and returns canned text. */
function fakeClient(text: string | undefined | (() => Promise<never>)) {
  const requests: Request[] = []
  const client = {
    models: {
      generateContent(req: unknown) {
        requests.push(req as Request)
        return typeof text === 'function' ? text() : Promise.resolve({ text })
      },
    },
  }
  return { client, requests }
}

const Summary = z.object({ title: z.string(), count: z.number() })

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('generateJson', () => {
  it('sends responseMimeType application/json, a responseJsonSchema without $schema, and temperature 0 by default', async () => {
    vi.stubEnv('GEMINI_MODEL', undefined)
    const { client, requests } = fakeClient('{"title":"Bond vote","count":3}')
    await createGemini(client).generateJson({ schema: Summary, contents: 'Summarize this.', system: 'Be neutral.' })

    const { model, contents, config } = requests[0]
    expect(model).toBe('gemini-3.8-flash')
    expect(contents).toBe('Summarize this.')
    expect(config.responseMimeType).toBe('application/json')
    expect(config.temperature).toBe(0)
    expect(config.systemInstruction).toBe('Be neutral.')
    const schema = config.responseJsonSchema as Record<string, unknown>
    expect(schema).not.toHaveProperty('$schema')
    expect(schema.type).toBe('object')
    expect(Object.keys(schema.properties as object)).toEqual(['title', 'count'])
    expect(config.abortSignal).toBeInstanceOf(AbortSignal)
    expect(config.httpOptions).toEqual({ timeout: 120_000 })
  })

  it('returns the parsed object when valid', async () => {
    const { client } = fakeClient('{"title":"Bond vote","count":3}')
    const result = await createGemini(client).generateJson({ schema: Summary, contents: 'x' })
    expect(result).toEqual({ title: 'Bond vote', count: 3 })
  })

  it('throws GeminiOutputError on non-JSON text', async () => {
    const { client } = fakeClient('not json')
    await expect(createGemini(client).generateJson({ schema: Summary, contents: 'x' })).rejects.toBeInstanceOf(
      GeminiOutputError,
    )
  })

  it('throws GeminiOutputError when the response has no text', async () => {
    const { client } = fakeClient(undefined)
    await expect(createGemini(client).generateJson({ schema: Summary, contents: 'x' })).rejects.toBeInstanceOf(
      GeminiOutputError,
    )
  })

  it('throws GeminiOutputError with issues when the schema fails', async () => {
    const { client } = fakeClient('{"title":"Bond vote","count":"three"}')
    const error = await createGemini(client)
      .generateJson({ schema: Summary, contents: 'x' })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GeminiOutputError)
    expect((error as GeminiOutputError).issues).not.toEqual([])
  })

  it('throws GeminiTimeoutError when the call outlasts timeoutMs', async () => {
    const { client, requests } = fakeClient(() => new Promise<never>(() => {}))
    await expect(
      createGemini(client).generateJson({ schema: Summary, contents: 'x', timeoutMs: 10 }),
    ).rejects.toBeInstanceOf(GeminiTimeoutError)
    expect((requests[0].config.abortSignal as AbortSignal).aborted).toBe(true)
  })
})

describe('pdfPart', () => {
  const LIMIT = 20 * 1024 * 1024

  it('accepts 20 MiB minus 1 byte as inline PDF data', () => {
    const part = pdfPart(new Uint8Array(LIMIT - 1))
    expect(part.inlineData?.mimeType).toBe('application/pdf')
    expect(typeof part.inlineData?.data).toBe('string')
  })

  it('rejects 20 MiB', () => {
    expect(() => pdfPart(new Uint8Array(LIMIT))).toThrow(PdfTooLargeError)
  })
})

describe('geminiModel', () => {
  it('defaults to gemini-3.8-flash and honors GEMINI_MODEL', () => {
    vi.stubEnv('GEMINI_MODEL', undefined)
    expect(geminiModel()).toBe('gemini-3.8-flash')
    vi.stubEnv('GEMINI_MODEL', 'gemini-3.5-flash-lite')
    expect(geminiModel('default')).toBe('gemini-3.5-flash-lite')
  })

  it('extract uses GEMINI_EXTRACT_MODEL, falling back to the default model', () => {
    vi.stubEnv('GEMINI_MODEL', undefined)
    vi.stubEnv('GEMINI_EXTRACT_MODEL', undefined)
    expect(geminiModel('extract')).toBe('gemini-3.8-flash')
    vi.stubEnv('GEMINI_EXTRACT_MODEL', 'gemini-x-extract')
    expect(geminiModel('extract')).toBe('gemini-x-extract')
  })

  it('extract_fallback throws when unset', () => {
    vi.stubEnv('GEMINI_EXTRACT_FALLBACK_MODEL', undefined)
    expect(() => geminiModel('extract_fallback')).toThrow(MissingEnvError)
  })
})
