import { loadItem } from '@/lib/weekly/data'

// GET /api/items/{id}: one agenda item with its stored story (Technical Plan §2).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await loadItem(id)
  if (!item) return Response.json({ error: 'not_found' }, { status: 404 })
  return Response.json(item)
}
