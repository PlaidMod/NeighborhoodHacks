import { Suspense } from "react"
import { Onboarding } from "./onboarding"

export default function StartPage() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  )
}
