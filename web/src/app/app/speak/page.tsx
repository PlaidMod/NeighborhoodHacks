import { Suspense } from "react"
import { Speak } from "./speak"

export default function SpeakPage() {
  return (
    <Suspense>
      <Speak />
    </Suspense>
  )
}
