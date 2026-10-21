import { normalizeHcadAddress } from './normalize'

export type HcadRawAccount = Record<string, string | undefined>

export function hcadAccountFromRaw(row: HcadRawAccount, selectedZips: ReadonlySet<string>) {
  const account = (row.acct ?? '').trim()
  const zip = (row.site_addr_3 ?? '').replace(/\D/g, '').slice(0, 5)
  const address = normalizeHcadAddress(`${row.site_addr_1 ?? ''}, ${row.site_addr_2 ?? ''}, TX ${zip}`)
  if (!selectedZips.has(zip) || !/^\d{6,25}$/.test(account) || !address) return null
  const legalDescription = ['lgl_1', 'lgl_2', 'lgl_3', 'lgl_4']
    .map((key) => row[key]?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
  return { account, site_address_norm: address, legal_description: legalDescription || null, zip }
}

export function hcadJurisdictionFromRaw(row: HcadRawAccount, selectedAccounts: ReadonlySet<string>) {
  const account = (row.acct ?? '').trim()
  const code = (row.tax_district ?? '').trim()
  return selectedAccounts.has(account) && /^\d{3,6}$/.test(code) ? { account, hcad_code: code } : null
}

export function csvCell(value: string | number | null) {
  const text = value === null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function parseHcadTsvRow(line: string, header: readonly string[], label: string) {
  const cells = line.replace(/\r$/, '').split('\t')
  if (cells.length !== header.length) throw new Error(`${label} contains a row with the wrong number of fields.`)
  return Object.fromEntries(header.map((name, index) => [name, cells[index]!.trim()]))
}

export function hcadHeader(line: string, required: readonly string[], label: string) {
  const header = line.replace(/^\uFEFF/, '').replace(/\r$/, '').split('\t').map((cell) => cell.trim().toLowerCase())
  if (new Set(header).size !== header.length || required.some((column) => !header.includes(column))) {
    throw new Error(`${label} is missing required or contains duplicate HCAD fields.`)
  }
  return header
}
