import type { CoachInput } from "../coach/types"

export async function requestCoaching<T>(input: Omit<CoachInput, "browser_id">): Promise<T> {
  let browserId = crypto.randomUUID()
  try {
    const existing = localStorage.getItem("showup.speak.browser.v1")
    if (existing && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(existing)) browserId = existing as `${string}-${string}-${string}-${string}-${string}`
    else localStorage.setItem("showup.speak.browser.v1", browserId)
  } catch { /* The server still applies its request limits. */ }
  const response = await fetch("/api/coach", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, browser_id: browserId }),
    signal: AbortSignal.timeout(20_000), cache: "no-store",
  })
  if (!response.ok) throw new Error("Coaching request failed")
  return response.json() as Promise<T>
}
