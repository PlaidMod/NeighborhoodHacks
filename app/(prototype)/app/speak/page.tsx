import { Suspense } from "react"
import { Speak } from "./speak"
import { loadItem } from "@/lib/weekly/data"
import { toBody, toUpdate } from "@/lib/prototype/live"
import { getLocale } from "next-intl/server"

export default async function SpeakPage({ searchParams }: { searchParams: Promise<{ item?: string; lang?: string }> }) {
  const params = await searchParams
  const locale = params.lang ?? await getLocale()
  const item = params.item && (/^[0-9a-f-]{36}$/i.test(params.item) || params.item.startsWith('sample-')) ? await loadItem(params.item) : null
  const body = item ? toBody({ body_id: item.body_id, body_name: item.body_name, body_type: item.body_type, sms_eligible: false }) : null
  const entry = item && body && item.status !== 'decided' && item.meeting_status !== 'cancelled'
    ? { item: toUpdate(item, body.kind, locale === 'es' ? 'es' : 'en'), body, sample: !!item.is_sample } : null
  return (
    <Suspense>
      <Speak entry={entry} />
    </Suspense>
  )
}
