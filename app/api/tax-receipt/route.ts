import { getEnv, getOptionalEnv } from '@/lib/env'
import { selectRows } from '@/lib/db/raw'
import { verifyBodiesToken } from '@/lib/tokens'
import { buildTaxReceipt, type ReceiptBody, type ReceiptElection, type ReceiptRate } from '@/lib/taxReceipt'
import { houstonDate } from '@/lib/date'

const failure = (status: number, message: string) => Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('t')
  let ids: string[] | null
  try {
    ids = verifyBodiesToken(token)
  } catch {
    return failure(500, 'Tax estimate is not configured yet.')
  }
  if (!ids) return failure(400, 'Use the signed results link to view this estimate.')
  const rawValue = url.searchParams.get('value') ?? '250000'
  if (!/^\d{1,8}$/.test(rawValue)) return failure(400, 'Enter a whole-dollar value up to $10,000,000.')
  const value = Number(rawValue)
  if (value < 1 || value > 10_000_000) return failure(400, 'Enter a whole-dollar value up to $10,000,000.')

  try {
    if (getOptionalEnv('VERCEL_ENV') === 'production') {
      getEnv('SUPABASE_URL')
      getEnv('SUPABASE_SERVICE_ROLE_KEY')
    }
    const [allBodies, rates, elections] = await Promise.all([
      selectRows<ReceiptBody>('bodies', 'id,name,tax_set_by_body_id', (query) => query.in('id', ids)),
      selectRows<ReceiptRate>('tax_rates', 'body_id,year,adopted_rate,last_vote_date,source_url', (query) => query.in('body_id', ids)),
      selectRows<ReceiptElection>('elections', 'body_id,date,type,votes_cast,registered_voters,source_url', (query) => query.in('body_id', ids).lte('date', houstonDate()).order('date', { ascending: false })),
    ])
    if (allBodies.length !== ids.length) return failure(404, 'These verified bodies are no longer available. Run the address lookup again.')
    const bodies = allBodies.filter((body) => body.tax_set_by_body_id !== null)
    if (bodies.length === 0) return failure(404, 'No verified tax-setting bodies are available for this address yet.')
    const taxBodyIds = bodies.map((body) => body.id)
    const receiptRates = rates.filter((rate) => taxBodyIds.includes(rate.body_id))
    const receiptElections = elections.filter((election) => election.body_id && taxBodyIds.includes(election.body_id))
    return Response.json(buildTaxReceipt(value, bodies, receiptRates, receiptElections, houstonDate()), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return failure(500, 'We could not load verified tax rates right now.')
  }
}
