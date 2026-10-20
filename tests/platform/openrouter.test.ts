import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createGemini, openRouterClient, pdfPart } from '@/lib/gemini'
import { DEFAULT_EXTRACT_MODEL, DEFAULT_FALLBACK_MODEL, createOpenRouterClient, geminiFromEnv } from '@/lib/adapters/gemini'
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini'
import { llmConfigured, openRouterModel } from '@/lib/openrouter'

function fakeFetch(reply: string, seen: { url?: string; init?: RequestInit }[]): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    seen.push({ url, init })
    return Response.json({ choices: [{ message: { content: reply } }] })
  }) as unknown as typeof fetch
}

describe('OpenRouter transport', () => {
  it('prefixes bare Gemini model IDs and keeps full IDs', () => {
    expect(openRouterModel('gemini-3.8-flash')).toBe('google/gemini-3.8-flash')
    expect(openRouterModel('openai/gpt-x')).toBe('openai/gpt-x')
  })

  // Checked against openrouter.ai/api/v1/models on Oct 20, 2026. "gemini-pro-latest" isn't an
  // OpenRouter model, so the D17 retry would fail. gemini-4-argon is Google's current flagship,
  // with structured output and PDF input, and the Google SDK knows the same bare name.
  it('default models are ones OpenRouter serves', () => {
    expect(openRouterModel(DEFAULT_GEMINI_MODEL)).toBe('google/gemini-3.8-flash')
    expect(openRouterModel(DEFAULT_EXTRACT_MODEL)).toBe('google/gemini-3.8-flash')
    expect(openRouterModel(DEFAULT_FALLBACK_MODEL)).toBe('google/gemini-4-argon')
  })

  it('counts either key as configured', () => {
    expect(llmConfigured({})).toBe(false)
    expect(llmConfigured({ OPENROUTER_API_KEY: 'k' })).toBe(true)
    expect(llmConfigured({ GEMINI_API_KEY: 'k' })).toBe(true)
  })

  it('sends the shared generateJson request with system, schema and PDF', async () => {
    const seen: { url?: string; init?: RequestInit }[] = []
    const gemini = createGemini(openRouterClient('test-key', fakeFetch('```json\n{"ok":true}\n```', seen)))
    const out = await gemini.generateJson({
      schema: z.object({ ok: z.boolean() }),
      system: 'sys',
      model: 'gemini-3.8-flash',
      contents: [{ text: 'hi' }, pdfPart(new Uint8Array([1, 2]))],
    })
    expect(out).toEqual({ ok: true })
    expect(seen[0]!.url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect((seen[0]!.init!.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    const body = JSON.parse(seen[0]!.init!.body as string)
    expect(body.model).toBe('google/gemini-3.8-flash')
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' })
    expect(body.messages[1].content[0]).toEqual({ type: 'text', text: 'hi' })
    expect(body.messages[1].content[1].file.file_data).toMatch(/^data:application\/pdf;base64,/)
    expect(body.response_format.json_schema.schema.properties.ok).toBeDefined()
  })

  it('adapter client returns raw JSON text and env prefers OpenRouter', async () => {
    const seen: { url?: string; init?: RequestInit }[] = []
    const llm = createOpenRouterClient('k', fakeFetch('{"items":[]}', seen))
    expect(await llm.generateJson({ model: 'm', system: 's', text: 't', schema: {}, timeoutMs: 1000 })).toBe('{"items":[]}')
    expect(geminiFromEnv({ OPENROUTER_API_KEY: 'k' })).not.toBeNull()
  })

  it('reports HTTP errors', async () => {
    const llm = createOpenRouterClient('k', (async () => new Response('no credit', { status: 402 })) as unknown as typeof fetch)
    await expect(llm.generateJson({ model: 'm', system: 's', text: 't', schema: {}, timeoutMs: 1000 })).rejects.toThrow(/402/)
  })
})
