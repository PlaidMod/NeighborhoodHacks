/** Best-effort subdivision extraction from common HCAD legal-description formats. */
export function subdivisionFromLegalDescription(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.toUpperCase().replace(/[.,;]/g, ' ').replace(/\s+/g, ' ').trim()
  const withoutParcel = normalized
    .replace(/\b(?:LOT|LT|BLOCK|BLK|TRACT|TR|RESERVE|RES|SECTION|SEC)\s+[A-Z0-9-]+\b/g, ' ')
    .replace(/\b(?:UNRESTRICTED RESERVE|RESERVE)\s+[A-Z0-9-]+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!withoutParcel) return null
  // Keep a readable candidate; the trigram lookup remains a suggestion until verified.
  return withoutParcel.slice(0, 120)
}
