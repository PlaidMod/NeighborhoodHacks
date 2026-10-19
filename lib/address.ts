// Cleans up what someone types or pastes into the address field.
// Nothing here stores the address anywhere.

export const MAX_ADDRESS_LENGTH = 200

/** Trims the text and turns any run of spaces, tabs or line breaks into one space. */
export function normalizeAddressInput(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

export type AddressCheck = { ok: true; value: string } | { ok: false; reason: 'empty' | 'too_long' }

export function validateAddress(raw: string): AddressCheck {
  const value = normalizeAddressInput(raw)
  if (value === '') return { ok: false, reason: 'empty' }
  if (value.length > MAX_ADDRESS_LENGTH) return { ok: false, reason: 'too_long' }
  return { ok: true, value }
}
