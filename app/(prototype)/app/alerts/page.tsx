import { cookies } from "next/headers"
import { BODIES_COOKIE } from "@/lib/prototype/liveData"
import { twilioConfigured } from "@/lib/sms/subscriber"
import { Alerts } from "./alerts"

export default async function AlertsPage() {
  const token = (await cookies()).get(BODIES_COOKIE)?.value ?? null
  return <Alerts token={token} preview={!twilioConfigured()} />
}
