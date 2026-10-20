import { redirect } from 'next/navigation'

/** Keeps P3's weekly, story and SMS entry links on the same P4 flow. */
export default async function SpeakUpPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params
  redirect(`/app/speak?item=${encodeURIComponent(itemId)}`)
}
