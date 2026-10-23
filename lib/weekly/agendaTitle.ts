// Display headline for an agenda item that has no written story yet (story_en is null).
//
// Official titles read like "ORDINANCE approving and authorizing a First Amendment to a contract
// with COBB, FENDLEY & ASSOCIATES, INC., to provide ... - DISTRICTS C - PANZARELLA". This keeps the
// official wording but trims it to a card: the leading document type becomes a separate label,
// the title stops at its first clause, and shouted names are put in normal case. Nothing is
// reworded or summarized, and the full title is always shown in the story sheet next to the source.

const DOC_TYPES = ["PUBLIC HEARING", "ORDINANCE", "RESOLUTION", "MOTION", "PROCLAMATION", "PRESENTATION"] as const

export type AgendaHeadline = {
  /** "Ordinance", "Resolution"…; null when the title doesn't start with one. */
  kind: string | null
  headline: string
  /** True when the headline is shorter than the official title. */
  trimmed: boolean
}

const MAX = 90

/** Small words inside a shouted name: "AUTHORITY ON BEHALF OF" -> "Authority on Behalf of". */
const SMALL = new Set(["OF", "ON", "AND", "THE", "FOR", "TO", "IN", "AT", "BY", "AN", "OR"])

/** "COBB, FENDLEY & ASSOCIATES" -> "Cobb, Fendley & Associates". Only runs of 2+ capitalized words change; other words of 3 letters or fewer (INC, LLC) stay. */
function unshout(text: string) {
  return text.replace(/\b[A-Z][A-Z'&.-]*(?:[\s,]+[A-Z][A-Z'&.-]*)+\b/g, (run) => {
    const words = run.split(/(\s+|,)/)
    const caps = words.filter((w) => /^[A-Z][A-Z'&.-]*$/.test(w))
    if (caps.length < 2) return run
    return words
      .map((w) => {
        if (!/^[A-Z][A-Z'&.-]*$/.test(w)) return w
        if (SMALL.has(w)) return w.toLowerCase()
        return w.replace(/[^A-Z]/g, "").length > 3 ? w[0] + w.slice(1).toLowerCase() : w
      })
      .join("")
  })
}

export function agendaHeadline(raw: string): AgendaHeadline {
  let text = raw.replace(/\s+/g, " ").trim()
  let kind: string | null = null
  for (const t of DOC_TYPES) {
    if (text.startsWith(`${t} `)) {
      kind = t.charAt(0) + t.slice(1).toLowerCase()
      text = text.slice(t.length + 1)
      break
    }
  }
  // Stop at the first clause break: a semicolon, or " - " before a district or council-member list.
  const cut = text.search(/;\s| - (?:DISTRICTS?|[A-Z]{2,})\b/)
  if (cut > 30) text = text.slice(0, cut)
  text = unshout(text).replace(/[\s,]+$/, "")
  if (text.length > MAX) {
    // Cut at a word boundary, then drop a dangling connector ("of", "&", "to the") before the ellipsis.
    let cut = text.slice(0, MAX).replace(/\s+\S*$/, "")
    while (/(?:[\s,;:&-]+|\s(?:of|on|to|the|a|an|and|or|for|with|by|in|at))$/i.test(cut)) cut = cut.replace(/(?:[\s,;:&-]+|\s(?:of|on|to|the|a|an|and|or|for|with|by|in|at))$/i, "")
    text = `${cut}…`
  }
  if (text) text = text.charAt(0).toUpperCase() + text.slice(1)
  return { kind, headline: text, trimmed: text !== raw.replace(/\s+/g, " ").trim() }
}
