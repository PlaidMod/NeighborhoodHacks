// OpenRouter transport for the shared LLM calls (lib/gemini.ts and lib/adapters/gemini.ts).
// Plain fetch, no SDK. Server-only: callers pass the key in, and it never reaches the browser.
// When OPENROUTER_API_KEY is set it is used instead of GEMINI_API_KEY.

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

type EnvLike = Record<string, string | undefined>

export function openRouterKey(env: EnvLike = process.env): string | undefined {
  return env.OPENROUTER_API_KEY?.trim() || undefined
}

/** True when either provider has a key, so LLM features can run. */
export function llmConfigured(env: EnvLike = process.env): boolean {
  return !!(openRouterKey(env) || env.GEMINI_API_KEY?.trim())
}

/** OpenRouter model IDs carry a vendor prefix. A bare Gemini ID like "gemini-3.8-flash" becomes "google/gemini-3.8-flash". */
export function openRouterModel(model: string): string {
  return model.includes('/') ? model : `google/${model}`
}

export type OpenRouterContent =
  | { type: 'text'; text: string }
  | { type: 'file'; file: { filename: string; file_data: string } }

export function pdfContent(bytes: Uint8Array): OpenRouterContent {
  return { type: 'file', file: { filename: 'document.pdf', file_data: `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}` } }
}

export interface OpenRouterRequest {
  apiKey: string
  model: string
  system?: string
  content: string | OpenRouterContent[]
  /** JSON Schema for structured output. */
  schema: Record<string, unknown>
  temperature?: number
  timeoutMs: number
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

/** Sends one chat request that must answer with JSON, and returns the raw JSON text. */
export async function openRouterJson(req: OpenRouterRequest): Promise<string> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (req.signal?.aborted) controller.abort()
  else req.signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, req.timeoutMs)
  try {
    const messages: unknown[] = []
    if (req.system) messages.push({ role: 'system', content: req.system })
    messages.push({ role: 'user', content: req.content })
    const response = await (req.fetchImpl ?? fetch)(OPENROUTER_URL, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${req.apiKey}`,
        'X-Title': 'ShowUp HTX',
      },
      body: JSON.stringify({
        model: openRouterModel(req.model),
        messages,
        temperature: req.temperature ?? 0,
        response_format: { type: 'json_schema', json_schema: { name: 'output', strict: false, schema: req.schema } },
        // Only route to providers that honor response_format.
        provider: { require_parameters: true },
      }),
    })
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300)
      throw new Error(`OpenRouter returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
    }
    const body = (await response.json()) as { choices?: { message?: { content?: string | null } }[] }
    const text = body.choices?.[0]?.message?.content
    if (!text) throw new Error(`empty response from ${req.model}`)
    // Some models wrap JSON in a code fence despite response_format.
    return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  } finally {
    clearTimeout(timer)
    req.signal?.removeEventListener('abort', abort)
  }
}
