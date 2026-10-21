import { TaxReceiptClient } from '@/components/flow/TaxReceiptClient'

export default async function TaxReceiptPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const params = await searchParams
  return <TaxReceiptClient token={params.t ?? ''} />
}
