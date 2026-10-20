import { createHmac, randomBytes, randomUUID } from "node:crypto"
import { isIP } from "node:net"
import type { CoachItem, ProviderCall } from "./types.ts"
import { isBrowserId, parseCoachInput } from "./validate.ts"
import { runCoach } from "./service.ts"
import { MemoryRateLimitStore } from "./rate-limit.ts"
import type { RateLimitStore } from "./rate-limit.ts"

const MAX_BODY_BYTES = 12000
class BodyLimitError extends Error {}
async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length")
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) throw new BodyLimitError()
  const reader = request.body?.getReader()
  if (!reader) throw new SyntaxError("Missing body")
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new BodyLimitError() }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
}

export interface CoachHandlerOptions {
  resolveItem: (id: string, zip: string) => CoachItem | null | Promise<CoachItem | null>
  provider?: ProviderCall
  store?: RateLimitStore
  now?: () => number
  /** Configure only behind an ingress which STRIPS and REWRITES this header. */
  trustedIpHeader?: string
  digestSecret?: string
}

export function createCoachHandler(options: CoachHandlerOptions) {
  const store = options.store ?? new MemoryRateLimitStore()
  const salt = options.digestSecret ?? randomBytes(32)
  const hash = (value: string) => createHmac("sha256", salt).update(value).digest("hex")
  return async function POST(request: Request): Promise<Response> {
    const json = (value: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(value, { status, headers: { "Cache-Control": "no-store", "Vary": "Origin", ...extra } })
    const origin = request.headers.get("origin")
    if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "same_origin_required" }, 403)
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ error: "json_required" }, 415)
    let raw: unknown
    try { raw = await readBoundedJson(request) } catch (error) { return json({ error: error instanceof BodyLimitError ? "body_too_large" : "invalid_json" }, error instanceof BodyLimitError ? 413 : 400) }
    const input = parseCoachInput(raw)
    if (!input) return json({ error: "invalid_request" }, 400)
    const cookieId = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith("showup_coach_id="))?.slice("showup_coach_id=".length)
    const browserId = isBrowserId(cookieId) ? cookieId : input.browser_id ?? randomUUID()
    const candidateIp = options.trustedIpHeader ? request.headers.get(options.trustedIpHeader)?.trim() : undefined
    // No default proxy-header trust. The shared unknown-IP bucket is conservative.
    const ip = candidateIp && isIP(candidateIp) ? candidateIp : "unavailable"
    let limit
    try { limit = await store.consume([`browser:${hash(browserId)}`, `ip:${hash(ip)}`], options.now?.() ?? Date.now()) }
    catch { return json({ error: "rate_limit_unavailable" }, 503) }
    if (!limit.allowed) return json({ error: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfter) })
    let item: CoachItem | null
    try { item = await options.resolveItem(input.item_id, input.zip ?? "77004") }
    catch { return json({ error: "item_unavailable" }, 503) }
    if (!item) return json({ error: "unknown_item_or_zip" }, 404)
    const result = await runCoach(input, item, { provider: options.provider })
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : ""
    return json(result, 200, { "Set-Cookie": `showup_coach_id=${browserId}; Path=/api/coach; Max-Age=31536000; HttpOnly; SameSite=Strict${secure}` })
  }
}
