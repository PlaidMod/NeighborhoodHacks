import { redirect } from "next/navigation"

// The week in short now sits on the dashboard itself (app/(prototype)/app/page.tsx).
export default function Tldr() {
  redirect("/app")
}
