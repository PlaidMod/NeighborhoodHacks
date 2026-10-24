"use client"

import { Loader2 } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { clearBrowserProfile } from "@/lib/prototype/profile-storage"

/**
 * Signs out and makes this browser forget the reader, so the next person on a shared computer
 * doesn't see their details. Before the form posts, it clears the street address saved in this
 * browser. The /auth/signout route then ends the Google session and deletes the government and
 * role cookies. Use this for every sign-out button.
 */
export function SignOutForm({ children }: { children: React.ReactNode }) {
  return (
    <form action="/auth/signout" method="post" onSubmit={() => clearBrowserProfile()}>
      {children}
    </form>
  )
}

/**
 * The delete form's submit handler. It clears the street address saved in this browser and shows
 * the pending state. A second press while the request is on its way is ignored, so a double-click
 * sends one request.
 */
export function deleteSubmitHandler(isPending: () => boolean, setPending: (pending: boolean) => void) {
  return (event: { preventDefault(): void }) => {
    if (isPending()) return event.preventDefault()
    clearBrowserProfile()
    setPending(true)
  }
}

/** Deletes the signed-in account (POST /auth/delete), after the reader confirms on /account/delete. */
export function DeleteAccountForm({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const [pending, setPending] = React.useState(false)
  return (
    <form action="/auth/delete" method="post" onSubmit={deleteSubmitHandler(() => pending, setPending)}>
      <Button type="submit" size="lg" variant="brick" className="w-full" aria-disabled={pending || undefined}>
        {pending && <Loader2 aria-hidden className="animate-spin" />}
        {pending ? pendingLabel : label}
      </Button>
    </form>
  )
}
