import { BodyDetailClient } from '@/components/flow/BodyDetailClient'

export default async function BodyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  return <BodyDetailClient bodyId={id} token={query.t ?? ''} />
}
