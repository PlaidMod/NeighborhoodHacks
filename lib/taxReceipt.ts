import { houstonDate } from '@/lib/date'

export type ReceiptBody = {
  id: string
  name: string
  tax_set_by_body_id: string | null
}
export type ReceiptRate = {
  body_id: string
  year: number
  adopted_rate: number | string | null
  last_vote_date: string | null
  source_url: string | null
}
export type ReceiptElection = {
  body_id: string | null
  date: string | null
  type: string | null
  votes_cast: number | null
  registered_voters: number | null
  source_url: string | null
}

export function validTaxRate(value: number | string | null): number | null {
  if (value === null) return null
  const rate = Number(value)
  return Number.isFinite(rate) && rate >= 0 ? rate : null
}

export function buildTaxReceipt(value: number, bodies: readonly ReceiptBody[], rates: readonly ReceiptRate[], elections: readonly ReceiptElection[], today = houstonDate()) {
  const latestRate = new Map<string, ReceiptRate>()
  for (const rate of rates) {
    const existing = latestRate.get(rate.body_id)
    if (!existing || rate.year > existing.year) latestRate.set(rate.body_id, rate)
  }
  const latestElection = new Map<string, ReceiptElection>()
  for (const election of elections) {
    if (!election.body_id || !election.date || election.date > today) continue
    const existing = latestElection.get(election.body_id)
    if (!existing || election.date > (existing.date ?? '')) latestElection.set(election.body_id, election)
  }
  const names = new Map(bodies.map((body) => [body.id, body.name]))
  const slices = bodies.filter((body) => body.tax_set_by_body_id !== null).map((body) => {
    const rate = latestRate.get(body.id)
    const rateValue = validTaxRate(rate?.adopted_rate ?? null)
    const amount = rateValue === null ? null : rateValue * value / 100
    const election = latestElection.get(body.id)
    return {
      body_id: body.id,
      name: body.name,
      rate: amount !== null && Number.isFinite(amount) ? rateValue : null,
      amount: amount !== null && Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null,
      year: rate?.year ?? null,
      source_url: rate?.source_url ?? null,
      tax_set_by_body_id: body.tax_set_by_body_id,
      tax_set_by_name: body.tax_set_by_body_id ? names.get(body.tax_set_by_body_id) ?? null : null,
      last_vote_date: rate?.last_vote_date ?? null,
      latest_election: election ? {
        date: election.date,
        type: election.type,
        votes_cast: election.votes_cast,
        registered_voters: election.registered_voters,
        source_url: election.source_url,
      } : null,
    }
  }).sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1) || a.name.localeCompare(b.name))
  const total = Math.round(slices.reduce((sum, slice) => sum + (slice.amount ?? 0), 0) * 100) / 100
  return {
    value,
    estimate_before_exemptions: true as const,
    total,
    partial: slices.length === 0 || slices.some((slice) => slice.rate === null),
    slices,
  }
}
